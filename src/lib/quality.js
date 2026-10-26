/**
 * Quality tiers and the single decision function shared by the player-API path
 * and the DOM fallback.
 *
 * Pure: no DOM, no chrome.*, no side effects. Everything here is unit-tested.
 */

/** Descending. Array index doubles as the rank (0 = best). */
export const QUALITY_TIERS = [
  { token: 'highres', height: 4320 },
  { token: 'hd2160', height: 2160 },
  { token: 'hd1440', height: 1440 },
  { token: 'hd1080', height: 1080 },
  { token: 'hd720', height: 720 },
  { token: 'large', height: 480 },
  { token: 'medium', height: 360 },
  { token: 'small', height: 240 },
  { token: 'tiny', height: 144 },
];

export const AUTO = 'auto';
export const BEST = 'best-available';

const BY_TOKEN = new Map(QUALITY_TIERS.map((t, i) => [t.token, { ...t, rank: i }]));
const BY_HEIGHT = new Map(QUALITY_TIERS.map((t, i) => [t.height, { ...t, rank: i }]));

export function tokenToHeight(token) {
  return BY_TOKEN.get(token)?.height ?? null;
}

export function heightToToken(height) {
  return BY_HEIGHT.get(Number(height))?.token ?? null;
}

/** Lower is better. Unknown tokens sort last. */
export function tokenRank(token) {
  return BY_TOKEN.get(token)?.rank ?? Infinity;
}

/**
 * Maps a Unicode decimal digit to its ASCII equivalent, so labels rendered in
 * non-Latin numerals (Devanagari "१०८०p", Arabic-Indic "١٠٨٠p") still parse.
 */
export function normalizeDigits(str) {
  const isDigit = cp => cp >= 0 && /\p{Nd}/u.test(String.fromCodePoint(cp));
  return String(str).replace(/\p{Nd}/gu, ch => {
    const cp = ch.codePointAt(0);
    // Decimal digits are contiguous 0-9 within their block, so walking back to
    // the first non-digit locates that block's zero. At most 9 steps.
    let zero = cp;
    while (cp - zero < 9 && isDigit(zero - 1)) zero--;
    return String(cp - zero);
  });
}

/** DOM-fallback only: "1080p60 HD" -> "hd1080". Returns null if not a resolution. */
export function labelToToken(label) {
  const m = normalizeDigits(label).match(/(\d{3,4})\s*p/i);
  return m ? heightToToken(m[1]) : null;
}

/**
 * Accepts every value the popup has ever stored, plus a few tolerant forms.
 * Unknown input degrades to "best" rather than throwing.
 */
export function parsePreference(pref) {
  const raw = String(pref ?? '').trim();
  if (!raw || raw === BEST) return { mode: 'best', height: null };
  if (raw.toLowerCase() === AUTO) return { mode: 'auto', height: null };

  // Raw player token, e.g. "hd1080".
  const asToken = tokenToHeight(raw);
  if (asToken !== null) return { mode: 'tier', height: asToken };

  // "1080p", "1080p60" — the fps suffix is meaningless to setPlaybackQualityRange.
  const m = normalizeDigits(raw).match(/^(\d{3,4})\s*p/i);
  if (m && heightToToken(m[1])) return { mode: 'tier', height: Number(m[1]) };

  return { mode: 'best', height: null };
}

/**
 * True for YouTube's "1080p Premium" / enhanced-bitrate entries.
 *
 * Deliberately a union of three signals: a live non-Premium session returns no
 * formatType at all, and the legacy DOM path used to sniff the raw class name.
 * Over-detecting here only means we skip an entry the user opted out of.
 */
export function isPremiumEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (entry.formatType != null && String(entry.formatType).toUpperCase().includes('PREMIUM')) {
    return true;
  }
  const label = String(entry.label ?? '');
  return /premium/i.test(label) || label.includes('ytp-premium-label');
}

function usable(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (entry.playable === false) return false;
  if (entry.token === AUTO) return false; // pseudo-entry, never a concrete target
  return tokenRank(entry.token) !== Infinity;
}

/**
 * Picks the quality to apply.
 *
 * Returns null when nothing is selectable. Every caller must check for null —
 * that is the structural reason no code path can act on a missing element,
 * which is what crashed 2.0.6 on non-watch pages and on localized "Auto".
 */
export function resolvePreferred(preference, available, { allowPremium = false } = {}) {
  const { mode, height } = parsePreference(preference);

  const all = (Array.isArray(available) ? available : []).filter(usable);
  if (all.length === 0) return null;

  let pool = allowPremium ? all : all.filter(e => !isPremiumEntry(e));
  // Premium-only stream with premium opted out: honour the stream over the
  // preference rather than leaving the viewer worse off than YouTube's default.
  if (pool.length === 0) pool = all;

  // Premium and standard share a token. When the viewer opted in, put Premium
  // first within its tier so it wins over the standard entry at the same height.
  const premiumFirst = (a, b) => (allowPremium ? isPremiumEntry(b) - isPremiumEntry(a) : 0);
  pool = pool.slice().sort((a, b) => tokenRank(a.token) - tokenRank(b.token) || premiumFirst(a, b));

  const pick = (e, reason) => ({
    token: e.token,
    label: e.label ?? e.token,
    reason,
    formatType: e.formatType ?? null,
  });

  if (mode === 'auto') {
    return { token: AUTO, label: 'Auto', reason: 'auto' };
  }

  if (mode === 'best') {
    return pick(pool[0], 'best');
  }

  const exact = pool.find(e => tokenToHeight(e.token) === height);
  if (exact) return pick(exact, 'exact');

  const lower = pool.find(e => tokenToHeight(e.token) <= height);
  if (lower) return pick(lower, 'laddered');

  // Everything on offer is above the request (e.g. 144p asked of a 1080p-floor stream).
  return pick(pool[pool.length - 1], 'floor');
}

/**
 * How a resolved target reaches the player.
 *
 *   none - Auto: leave the player alone, exactly as if the extension were off.
 *          Calling setPlaybackQualityRange('auto', 'auto') is not a no-op; it
 *          overrides YouTube's own state (issue #15).
 *   menu - the target's tier has both a Premium and a standard entry. The player
 *          API takes only a token, which both share, so the player picks one
 *          itself (on a Premium account, Premium). Only the menu row can choose
 *          either side, so this covers Premium wanted and Premium declined.
 *   api  - everything else.
 */
export function planApply(target, available = []) {
  if (!target) return { action: 'none' };
  if (target.token === AUTO) return { action: 'none' };
  const sameTier = (Array.isArray(available) ? available : []).filter(
    e => e?.token === target.token,
  );
  const ambiguous = sameTier.some(isPremiumEntry) && sameTier.some(e => !isPremiumEntry(e));
  if (isPremiumEntry(target) || ambiguous) return { action: 'menu' };
  return { action: 'api', token: target.token };
}

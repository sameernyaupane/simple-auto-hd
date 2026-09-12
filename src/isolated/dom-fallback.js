/**
 * DOM fallback: drives the player's gear menu, as 2.0.6 did.
 *
 * Verified still working against live YouTube, so this is a real safety net for
 * the day the undocumented player API changes — not dead code. Two things differ
 * from 2.0.6: the quality row is located structurally rather than by matching 65
 * localized spellings of "Quality", and nothing here can throw or leave the menu
 * open.
 */
import { resolvePreferred, labelToToken, normalizeDigits } from '../lib/quality.js';
import { log } from '../lib/log.js';

const RESOLUTION_RE = /\d{3,4}\s*p|auto/i;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function poll(fn, tries = 12, gap = 50) {
  for (let i = 0; i < tries; i++) {
    const value = fn();
    if (value) return value;
    await sleep(gap);
  }
  return null;
}

const isMenuOpen = () =>
  Boolean(document.querySelector('.ytp-popup.ytp-settings-menu:not([style*="display: none"])'));

function closeMenu(button) {
  try {
    if (isMenuOpen() && button) button.click();
  } catch {
    /* the player went away mid-flight */
  }
}

/**
 * The settings panel renders each row's current value beside its label, and only
 * the quality row's value looks like a resolution. That makes the row findable
 * without knowing what "Quality" is called in the user's language.
 */
function findQualityRow() {
  const rows = [...document.querySelectorAll('.ytp-panel-menu .ytp-menuitem[role="menuitem"]')];
  const matches = rows.filter(row => {
    const content = row.querySelector('.ytp-menuitem-content');
    return content && RESOLUTION_RE.test(normalizeDigits(content.textContent || ''));
  });
  return matches.length === 1 ? matches[0] : null;
}

function readQualityItems() {
  const menu =
    document.querySelector('.ytp-quality-menu') ||
    [...document.querySelectorAll('.ytp-panel[role="menu"], .ytp-panel-menu')].find(panel =>
      [...panel.querySelectorAll('.ytp-menuitem-label')].some(el =>
        RESOLUTION_RE.test(normalizeDigits(el.textContent || ''))
      )
    );
  if (!menu) return { entries: [], autoEl: null };

  const rows = [...menu.querySelectorAll('.ytp-menuitem')].map(item => {
    const labelEl = item.querySelector('.ytp-menuitem-label') || item;
    const label = (labelEl.textContent || '').trim();
    return {
      token: labelToToken(label),
      label,
      playable: true,
      formatType:
        item.querySelector('.ytp-premium-label') || /premium/i.test(label) ? 'PREMIUM' : null,
      el: item,
    };
  });

  // The one row that is not a resolution is "Auto" — whatever it is called in the
  // viewer's language ("Automatisch", "自動", …). Locating it by elimination is
  // what lets this path honour the Auto preference without a translation table.
  const nonResolution = rows.filter(row => !row.token);
  return {
    entries: rows.filter(row => row.token),
    autoEl: nonResolution.length === 1 ? nonResolution[0].el : null,
  };
}

/** Always resolves; never throws; always leaves the menu closed. */
export async function applyQualityViaMenu(preference, { allowPremium = false } = {}) {
  const button = document.querySelector('.ytp-settings-button');
  if (!button) return { ok: false, reason: 'no-gear' };

  try {
    button.click();

    const row = await poll(findQualityRow);
    if (!row) {
      closeMenu(button);
      return { ok: false, reason: 'no-quality-row' };
    }
    row.click();

    const menu = await poll(() => {
      const found = readQualityItems();
      return found.entries.length > 0 ? found : null;
    });
    if (!menu) {
      closeMenu(button);
      return { ok: false, reason: 'no-quality-items' };
    }
    const { entries, autoEl } = menu;

    // Same decision function as the API path, so premium and the ladder behave
    // identically on both.
    const target = resolvePreferred(preference, entries, { allowPremium });
    if (!target) {
      closeMenu(button);
      return { ok: false, reason: 'no-match' };
    }

    const element =
      target.token === 'auto'
        ? autoEl
        : entries.find(e => e.token === target.token && e.label === target.label)?.el;
    if (!element) {
      closeMenu(button);
      return { ok: false, reason: target.token === 'auto' ? 'no-auto-row' : 'no-element' };
    }

    element.click();
    log.debug('applied via DOM menu', target);
    return { ok: true, token: target.token, label: target.label, reason: target.reason };
  } catch (err) {
    log.warn('DOM fallback failed', err);
    return { ok: false, reason: 'threw' };
  } finally {
    closeMenu(button);
    try {
      document.activeElement?.blur?.();
    } catch {
      /* nothing focusable */
    }
  }
}

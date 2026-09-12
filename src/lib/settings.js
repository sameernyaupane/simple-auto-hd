/**
 * Storage schema.
 *
 * The three legacy keys keep their 2.0.6 names, values and semantics, so an
 * existing install carries its settings forward untouched and a downgrade still
 * reads something valid. parsePreference() absorbs value variance, which means
 * no migration write is ever needed.
 */
export const DEFAULTS = {
  extensionEnabled: true,
  theaterMode: false,
  preferredQuality: 'best-available',
  allowPremium: false,
  applyToShorts: true,
  theme: 'system',
  debug: false,
  // Diagnostic only, not surfaced in the popup: forces the DOM menu path so the
  // fallback can be exercised without waiting for the player API to break.
  forceDomFallback: false,
  schemaVersion: 2,
};

/** Appearance choices. 'system' follows the OS setting. */
export const THEMES = ['system', 'light', 'dark'];

/** The 11 popup options. Values are byte-identical to 2.0.6 — do not renumber. */
export const QUALITY_OPTIONS = [
  { value: 'best-available', label: 'Best available' },
  { value: '4320p', label: '4320p (8K)' },
  { value: '2160p', label: '2160p (4K)' },
  { value: '1440p', label: '1440p' },
  { value: '1080p', label: '1080p' },
  { value: '720p', label: '720p' },
  { value: '480p', label: '480p' },
  { value: '360p', label: '360p' },
  { value: '240p', label: '240p' },
  { value: '144p', label: '144p' },
  { value: 'Auto', label: 'Auto (let YouTube decide)' },
];

/**
 * Fills in defaults without discarding unknown keys.
 *
 * extensionEnabled is deliberately "undefined means enabled" to match 2.0.6,
 * where only an explicit `false` disabled the extension.
 */
export function normalizeSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = { ...src };

  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    if (out[key] === undefined) out[key] = fallback;
  }

  out.extensionEnabled = src.extensionEnabled !== false;
  for (const key of ['theaterMode', 'allowPremium', 'applyToShorts', 'debug', 'forceDomFallback']) {
    out[key] = Boolean(out[key]);
  }
  if (typeof out.preferredQuality !== 'string' || out.preferredQuality === '') {
    out.preferredQuality = DEFAULTS.preferredQuality;
  }
  if (!THEMES.includes(out.theme)) out.theme = DEFAULTS.theme;
  return out;
}

/** Keys that, when changed, require re-applying quality. */
export const QUALITY_KEYS = [
  'preferredQuality',
  'allowPremium',
  'extensionEnabled',
  'applyToShorts',
  'forceDomFallback',
];

export function loadSettings() {
  return new Promise(resolve => {
    try {
      chrome.storage.sync.get(null, raw => {
        void chrome.runtime.lastError;
        resolve(normalizeSettings(raw));
      });
    } catch {
      resolve(normalizeSettings(null));
    }
  });
}

export function saveSettings(patch) {
  return new Promise(resolve => {
    try {
      chrome.storage.sync.set(patch, () => {
        void chrome.runtime.lastError;
        resolve();
      });
    } catch {
      resolve();
    }
  });
}

/** Calls back with (newSettings, changedKeys) on any sync-storage change. */
export function watchSettings(callback) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync') return;
    const keys = Object.keys(changes);
    if (keys.length === 0) return;
    loadSettings().then(settings => callback(settings, keys));
  });
}

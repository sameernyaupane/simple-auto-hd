import { DEFAULTS } from '../lib/settings.js';

const SITE = 'https://sameernyaupane.github.io/simple-auto-hd';

/** Seeds missing keys only, so an existing install never has a value overwritten. */
function seedDefaults() {
  chrome.storage.sync.get(null, stored => {
    void chrome.runtime.lastError;
    const patch = {};
    for (const [key, value] of Object.entries(DEFAULTS)) {
      if (stored?.[key] === undefined) patch[key] = value;
    }
    if (Object.keys(patch).length > 0) chrome.storage.sync.set(patch);
  });
}

function openTab(url) {
  try {
    chrome.tabs.create({ url });
  } catch {
    /* the user can reach the page from the popup instead */
  }
}

const minor = version => String(version ?? '').split('.').slice(0, 2).join('.');

chrome.runtime.onInstalled.addListener(details => {
  seedDefaults();

  if (details.reason === 'install') {
    openTab(`${SITE}/installation`);
    return;
  }

  if (details.reason === 'update') {
    const version = chrome.runtime.getManifest().version;
    // Only announce feature releases; a patch bump should not steal a tab.
    if (minor(details.previousVersion) !== minor(version)) {
      openTab(`${SITE}/updated?v=${encodeURIComponent(version)}`);
    }
  }
});

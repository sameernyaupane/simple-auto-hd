import { DEFAULTS, QUALITY_OPTIONS, THEMES, loadSettings, saveSettings } from '../lib/settings.js';

const $ = id => document.getElementById(id);

const els = {
  enabledLabel: $('extension-status'),
  enabled: $('extension-enabled'),
  quality: $('preferred-quality'),
  premium: $('allow-premium'),
  shorts: $('apply-to-shorts'),
  theater: $('theater-mode'),
  status: $('status'),
};

const statusText = els.status.querySelector('.status__text');
const themeInputs = [...document.querySelectorAll('input[name="theme"]')];
const prefersLight = window.matchMedia('(prefers-color-scheme: light)');

/**
 * Resolves 'system' against the OS and stamps the result on <html>, so the CSS
 * only ever deals with a concrete 'light' or 'dark'.
 */
function applyTheme(choice) {
  const resolved = choice === 'system' ? (prefersLight.matches ? 'light' : 'dark') : choice;
  document.documentElement.dataset.theme = resolved;
}

document.querySelector('.header__version').textContent = `v${chrome.runtime.getManifest().version}`;

for (const { value, label } of QUALITY_OPTIONS) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  els.quality.append(option);
}

function renderEnabled(enabled) {
  els.enabledLabel.textContent = enabled ? 'Enabled' : 'Disabled';
  document.body.classList.toggle('is-disabled', !enabled);
  for (const el of [els.quality, els.premium, els.shorts, els.theater]) {
    el.disabled = !enabled;
  }
  if (!enabled) setStatus('idle', 'Turned off.');
}

/** state drives the dot colour: ok (green), waiting (amber), idle (grey). */
function setStatus(state, text) {
  els.status.dataset.state = state;
  statusText.textContent = text;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

/** Host permissions cover these, so tab.url is readable for them. */
const isYouTubeUrl = url => /^https?:\/\/([\w-]+\.)?youtube\.com\//.test(url ?? '');

async function renderStatus() {
  if (!els.enabled.checked) return;

  const tab = await activeTab();
  if (!tab || !isYouTubeUrl(tab.url)) {
    setStatus('idle', 'Not on a YouTube video.');
    return;
  }

  let res;
  try {
    res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' });
  } catch {
    res = null;
  }

  if (!res) {
    // A YouTube tab with no content script: it was open before the extension was
    // installed, updated or reloaded, so it has not been injected yet.
    setStatus('waiting', 'Reload this tab to activate.');
    return;
  }
  if (!res.onTarget) {
    setStatus('idle', 'Not on a YouTube video.');
    return;
  }
  if (res.applied) {
    const via = res.source === 'dom' ? ' via menu' : '';
    setStatus('ok', `Playing at ${res.applied}${via}.`);
    return;
  }
  setStatus('waiting', res.ready ? 'No matching quality yet.' : 'Waiting for the player…');
}

(async function init() {
  const settings = await loadSettings();
  applyTheme(THEMES.includes(settings.theme) ? settings.theme : DEFAULTS.theme);

  els.enabled.checked = settings.extensionEnabled;
  els.quality.value = QUALITY_OPTIONS.some(o => o.value === settings.preferredQuality)
    ? settings.preferredQuality
    : DEFAULTS.preferredQuality;
  els.premium.checked = settings.allowPremium;
  els.shorts.checked = settings.applyToShorts;
  els.theater.checked = settings.theaterMode;
  renderEnabled(settings.extensionEnabled);

  els.enabled.addEventListener('change', event => {
    renderEnabled(event.target.checked);
    void saveSettings({ extensionEnabled: event.target.checked });
    if (event.target.checked) void renderStatus();
  });

  const bind = (el, key, read) =>
    el.addEventListener('change', event => {
      void saveSettings({ [key]: read(event.target) });
      setTimeout(renderStatus, 700);
    });

  for (const input of themeInputs) {
    input.checked = input.value === settings.theme;
    input.addEventListener('change', event => {
      if (!event.target.checked) return;
      applyTheme(event.target.value);
      void saveSettings({ theme: event.target.value });
    });
  }

  // Keep 'Auto' honest if the OS flips while the popup is open.
  prefersLight.addEventListener('change', () => {
    const choice = themeInputs.find(i => i.checked)?.value ?? 'system';
    if (choice === 'system') applyTheme(choice);
  });

  bind(els.quality, 'preferredQuality', el => el.value);
  bind(els.premium, 'allowPremium', el => el.checked);
  bind(els.shorts, 'applyToShorts', el => el.checked);
  bind(els.theater, 'theaterMode', el => el.checked);

  await renderStatus();
  setTimeout(renderStatus, 1200);
})();

/**
 * Isolated-world controller: owns all policy and all storage access.
 *
 * Every fix for the crashes in 2.0.6 lands here or in the modules it calls:
 *   - page gating, so a popup-driven storage change on a non-watch page is a
 *     no-op instead of clicking the homepage's hover-preview player;
 *   - readiness gating and retries, replacing the fixed 100ms delay;
 *   - re-application on autoplay-next and after ads, which the one-shot observer
 *     in 2.0.6 could not do;
 *   - a null-safe decision function, so nothing ever clicks a missing element.
 */
import { loadSettings, saveSettings, watchSettings, QUALITY_KEYS } from '../lib/settings.js';
import { resolvePreferred } from '../lib/quality.js';
import { log, setDebug } from '../lib/log.js';
import {
  WAIT_READY,
  GET_STATE,
  APPLY_QUALITY,
  SUBSCRIBE,
  PLAYER_READY,
  VIDEO_CHANGED,
  STATE_CHANGE,
  QUALITY_CHANGED,
} from '../lib/protocol.js';
import { request, on, handshake, isAvailable, resetHandshake } from './bridge.js';
import { applyQualityViaMenu } from './dom-fallback.js';
import { applyTheater, readTheater, watchTheater, refreshWatch } from './theater.js';

// all_frames is false, but an extension reload can re-inject; keep the guard.
if (window.top === window) {
  start();
}

function start() {
  const MAX_ATTEMPTS = 6;
  const APPLY_THROTTLE_MS = 600;
  const OVERRIDE_GRACE_MS = 1500;

  let settings = null;
  let cycleId = 0;
  let videoId = null;
  let attempts = 0;
  let userOverride = false;
  let adActive = false;
  let lastApplyAt = 0;
  let lastRequested = null;
  let lastStatus = { source: 'none', applied: null, reason: null };
  let debounceTimer = null;

  const isWatch = () => location.pathname === '/watch';
  const isShorts = () => location.pathname.startsWith('/shorts/');
  const isTarget = () => isWatch() || (settings?.applyToShorts && isShorts());
  const isDesktopWatch = () => isWatch() && location.hostname === 'www.youtube.com';

  // ------------------------------------------------------------ quality

  function newCycle(reason) {
    cycleId += 1;
    attempts = 0;
    userOverride = false;
    log.debug('cycle', cycleId, reason, location.pathname);
    return cycleId;
  }

  function scheduleApply(reason, delay = 150) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => void applyNow(reason), delay);
  }

  async function applyNow(reason) {
    if (!settings?.extensionEnabled || !isTarget()) {
      log.debug('skip apply', { reason, enabled: settings?.extensionEnabled, path: location.pathname });
      return;
    }
    if (userOverride) return log.debug('skip apply: user override');
    if (adActive) return log.debug('skip apply: ad playing');

    const since = Date.now() - lastApplyAt;
    if (since < APPLY_THROTTLE_MS) return scheduleApply(reason, APPLY_THROTTLE_MS - since);

    const cycle = cycleId;

    if (settings.forceDomFallback || !isAvailable()) {
      await runDomFallback();
      return;
    }

    const ready = await request(WAIT_READY, { timeoutMs: 20000 });
    if (cycle !== cycleId) return log.debug('stale cycle, abandoning');
    if (!ready?.ready) {
      log.debug('player never became ready; falling back to the menu');
      await runDomFallback();
      return;
    }

    if (ready.videoId) videoId = ready.videoId;

    const target = resolvePreferred(settings.preferredQuality, ready.available, {
      allowPremium: settings.allowPremium,
    });
    if (!target) {
      log.debug('no selectable quality', ready.available);
      lastStatus = { source: 'api', applied: null, reason: 'no-match' };
      return;
    }

    lastApplyAt = Date.now();
    lastRequested = target.token;
    const res = await request(APPLY_QUALITY, { token: target.token });
    if (cycle !== cycleId) return;

    lastStatus = { source: 'api', applied: target.label, reason: target.reason };
    log.debug('applied', target, '->', res?.actual);

    const landed = target.token === 'auto' || res?.actual === target.token;
    if (!landed && attempts < MAX_ATTEMPTS) {
      const backoff = 300 * 2 ** attempts;
      attempts += 1;
      setTimeout(() => {
        if (cycle === cycleId) void applyNow('retry');
      }, backoff);
    }
  }

  async function runDomFallback() {
    if (!isDesktopWatch()) return;
    lastApplyAt = Date.now();
    const res = await applyQualityViaMenu(settings.preferredQuality, {
      allowPremium: settings.allowPremium,
    });
    lastStatus = { source: 'dom', applied: res.label ?? null, reason: res.reason ?? null };
  }

  // ------------------------------------------------------------ theater

  async function syncTheater() {
    if (!settings?.extensionEnabled || !isDesktopWatch()) return;
    await applyTheater(settings.theaterMode);
  }

  // ------------------------------------------------------------ navigation

  async function onNavigate(reason) {
    newCycle(reason);
    resetHandshake();
    refreshWatch();
    await handshake();
    if (isAvailable()) await request(SUBSCRIBE, { on: true });
    scheduleApply(reason);
    void syncTheater();
  }

  // YouTube fires all three of these within ~300ms of one navigation. Coalesce
  // them so a single navigation performs one handshake and one apply.
  let navTimer = null;
  let navReason = null;
  for (const name of ['yt-navigate-finish', 'yt-page-data-updated', 'yt-player-updated']) {
    document.addEventListener(name, () => {
      navReason = navReason ?? name;
      clearTimeout(navTimer);
      navTimer = setTimeout(() => {
        const reason = navReason;
        navReason = null;
        void onNavigate(reason);
      }, 200);
    });
  }
  document.addEventListener('yt-navigate-start', () => {
    cycleId += 1; // invalidates any in-flight continuation
  });

  on(PLAYER_READY, () => scheduleApply(PLAYER_READY));

  on(VIDEO_CHANGED, payload => {
    if (payload?.videoId && payload.videoId === videoId) return;
    videoId = payload?.videoId ?? null;
    newCycle(VIDEO_CHANGED);
    scheduleApply(VIDEO_CHANGED);
  });

  on(STATE_CHANGE, payload => {
    const wasAd = adActive;
    adActive = Boolean(payload?.isAd);
    // Falling edge: the ad finished and real content is loading.
    if (wasAd && !adActive) scheduleApply('ad-ended');
  });

  on(QUALITY_CHANGED, payload => {
    const token = payload?.token;
    if (!token || token === lastRequested) return;
    if (Date.now() - lastApplyAt < OVERRIDE_GRACE_MS) return;
    // The viewer changed quality by hand. Respect it until the next video —
    // without this, the new re-apply triggers would fight them.
    userOverride = true;
    log.debug('user override detected', token);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && lastStatus.source === 'none') scheduleApply('visible');
  });

  // ------------------------------------------------------------ settings + popup

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'GET_STATUS') return false;
    request(GET_STATE).then(state => {
      sendResponse({
        onTarget: isTarget(),
        path: location.pathname,
        ready: Boolean(state?.ready),
        videoId: state?.videoId ?? null,
        current: state?.current ?? null,
        available: state?.available ?? [],
        theater: readTheater(),
        ...lastStatus,
      });
    });
    return true; // async response
  });

  watchSettings((next, changedKeys) => {
    const previous = settings;
    settings = next;
    setDebug(next.debug);

    if (changedKeys.some(key => QUALITY_KEYS.includes(key))) {
      newCycle('settings');
      scheduleApply('settings');
    }
    if (changedKeys.includes('theaterMode') && next.theaterMode !== previous?.theaterMode) {
      void syncTheater();
    }
  });

  watchTheater(state => {
    if (!settings || state === settings.theaterMode) return;
    // The viewer toggled theater themselves (button, `t`, or YouTube's own
    // persistence). Record it so the popup agrees.
    settings.theaterMode = state;
    void saveSettings({ theaterMode: state });
  });

  // ------------------------------------------------------------ boot

  void (async () => {
    settings = await loadSettings();
    setDebug(settings.debug);
    await onNavigate('initial');
  })();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scheduleApply('domcontentloaded'));
  }
}

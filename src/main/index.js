/**
 * MAIN-world agent.
 *
 * Runs in the page's own realm, which is the only place YouTube's undocumented
 * player methods (setPlaybackQualityRange, getAvailableQualityData) are reachable.
 * It has no chrome.* API, so it owns no policy: the isolated controller decides
 * what to apply and this file only reports state and actuates.
 *
 * Trusted Types are enforced on youtube.com — never assign markup here.
 */
import {
  REQ,
  RES,
  EVT,
  PING,
  WAIT_READY,
  GET_STATE,
  APPLY_QUALITY,
  SET_SIZE_STYLE,
  SUBSCRIBE,
  PLAYER_READY,
  VIDEO_CHANGED,
  STATE_CHANGE,
  QUALITY_CHANGED,
  PLAYER_GONE,
  envelope,
  parseEnvelope,
} from '../lib/protocol.js';

const AUTO = 'auto';

/** Mirrors QUALITY_TIERS; duplicated as a plain map to keep this file dependency-light. */
const TOKEN_HEIGHT = {
  highres: 4320,
  hd2160: 2160,
  hd1440: 1440,
  hd1080: 1080,
  hd720: 720,
  large: 480,
  medium: 360,
  small: 240,
  tiny: 144,
};

// ---------------------------------------------------------------- player access

function describe(el) {
  if (!el) return null;
  const hasData = typeof el.getAvailableQualityData === 'function';
  const hasLevels = typeof el.getAvailableQualityLevels === 'function';
  if (!hasData && !hasLevels) return null;
  return { el, flavor: hasData ? 'data' : 'levels' };
}

/**
 * A Shorts page carries two players: the live #shorts-player and a leftover,
 * hidden #movie_player whose quality list is empty. Picking by id alone drives
 * the dead one, so candidates are ranked by what they can actually report.
 */
function findPlayer() {
  const byId = [document.getElementById('shorts-player'), document.getElementById('movie_player')];
  const onShorts = location.pathname.startsWith('/shorts/');
  if (!onShorts) byId.reverse();

  const seen = new Set();
  const candidates = [];
  for (const el of [...byId, ...document.querySelectorAll('.html5-video-player')]) {
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const player = describe(el);
    if (player) candidates.push(player);
  }
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  return (
    candidates.find(p => p.el.querySelector('video') && readAvailable(p).length > 0) ||
    candidates.find(p => p.el.offsetParent !== null && p.el.querySelector('video')) ||
    candidates[0]
  );
}

/** Normalises both API flavours to {token, label, playable, formatType}. */
function readAvailable(player) {
  if (!player) return [];
  try {
    if (player.flavor === 'data') {
      const raw = player.el.getAvailableQualityData();
      if (!Array.isArray(raw)) return [];
      return raw.map(d => ({
        token: d?.quality,
        label: d?.qualityLabel ?? String(d?.quality ?? ''),
        playable: d?.isPlayable !== false,
        // Absent on a non-Premium session; the isolated side treats null as "unknown".
        formatType: d?.formatType ?? null,
      }));
    }
    const raw = player.el.getAvailableQualityLevels();
    if (!Array.isArray(raw)) return [];
    return raw.map(token => ({
      token,
      label: TOKEN_HEIGHT[token] ? `${TOKEN_HEIGHT[token]}p` : String(token),
      playable: true,
      formatType: null,
    }));
  } catch {
    return [];
  }
}

function videoIdOf(player) {
  try {
    return player?.el.getVideoData?.()?.video_id ?? null;
  } catch {
    return null;
  }
}

function isAdShowing(player) {
  try {
    const cl = player?.el.classList;
    return Boolean(cl?.contains('ad-showing') || cl?.contains('ad-interrupting'));
  } catch {
    return false;
  }
}

function currentQuality(player) {
  try {
    return player?.el.getPlaybackQuality?.() ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- readiness

/**
 * Ready means the player exists, exposes at least one quality, and has a video
 * element. Gating on non-empty quality data — rather than on the element merely
 * existing — is the fix for 2.0.6's fixed 100ms delay: right after navigation the
 * player is present but its quality list is still empty, and an apply in that
 * window is silently discarded.
 */
function isReady(player) {
  if (!player || !document.contains(player.el)) return false;
  if (!player.el.querySelector('video')) return false;
  return readAvailable(player).length > 0;
}

function waitForReady(timeoutMs = 20000) {
  return new Promise(resolve => {
    let settled = false;
    let observer = null;
    let timer = null;

    const finish = ok => {
      if (settled) return;
      settled = true;
      observer?.disconnect();
      clearTimeout(timer);
      const player = findPlayer();
      resolve({
        ready: ok,
        videoId: videoIdOf(player),
        available: readAvailable(player),
      });
    };

    const check = () => {
      const player = findPlayer();
      if (isReady(player)) {
        finish(true);
        return true;
      }
      return false;
    };

    if (check()) return;

    // Cheap observer: childList only. 2.0.6 observed attributes + characterData
    // on document.body, which on YouTube fires constantly.
    observer = new MutationObserver(() => check());
    observer.observe(document.documentElement, { childList: true, subtree: true });

    const started = Date.now();
    const poll = () => {
      if (settled) return;
      if (check()) return;
      const elapsed = Date.now() - started;
      if (elapsed >= timeoutMs) {
        finish(false);
        return;
      }
      const step = elapsed < 2000 ? 100 : elapsed < 10000 ? 250 : 500;
      timer = setTimeout(poll, step);
    };
    timer = setTimeout(poll, 100);
  });
}

// ---------------------------------------------------------------- actuation

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function applyQuality(token) {
  const player = findPlayer();
  if (!player) return { ok: false, requested: token, actual: null, videoId: null, error: 'no-player' };

  const value = token === AUTO ? AUTO : token;

  // Both are attempted: setPlaybackQualityRange is the one that sticks on modern
  // players, setPlaybackQuality is harmless and helps older ones.
  try {
    player.el.setPlaybackQualityRange?.(value, value);
  } catch {
    /* fall through to the legacy call */
  }
  try {
    player.el.setPlaybackQuality?.(value);
  } catch {
    /* best effort */
  }

  // The switch is asynchronous inside the player; reading back too soon reports
  // the old value and triggers a needless retry.
  await sleep(600);
  const after = findPlayer();
  return {
    ok: true,
    requested: token,
    actual: currentQuality(after),
    videoId: videoIdOf(after),
  };
}

function setSizeStyle(theater) {
  const player = findPlayer();
  try {
    player?.el.setSizeStyle?.(true, theater ? 2 : 1);
  } catch {
    return { ok: false, theater: null };
  }
  const flexy = document.querySelector('ytd-watch-flexy');
  return { ok: true, theater: flexy ? flexy.hasAttribute('theater') : null };
}

// ---------------------------------------------------------------- events

function post(dir, id, type, payload) {
  try {
    window.postMessage(envelope(dir, id, type, payload), window.location.origin);
  } catch {
    /* the page tore down under us */
  }
}

const emit = (type, payload) => post(EVT, 0, type, payload);

let subscribed = false;
let boundPlayerEl = null;
let boundVideoEl = null;
let lastVideoId = null;
const listeners = [];

function unbind() {
  for (const off of listeners.splice(0)) {
    try {
      off();
    } catch {
      /* element already gone */
    }
  }
  boundPlayerEl = null;
  boundVideoEl = null;
}

function onVideoIdMaybeChanged(player) {
  const id = videoIdOf(player);
  if (id && id !== lastVideoId) {
    lastVideoId = id;
    emit(VIDEO_CHANGED, { videoId: id });
  }
}

function bind(player) {
  const el = player.el;
  const video = el.querySelector('video');

  const addPlayer = (name, fn) => {
    try {
      el.addEventListener(name, fn);
      listeners.push(() => el.removeEventListener(name, fn));
    } catch {
      /* some player builds reject unknown events */
    }
  };

  addPlayer('onStateChange', state => {
    emit(STATE_CHANGE, { state, isAd: isAdShowing(findPlayer()) });
    onVideoIdMaybeChanged(findPlayer());
  });

  addPlayer('onPlaybackQualityChange', token => {
    emit(QUALITY_CHANGED, { token: typeof token === 'string' ? token : currentQuality(findPlayer()) });
  });

  if (video) {
    // These are what catch autoplay-to-next and the post-ad content load, neither
    // of which fires a yt-navigate-finish.
    for (const name of ['loadstart', 'loadedmetadata']) {
      const fn = () => onVideoIdMaybeChanged(findPlayer());
      video.addEventListener(name, fn);
      listeners.push(() => video.removeEventListener(name, fn));
    }
    boundVideoEl = video;
  }

  boundPlayerEl = el;
  lastVideoId = videoIdOf(player);
}

/** YouTube swaps the player element on some navigations; rebind when it does. */
function ensureBinding() {
  if (!subscribed) return;
  const player = findPlayer();
  if (!player) {
    if (boundPlayerEl) {
      unbind();
      emit(PLAYER_GONE, {});
    }
    return;
  }
  const video = player.el.querySelector('video');
  if (player.el !== boundPlayerEl || (video && video !== boundVideoEl)) {
    unbind();
    bind(player);
    if (isReady(player)) {
      emit(PLAYER_READY, { videoId: videoIdOf(player), available: readAvailable(player) });
    }
  }
}

let rebindObserver = null;

function subscribe(on) {
  subscribed = Boolean(on);
  if (!subscribed) {
    unbind();
    rebindObserver?.disconnect();
    rebindObserver = null;
    return { ok: true };
  }
  ensureBinding();
  if (!rebindObserver) {
    rebindObserver = new MutationObserver(() => ensureBinding());
    rebindObserver.observe(document.documentElement, { childList: true, subtree: true });
  }
  return { ok: true };
}

// ---------------------------------------------------------------- dispatch

async function handle(type, payload) {
  switch (type) {
    case PING: {
      const player = findPlayer();
      return { ready: isReady(player), hasPlayer: Boolean(player), flavor: player?.flavor ?? null };
    }
    case WAIT_READY:
      return waitForReady(Number(payload?.timeoutMs) || 20000);
    case GET_STATE: {
      const player = findPlayer();
      return {
        ready: isReady(player),
        videoId: videoIdOf(player),
        isAd: isAdShowing(player),
        current: currentQuality(player),
        available: readAvailable(player),
      };
    }
    case APPLY_QUALITY:
      return applyQuality(String(payload?.token ?? AUTO));
    case SET_SIZE_STYLE:
      return setSizeStyle(Boolean(payload?.theater));
    case SUBSCRIBE:
      return subscribe(payload?.on);
    default:
      return { ok: false, error: 'unknown-request' };
  }
}

window.addEventListener('message', event => {
  const msg = parseEnvelope(event, REQ, window);
  if (!msg) return;
  Promise.resolve()
    .then(() => handle(msg.type, msg.payload))
    .catch(err => ({ ok: false, error: String(err?.message ?? err) }))
    .then(result => post(RES, msg.id, msg.type, result));
});

/**
 * Envelope shared by the isolated controller and the MAIN-world agent.
 *
 * window.postMessage is used rather than CustomEvent because it exposes
 * event.source and event.origin, which a CustomEvent does not. Page scripts can
 * still observe and forge either, so everything arriving from the MAIN world is
 * treated as untrusted input and re-validated at the point of use.
 */
export const NS = 'simple-auto-hd';
export const PROTOCOL_VERSION = 1;

export const REQ = 'req';
export const RES = 'res';
export const EVT = 'evt';

/** Requests: isolated -> MAIN. */
export const PING = 'PING';
export const WAIT_READY = 'WAIT_READY';
export const GET_STATE = 'GET_STATE';
export const APPLY_QUALITY = 'APPLY_QUALITY';
export const SET_SIZE_STYLE = 'SET_SIZE_STYLE';
export const SUBSCRIBE = 'SUBSCRIBE';

/** Events: MAIN -> isolated. */
export const PLAYER_READY = 'PLAYER_READY';
export const VIDEO_CHANGED = 'VIDEO_CHANGED';
export const STATE_CHANGE = 'STATE_CHANGE';
export const QUALITY_CHANGED = 'QUALITY_CHANGED';
export const PLAYER_GONE = 'PLAYER_GONE';

/** Per-request client-side timeouts, in ms. */
export const TIMEOUTS = {
  [PING]: 1500,
  [WAIT_READY]: 21000,
  [GET_STATE]: 3000,
  [APPLY_QUALITY]: 5000,
  [SET_SIZE_STYLE]: 2000,
  [SUBSCRIBE]: 2000,
};

export function envelope(dir, id, type, payload) {
  return { __sahd: NS, v: PROTOCOL_VERSION, dir, id, type, payload: payload ?? {} };
}

/**
 * Returns the envelope if the message is genuinely ours and points the expected
 * way, otherwise null. `win` is injectable so the guard can be unit-tested.
 *
 * The `dir` check is what stops a page script replaying our own requests back at
 * us: a request and a response are never interchangeable.
 */
export function parseEnvelope(event, expectedDir, win = globalThis) {
  if (!event || typeof event !== 'object') return null;
  if (event.source !== win) return null;
  if (event.origin !== win.location?.origin) return null;

  const data = event.data;
  if (!data || typeof data !== 'object') return null;
  if (data.__sahd !== NS) return null;
  if (data.v !== PROTOCOL_VERSION) return null;
  if (data.dir !== expectedDir) return null;
  if (typeof data.type !== 'string') return null;
  if (!Number.isInteger(data.id)) return null;
  if (data.payload != null && typeof data.payload !== 'object') return null;

  return data;
}

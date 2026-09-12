/**
 * Isolated-world client for the MAIN-world agent.
 *
 * Every request resolves — a timeout yields {ok:false, error:'timeout'} rather
 * than rejecting, so a MAIN world that never loaded degrades to the DOM fallback
 * instead of hanging the controller.
 */
import { REQ, RES, EVT, PING, TIMEOUTS, envelope, parseEnvelope } from '../lib/protocol.js';
import { log } from '../lib/log.js';

const pending = new Map();
const handlers = new Map();
let nextId = 1;

window.addEventListener('message', event => {
  const evt = parseEnvelope(event, EVT, window);
  if (evt) {
    for (const fn of handlers.get(evt.type) ?? []) {
      try {
        fn(evt.payload);
      } catch (err) {
        log.warn('event handler threw', err);
      }
    }
    return;
  }

  const res = parseEnvelope(event, RES, window);
  if (!res) return;
  const entry = pending.get(res.id);
  if (!entry) return;
  pending.delete(res.id);
  clearTimeout(entry.timer);
  entry.resolve(res.payload ?? {});
});

export function request(type, payload = {}, timeoutMs) {
  const id = nextId++;
  const limit = timeoutMs ?? TIMEOUTS[type] ?? 3000;

  return new Promise(resolve => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve({ ok: false, error: 'timeout' });
    }, limit);

    pending.set(id, { resolve, timer });

    try {
      window.postMessage(envelope(REQ, id, type, payload), window.location.origin);
    } catch (err) {
      clearTimeout(timer);
      pending.delete(id);
      resolve({ ok: false, error: String(err?.message ?? err) });
    }
  });
}

export function on(type, handler) {
  if (!handlers.has(type)) handlers.set(type, []);
  handlers.get(type).push(handler);
}

let available = null;

/**
 * Three PINGs 500ms apart. The retries exist because both content scripts are
 * injected at document_start and their relative order is not guaranteed.
 */
export async function handshake() {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await request(PING, {}, TIMEOUTS[PING]);
    if (res && res.error !== 'timeout') {
      available = true;
      log.debug('MAIN world reachable', res);
      return true;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  available = false;
  log.debug('MAIN world unreachable — using the DOM fallback for this page');
  return false;
}

export const isAvailable = () => available === true;

/** Re-probe on the next navigation rather than writing the page off for good. */
export function resetHandshake() {
  available = null;
}

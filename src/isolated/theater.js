/**
 * Theater mode.
 *
 * 2.0.6 read the size button's localized tooltip against a table of 67
 * translations. This reads the layout element's `theater` attribute instead,
 * which is language-independent and also reflects changes the old click listener
 * never saw: the `t` keyboard shortcut, YouTube's own layout persistence, and
 * miniplayer transitions.
 */
import { SET_SIZE_STYLE } from '../lib/protocol.js';
import { log } from '../lib/log.js';
import { request } from './bridge.js';

const FLEXY = 'ytd-watch-flexy';

let suppressSync = false;
let suppressTimer = null;
let observer = null;
let observedEl = null;
let onExternalChange = null;

/** true | false | 'fullscreen' | null (unknown — not a desktop watch layout). */
export function readTheater() {
  const flexy = document.querySelector(FLEXY);
  if (!flexy) return null;
  if (flexy.hasAttribute('fullscreen') || document.fullscreenElement) return 'fullscreen';
  return flexy.hasAttribute('theater');
}

function suppress() {
  suppressSync = true;
  clearTimeout(suppressTimer);
  suppressTimer = setTimeout(() => {
    suppressSync = false;
  }, 1200);
}

function waitForFlip(flexy, want, timeoutMs = 1000) {
  return new Promise(resolve => {
    let done = false;
    const finish = ok => {
      if (done) return;
      done = true;
      mo.disconnect();
      clearTimeout(timer);
      resolve(ok);
    };
    const mo = new MutationObserver(() => {
      if (flexy.hasAttribute('theater') === want) finish(true);
    });
    mo.observe(flexy, { attributes: true, attributeFilter: ['theater'] });
    const timer = setTimeout(() => finish(flexy.hasAttribute('theater') === want), timeoutMs);
  });
}

/**
 * The layout element does not exist yet at document_start, so a boot-time call
 * would otherwise give up and rely on a later navigation event to retry.
 */
async function waitForLayout(timeoutMs = 8000) {
  const started = Date.now();
  let state = readTheater();
  while (state === null && Date.now() - started < timeoutMs) {
    await new Promise(r => setTimeout(r, 150));
    state = readTheater();
  }
  return state;
}

/** Never throws; gives up quietly when the layout is not one we understand. */
export async function applyTheater(want) {
  const current = await waitForLayout();
  if (current === null || current === 'fullscreen') {
    log.debug('theater: no applicable layout', { current });
    return { ok: false, reason: 'not-applicable' };
  }
  if (current === want) return { ok: true, changed: false };

  const flexy = document.querySelector(FLEXY);
  const button = document.querySelector('.ytp-size-button');

  suppress();

  if (button) {
    button.click();
    if (await waitForFlip(flexy, want)) return { ok: true, changed: true };
  }

  // The button is missing or the click did not take: ask the player directly.
  const res = await request(SET_SIZE_STYLE, { theater: want });
  if (res?.ok && readTheater() === want) return { ok: true, changed: true };

  log.debug('theater: could not apply', { want, current: readTheater() });
  return { ok: false, reason: 'no-effect' };
}

/**
 * Watches the layout and reports user-driven changes back. Re-attaches when
 * YouTube replaces the element, which it does across some navigations.
 */
export function watchTheater(callback) {
  onExternalChange = callback;
  attach();
}

function attach() {
  const flexy = document.querySelector(FLEXY);
  if (!flexy || flexy === observedEl) return;

  observer?.disconnect();
  observedEl = flexy;
  observer = new MutationObserver(() => {
    if (suppressSync) return;
    const state = readTheater();
    if (typeof state === 'boolean') onExternalChange?.(state);
  });
  observer.observe(flexy, { attributes: true, attributeFilter: ['theater'] });
}

/** Call after each navigation, in case the layout element was swapped. */
export function refreshWatch() {
  if (onExternalChange) attach();
}

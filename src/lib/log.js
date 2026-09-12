const PREFIX = '[Simple Auto HD]';

let verbose = false;

export function setDebug(on) {
  verbose = Boolean(on);
}

export const log = {
  /** Always shown — reserved for conditions a user may need to report. */
  warn(...args) {
    console.warn(PREFIX, ...args);
  },
  /** Only with the debug setting on; 2.0.6 logged on every watch page. */
  debug(...args) {
    if (verbose) console.log(PREFIX, ...args);
  },
};

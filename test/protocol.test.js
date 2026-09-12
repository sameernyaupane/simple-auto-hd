import { test } from 'node:test';
import assert from 'node:assert/strict';
import { envelope, parseEnvelope, NS, REQ, RES, PING } from '../src/lib/protocol.js';

const win = { location: { origin: 'https://www.youtube.com' } };

const msg = (over = {}) => ({
  source: win,
  origin: 'https://www.youtube.com',
  data: envelope(RES, 1, PING, { ready: true }),
  ...over,
});

test('a well-formed response is accepted', () => {
  const parsed = parseEnvelope(msg(), RES, win);
  assert.ok(parsed);
  assert.equal(parsed.type, PING);
  assert.deepEqual(parsed.payload, { ready: true });
});

test('rejects a message from another window', () => {
  assert.equal(parseEnvelope(msg({ source: {} }), RES, win), null);
});

test('rejects a cross-origin message', () => {
  assert.equal(parseEnvelope(msg({ origin: 'https://evil.example' }), RES, win), null);
});

test('rejects the wrong direction — a replayed request is not a response', () => {
  const replayed = msg({ data: envelope(REQ, 1, PING) });
  assert.equal(parseEnvelope(replayed, RES, win), null);
  assert.ok(parseEnvelope(replayed, REQ, win));
});

test('rejects a foreign or missing namespace', () => {
  assert.equal(parseEnvelope(msg({ data: { ...envelope(RES, 1, PING), __sahd: 'other' } }), RES, win), null);
  assert.equal(parseEnvelope(msg({ data: { dir: RES, id: 1, type: PING } }), RES, win), null);
});

test('rejects a protocol version mismatch', () => {
  assert.equal(parseEnvelope(msg({ data: { ...envelope(RES, 1, PING), v: 99 } }), RES, win), null);
});

test('rejects non-object and empty data', () => {
  for (const data of [null, undefined, 'string', 42, []]) {
    const r = parseEnvelope(msg({ data }), RES, win);
    assert.equal(r, null, String(data));
  }
});

test('rejects a malformed type, id or payload', () => {
  assert.equal(parseEnvelope(msg({ data: { ...envelope(RES, 1, PING), type: 5 } }), RES, win), null);
  assert.equal(parseEnvelope(msg({ data: { ...envelope(RES, 1, PING), id: 'x' } }), RES, win), null);
  assert.equal(parseEnvelope(msg({ data: { ...envelope(RES, 1, PING), payload: 'x' } }), RES, win), null);
});

test('rejects a non-event argument', () => {
  for (const e of [null, undefined, 'x', 42]) assert.equal(parseEnvelope(e, RES, win), null);
});

test('envelope shape', () => {
  const e = envelope(REQ, 7, PING);
  assert.equal(e.__sahd, NS);
  assert.equal(e.v, 1);
  assert.equal(e.id, 7);
  assert.deepEqual(e.payload, {});
});

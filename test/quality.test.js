import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolvePreferred,
  parsePreference,
  labelToToken,
  normalizeDigits,
  isPremiumEntry,
  tokenRank,
  heightToToken,
  tokenToHeight,
} from '../src/lib/quality.js';

const AVAIL = [
  { token: 'hd2160', label: '2160p60', playable: true },
  { token: 'hd1440', label: '1440p60', playable: true },
  { token: 'hd1080', label: '1080p60', playable: true },
  { token: 'hd720', label: '720p60', playable: true },
  { token: 'large', label: '480p', playable: true },
  { token: 'tiny', label: '144p', playable: true },
];

test('exact tier hit', () => {
  assert.equal(resolvePreferred('1080p', AVAIL).token, 'hd1080');
  assert.equal(resolvePreferred('1080p', AVAIL).reason, 'exact');
});

test('ladders down when the requested tier is absent', () => {
  // 360p is not offered; the next one at or below is 240p... which is also absent,
  // so it lands on 144p.
  const r = resolvePreferred('360p', AVAIL);
  assert.equal(r.token, 'tiny');
  assert.equal(r.reason, 'laddered');
});

test('ladders down from an unavailable top tier', () => {
  const r = resolvePreferred('4320p', AVAIL);
  assert.equal(r.token, 'hd2160');
  assert.equal(r.reason, 'laddered');
});

test('best-available picks the highest', () => {
  const r = resolvePreferred('best-available', AVAIL);
  assert.equal(r.token, 'hd2160');
  assert.equal(r.reason, 'best');
});

test('best-available is the default for unknown input', () => {
  assert.equal(resolvePreferred(undefined, AVAIL).token, 'hd2160');
  assert.equal(resolvePreferred('nonsense', AVAIL).token, 'hd2160');
});

test('Auto maps to the auto token, in any casing', () => {
  assert.equal(resolvePreferred('Auto', AVAIL).token, 'auto');
  assert.equal(resolvePreferred('auto', AVAIL).token, 'auto');
});

test('floor: everything on offer is above the request', () => {
  const highOnly = [
    { token: 'hd2160', label: '2160p', playable: true },
    { token: 'hd1080', label: '1080p', playable: true },
  ];
  const r = resolvePreferred('144p', highOnly);
  assert.equal(r.token, 'hd1080');
  assert.equal(r.reason, 'floor');
});

test('unplayable entries are filtered out', () => {
  const avail = [
    { token: 'hd2160', label: '2160p', playable: false },
    { token: 'hd1080', label: '1080p', playable: true },
  ];
  assert.equal(resolvePreferred('best-available', avail).token, 'hd1080');
});

test('the auto pseudo-entry is never a concrete target', () => {
  const avail = [{ token: 'auto', label: 'Auto' }, { token: 'hd720', label: '720p' }];
  assert.equal(resolvePreferred('best-available', avail).token, 'hd720');
});

test('premium excluded by default, included when opted in', () => {
  const avail = [
    { token: 'hd1080', label: '1080p Premium', formatType: 'PREMIUM', playable: true },
    { token: 'hd1080', label: '1080p', playable: true },
    { token: 'hd720', label: '720p', playable: true },
  ];
  assert.equal(resolvePreferred('1080p', avail).label, '1080p');
  assert.equal(resolvePreferred('1080p', avail, { allowPremium: true }).label, '1080p Premium');
});

test('a premium-only list still resolves when premium is opted out', () => {
  const avail = [{ token: 'hd1080', label: '1080p Premium', formatType: 'PREMIUM', playable: true }];
  const r = resolvePreferred('1080p', avail, { allowPremium: false });
  assert.ok(r, 'must not leave the viewer worse off than YouTube default');
  assert.equal(r.token, 'hd1080');
});

test('empty or non-array input yields null', () => {
  assert.equal(resolvePreferred('1080p', []), null);
  assert.equal(resolvePreferred('1080p', null), null);
  assert.equal(resolvePreferred('1080p', undefined), null);
  assert.equal(resolvePreferred('best-available', [{ token: 'bogus' }]), null);
});

test('malformed entries never throw', () => {
  const junk = [null, undefined, 42, 'x', {}, { token: null }, { token: 'nope' }];
  assert.doesNotThrow(() => resolvePreferred('1080p', junk));
  assert.equal(resolvePreferred('1080p', junk), null);
  assert.doesNotThrow(() => resolvePreferred('1080p', [...junk, ...AVAIL]));
  assert.equal(resolvePreferred('1080p', [...junk, ...AVAIL]).token, 'hd1080');
});

test('every legacy popup value parses', () => {
  const legacy = [
    'best-available', '4320p', '2160p', '1440p', '1080p',
    '720p', '480p', '360p', '240p', '144p', 'Auto',
  ];
  for (const v of legacy) {
    assert.doesNotThrow(() => parsePreference(v), v);
    assert.ok(['best', 'auto', 'tier'].includes(parsePreference(v).mode), v);
  }
  assert.deepEqual(parsePreference('1080p'), { mode: 'tier', height: 1080 });
  assert.deepEqual(parsePreference('best-available'), { mode: 'best', height: null });
  assert.deepEqual(parsePreference('Auto'), { mode: 'auto', height: null });
});

test('fps suffixes and raw tokens are tolerated', () => {
  assert.deepEqual(parsePreference('1080p60'), { mode: 'tier', height: 1080 });
  assert.deepEqual(parsePreference('hd1080'), { mode: 'tier', height: 1080 });
});

test('labels in non-Latin numerals parse', () => {
  assert.equal(normalizeDigits('१०८०p'), '1080p');
  assert.equal(labelToToken('१०८०p'), 'hd1080');
  assert.equal(labelToToken('٧٢٠p'), 'hd720');
  assert.equal(labelToToken('2160p60 4K'), 'hd2160');
  assert.equal(labelToToken('Automatisch'), null);
});

test('premium detection tolerates a missing formatType', () => {
  assert.equal(isPremiumEntry({ label: '1080p Premium' }), true);
  assert.equal(isPremiumEntry({ label: '1080p' }), false);
  assert.equal(isPremiumEntry({ formatType: 'PREMIUM', label: '1080p' }), true);
  assert.equal(isPremiumEntry({ label: '<sup class="ytp-premium-label">' }), true);
  assert.equal(isPremiumEntry(null), false);
});

test('tier lookups', () => {
  assert.equal(tokenRank('highres'), 0);
  assert.equal(tokenRank('tiny'), 8);
  assert.equal(tokenRank('bogus'), Infinity);
  assert.equal(heightToToken(1080), 'hd1080');
  assert.equal(heightToToken(999), null);
  assert.equal(tokenToHeight('hd720'), 720);
});

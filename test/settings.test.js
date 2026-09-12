import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, QUALITY_OPTIONS, THEMES, normalizeSettings } from '../src/lib/settings.js';
import { parsePreference } from '../src/lib/quality.js';

test('undefined extensionEnabled means enabled (2.0.6 semantics)', () => {
  assert.equal(normalizeSettings({}).extensionEnabled, true);
  assert.equal(normalizeSettings(null).extensionEnabled, true);
  assert.equal(normalizeSettings({ extensionEnabled: false }).extensionEnabled, false);
  // Only an explicit false disables; anything truthy enables.
  assert.equal(normalizeSettings({ extensionEnabled: true }).extensionEnabled, true);
});

test('a 2.0.6 storage blob survives normalize unchanged', () => {
  const legacy = { extensionEnabled: true, theaterMode: true, preferredQuality: '1080p' };
  const out = normalizeSettings(legacy);
  assert.equal(out.preferredQuality, '1080p', 'legacy value must not be rewritten');
  assert.equal(out.theaterMode, true);
  assert.equal(out.extensionEnabled, true);
});

test('new keys default without touching legacy ones', () => {
  const out = normalizeSettings({ preferredQuality: '720p' });
  assert.equal(out.allowPremium, false, 'premium stays off = 2.0.6 behaviour');
  assert.equal(out.applyToShorts, true);
  assert.equal(out.preferredQuality, '720p');
});

test('unknown stored keys are preserved', () => {
  const out = normalizeSettings({ somethingFromTheFuture: 7 });
  assert.equal(out.somethingFromTheFuture, 7);
});

test('a blank or non-string preference falls back to the default', () => {
  assert.equal(normalizeSettings({ preferredQuality: '' }).preferredQuality, DEFAULTS.preferredQuality);
  assert.equal(normalizeSettings({ preferredQuality: 42 }).preferredQuality, DEFAULTS.preferredQuality);
});

test('booleans are coerced, never left as strings', () => {
  const out = normalizeSettings({ theaterMode: 'yes', allowPremium: 0 });
  assert.equal(out.theaterMode, true);
  assert.equal(out.allowPremium, false);
});

test('every popup option is understood by parsePreference', () => {
  assert.equal(QUALITY_OPTIONS.length, 11, 'option count is part of the storage contract');
  for (const { value } of QUALITY_OPTIONS) {
    const parsed = parsePreference(value);
    assert.ok(['best', 'auto', 'tier'].includes(parsed.mode), value);
    if (parsed.mode === 'tier') assert.ok(parsed.height > 0, value);
  }
});

test('theme defaults to system and rejects unknown values', () => {
  assert.equal(normalizeSettings({}).theme, 'system');
  assert.equal(normalizeSettings({ theme: 'dark' }).theme, 'dark');
  assert.equal(normalizeSettings({ theme: 'light' }).theme, 'light');
  assert.equal(normalizeSettings({ theme: 'neon' }).theme, DEFAULTS.theme);
  assert.equal(normalizeSettings({ theme: 42 }).theme, DEFAULTS.theme);
});

test('every theme choice is one the popup offers', () => {
  assert.deepEqual(THEMES, ['system', 'light', 'dark']);
  assert.ok(THEMES.includes(DEFAULTS.theme));
});

test('adding theme did not disturb the legacy keys', () => {
  const legacy = { extensionEnabled: true, theaterMode: true, preferredQuality: '1440p' };
  const out = normalizeSettings(legacy);
  assert.equal(out.preferredQuality, '1440p');
  assert.equal(out.theaterMode, true);
  assert.equal(out.theme, 'system');
});

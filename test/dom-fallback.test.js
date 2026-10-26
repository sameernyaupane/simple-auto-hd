import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// A minimal stand-in for YouTube's gear menu: just enough of the DOM for
// applyQualityViaMenu to open it, find the quality row and click an entry.
// There is no real player here, so this checks which row we click, not what
// YouTube does afterwards.

function el({ text = '', classes = [], children = [], onClick } = {}) {
  const node = {
    classes: new Set(classes),
    children,
    attrs: {},
    get textContent() {
      return text + children.map(c => c.textContent).join('');
    },
    click() {
      onClick?.();
    },
    getAttribute: name => node.attrs[name] ?? null,
    matches(sel) {
      return sel
        .split(',')
        .map(s => s.trim())
        .some(s => {
          const [cls, attr] = s.split('[');
          const want = cls.split('.').filter(Boolean);
          if (!want.every(c => node.classes.has(c))) return false;
          if (!attr) return true;
          const [k, v] = attr.replace(']', '').split('=');
          return node.attrs[k] === v.replace(/"/g, '');
        });
    },
    querySelectorAll(sel) {
      // Descendant selectors ("a b") match on the last part within this subtree.
      const last = sel
        .split(',')
        .map(s => s.trim().split(/\s+/).pop())
        .join(',');
      const out = [];
      const walk = n => {
        for (const c of n.children) {
          if (c.matches(last)) out.push(c);
          walk(c);
        }
      };
      walk(node);
      return out;
    },
    querySelector(sel) {
      return node.querySelectorAll(sel)[0] ?? null;
    },
  };
  return node;
}

let clicked;
let menuOpen;

function buildPlayer(qualityLabels) {
  const items = qualityLabels.map(({ label, premium }) => {
    const labelEl = el({
      text: label,
      classes: ['ytp-menuitem-label'],
      children: premium ? [el({ text: ' Premium', classes: ['ytp-premium-label'] })] : [],
    });
    return el({
      classes: ['ytp-menuitem'],
      children: [labelEl],
      onClick: () => (clicked = labelEl.textContent),
    });
  });
  const qualityMenu = el({ classes: ['ytp-quality-menu'], children: items });

  const qualityRow = el({
    classes: ['ytp-menuitem'],
    children: [
      el({ text: 'Quality', classes: ['ytp-menuitem-label'] }),
      el({ text: '720p', classes: ['ytp-menuitem-content'] }),
    ],
  });
  qualityRow.attrs.role = 'menuitem';
  const panel = el({ classes: ['ytp-panel-menu'], children: [qualityRow] });

  const gear = el({ classes: ['ytp-settings-button'], onClick: () => (menuOpen = !menuOpen) });
  const popup = el({ classes: ['ytp-popup', 'ytp-settings-menu'], children: [panel, qualityMenu] });
  const root = el({ children: [gear, popup] });

  globalThis.document = {
    querySelector: sel => {
      if (sel.startsWith('.ytp-popup.ytp-settings-menu')) return menuOpen ? popup : null;
      return root.querySelector(sel);
    },
    querySelectorAll: sel => root.querySelectorAll(sel),
    activeElement: null,
  };
}

const MENU = [
  { label: '1080p', premium: true },
  { label: '1080p' },
  { label: '720p' },
  { label: 'Auto' },
];

beforeEach(() => {
  clicked = null;
  menuOpen = false;
});

const { applyQualityViaMenu } = await import('../src/isolated/dom-fallback.js');

test('premium allowed: the Premium row is clicked', async () => {
  buildPlayer(MENU);
  const res = await applyQualityViaMenu('1080p', { allowPremium: true });
  assert.equal(res.ok, true);
  assert.equal(clicked, '1080p Premium');
  assert.equal(menuOpen, false, 'menu is closed afterwards');
});

test('premium not allowed: the standard row is clicked', async () => {
  buildPlayer(MENU);
  const res = await applyQualityViaMenu('1080p', { allowPremium: false });
  assert.equal(res.ok, true);
  assert.equal(clicked, '1080p');
});

test('premium allowed, listed after standard: still the Premium row', async () => {
  buildPlayer([{ label: '1080p' }, { label: '1080p', premium: true }, { label: 'Auto' }]);
  await applyQualityViaMenu('best-available', { allowPremium: true });
  assert.equal(clicked, '1080p Premium');
});

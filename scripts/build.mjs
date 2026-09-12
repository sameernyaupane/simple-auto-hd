#!/usr/bin/env node
/**
 * Bundles src/ into dist/, the "Load unpacked" target.
 *
 * Each entry point becomes a self-contained IIFE so Chrome loads it as a plain
 * classic script with no module plumbing. Source stays ESM so src/lib/* can be
 * imported by node --test.
 */
import { context, build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const watch = process.argv.includes('--watch');

const ENTRIES = [
  { in: 'src/main/index.js', out: 'main-agent' },
  { in: 'src/isolated/index.js', out: 'content' },
  { in: 'src/popup/index.js', out: 'popup' },
  { in: 'src/background/index.js', out: 'background' },
];

const STATIC = [
  ['manifest.json', 'manifest.json'],
  ['src/popup/popup.html', 'popup.html'],
  ['src/popup/popup.css', 'popup.css'],
  ['icons', 'icons'],
];

async function copyStatic() {
  await Promise.all(
    STATIC.map(([from, to]) =>
      cp(resolve(root, from), resolve(dist, to), { recursive: true })
    )
  );
}

const options = {
  entryPoints: ENTRIES.map(e => ({ in: resolve(root, e.in), out: e.out })),
  outdir: dist,
  bundle: true,
  format: 'iife',
  target: ['chrome111'],
  platform: 'browser',
  legalComments: 'none',
  logLevel: 'info',
  // Keep it readable: a reviewer (and the Web Store) can follow unminified output,
  // and these files are small enough that minification buys nothing.
  minify: false,
};

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  await copyStatic();
  console.log('watching…');
} else {
  await build(options);
  await copyStatic();
  console.log('built -> dist/');
}

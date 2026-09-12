#!/usr/bin/env node
/** Zips dist/ for a Chrome Web Store upload. */
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
const zip = resolve(root, `simple-auto-hd-${version}.zip`);

rmSync(zip, { force: true });
execFileSync('zip', ['-r', '-q', zip, '.'], { cwd: resolve(root, 'dist'), stdio: 'inherit' });
console.log(`packaged -> ${zip}`);

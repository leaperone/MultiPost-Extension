import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getContentTypeLabel,
  getPublishPathForContentType,
  isKnownContentType,
} from '../src/lib/desktop-content-types';
import { interopDefault } from '../src/lib/lazyInterop';

function LazyComponent() {
  return null;
}

assert.equal(interopDefault({ default: LazyComponent }).default, LazyComponent);
assert.equal(
  interopDefault({ default: { __esModule: true, default: LazyComponent } }).default,
  LazyComponent,
);

assert.equal(isKnownContentType('DYNAMIC'), true);
assert.equal(isKnownContentType('THREAD'), false);
assert.equal(getContentTypeLabel('THREAD'), 'Unknown');
assert.equal(getPublishPathForContentType('THREAD'), null);

const srcRoot = fileURLToPath(new URL('../src', import.meta.url));
const rawCjsLazyImport =
  /\b(?:React\.)?lazy\s*\(\s*\(\s*\)\s*=>\s*import\s*\(\s*['"]react-(?:player|viewer)['"]\s*\)\s*\)/;
const badLazyImports: string[] = [];

function scanSourceFiles(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanSourceFiles(path);
      continue;
    }

    if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue;

    const source = readFileSync(path, 'utf8');
    if (rawCjsLazyImport.test(source)) {
      badLazyImports.push(path.replace(`${srcRoot}/`, 'src/'));
    }
  }
}

scanSourceFiles(srcRoot);
assert.deepEqual(badLazyImports, []);

console.log('sentry regression tests passed');

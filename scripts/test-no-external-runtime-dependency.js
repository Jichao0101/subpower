'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ALLOWLIST = new Set([
  path.join('scripts', 'test-all.js'),
  path.join('scripts', 'test-no-external-runtime-dependency.js'),
  path.join('scripts', 'test-no-cutepower-dependency.js'),
]);

const externalNames = ['cutepower'];
const forbiddenRuntime = [
  '.cutepower/run',
  'upstream_cutepower_context',
  'cutepower-adapter',
];
const forbiddenCodePatterns = [
  /require\(["'][^"']*cutepower[^"']*["']\)/,
  /import\s+.*cutepower/,
];

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    if (['.git', 'node_modules', 'coverage'].includes(name)) continue;
    const abs = path.join(dir, name);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) walk(abs, files);
    else files.push(abs);
  }
  return files;
}

for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file);
  if (ALLOWLIST.has(rel)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const token of forbiddenRuntime) {
    assert.strictEqual(text.includes(token), false, `${rel}: ${token}`);
  }
  for (const pattern of forbiddenCodePatterns) {
    assert.strictEqual(pattern.test(text), false, rel);
  }
  if (rel.startsWith('scripts') || rel.startsWith('schemas') || rel.startsWith('contracts') || rel.startsWith('fixtures')) {
    for (const name of externalNames) {
      assert.strictEqual(text.includes(name), false, `${rel}: external project name in runtime assets`);
    }
  }
  if ((rel.startsWith('README') || rel.startsWith('docs')) && externalNames.some((name) => text.includes(name))) {
    assert(/design reference/i.test(text), `${rel}: external name must be in design reference context`);
    assert(/no source-level, runtime-level, schema-level, or artifact-level dependency/i.test(text), `${rel}: missing no dependency context`);
  }
}

console.log('no external runtime dependency tests passed');

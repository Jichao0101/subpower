'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BAD_RUNTIME = `.${'cutepower'}/run`;
const BAD_CONTEXT = `upstream_${'cutepower'}_context`;
const BLOCKED_NAME = `${'cute'}${'power'}`;

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

assert.strictEqual(fs.existsSync(path.join(ROOT, 'scripts', `${'cutepower'}-adapter.js`)), false);
assert.strictEqual(fs.existsSync(path.join(ROOT, 'scripts', `test-${'cutepower'}-adapter.js`)), false);
assert.strictEqual(fs.existsSync(path.join(ROOT, 'docs', `${'cutepower'}-compatibility.md`)), false);
assert.strictEqual(fs.existsSync(path.join(ROOT, 'docs', 'design-references.md')), true);

for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file);
  if (rel === path.join('scripts', 'test-no-cutepower-dependency.js')) continue;
  const text = fs.readFileSync(file, 'utf8');
  assert.strictEqual(text.includes(BAD_RUNTIME), false, rel);
  assert.strictEqual(text.includes(BAD_CONTEXT), false, rel);
  assert.strictEqual(/require\(["'][.]{2}\/[.]{0,2}\/?cutepower/.test(text), false, rel);
  if (rel.startsWith('README') || rel.startsWith('docs')) {
    assert.strictEqual(text.includes(BLOCKED_NAME), false, rel);
  }
}

console.log('no cutepower dependency tests passed');

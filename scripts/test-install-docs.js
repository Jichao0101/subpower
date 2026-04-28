'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

assert.strictEqual(fs.existsSync(path.join(ROOT, 'INSTALL.md')), true);

const readmeHead = read('README.md').split(/\r?\n/).slice(0, 30).join('\n');
assert(readmeHead.includes('INSTALL.md'));
assert(/development source/i.test(readmeHead));
assert(/install.*checks pass|staging.*checks pass/i.test(readmeHead));

const install = read('INSTALL.md');
const codex = read('README.codex.md');
const docs = read('docs/plugin-installation.md');

const commands = [
  'node scripts/install-plugin.js --scope repo --target ./.codex/plugins/subpower',
  'node scripts/install-plugin.js --scope personal --target ~/.codex/plugins/subpower',
  'node scripts/install-plugin.js --scope repo --target /tmp/subpower-plugin --dry-run',
  'node scripts/install-plugin.js --scope repo --target ./.codex/plugins/subpower --force',
  'node scripts/test-all.js',
];

for (const command of commands) {
  assert(install.includes(command), command);
  assert(docs.includes(command), command);
}

assert(codex.includes('INSTALL.md'));
assert(install.includes('install-plugin.js is a staging utility, not a marketplace publisher.'));
assert(install.includes('.codex-plugin/plugin.json is plugin metadata, not proof of installation.'));
assert(install.includes('.subpower/run/<session_id>/ is runtime state and is not copied into plugin staging targets.'));

console.log('install docs tests passed');

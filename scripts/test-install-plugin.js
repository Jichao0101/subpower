'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { installPlugin, shouldSkip } = require('./install-plugin');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'subpower-install-test-'));

assert.throws(() => installPlugin(['--scope', 'repo']), /--target is required/);

const dryRunTarget = path.join(tmp, 'dry-run-plugin');
const dryRun = installPlugin(['--scope', 'repo', '--target', dryRunTarget, '--dry-run']);
assert.strictEqual(dryRun.ok, true);
assert.strictEqual(fs.existsSync(dryRunTarget), false);

const target = path.join(tmp, 'repo-plugin');
const installed = installPlugin(['--scope', 'repo', '--target', target]);
assert.strictEqual(installed.ok, true);
assert.strictEqual(fs.existsSync(path.join(target, '.codex-plugin', 'plugin.json')), true);
assert.strictEqual(fs.existsSync(path.join(target, 'agents')), true);
assert.strictEqual(fs.existsSync(path.join(target, 'contracts')), true);
assert.strictEqual(fs.existsSync(path.join(target, 'fixtures')), true);
assert.strictEqual(
  fs.existsSync(path.join(target, 'fixtures', 'bugfix-board-failure-rework', 'task_profile.json')),
  true,
  'installed copy must include regression fixtures used by scripts/subpower.js test'
);
assert.strictEqual(fs.existsSync(path.join(target, 'subpower-plugin-manifest.json')), true);
const manifest = JSON.parse(fs.readFileSync(path.join(target, 'subpower-plugin-manifest.json'), 'utf8'));
assert.strictEqual(manifest.plugin_id, 'subpower');
assert.strictEqual(typeof manifest.source_commit, 'string');
assert.strictEqual(manifest.files.some((item) => item.startsWith(path.join('.subpower', 'run'))), false);

assert.throws(() => installPlugin(['--scope', 'repo', '--target', target]), /target already exists/);

const forced = installPlugin(['--scope', 'repo', '--target', target, '--force']);
assert.strictEqual(forced.ok, true);
assert.strictEqual(fs.existsSync(path.join(target, '.codex-plugin', 'plugin.json')), true);
assert.strictEqual(fs.existsSync(path.join(target, 'subpower-plugin-manifest.json')), true);

assert.strictEqual(shouldSkip(path.join('.subpower', 'run', 's1', 'x.json')), true);
assert.strictEqual(shouldSkip(path.join('node_modules', 'x')), true);
assert.strictEqual(forced.copied.some((item) => item.startsWith(path.join('.subpower', 'run'))), false);
assert.strictEqual(fs.existsSync(path.join(dryRunTarget, 'subpower-plugin-manifest.json')), false);

console.log('install plugin tests passed');

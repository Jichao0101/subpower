'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildRuntimeReport } = require('./runtime-report');
const { copyFixtureToRunDir } = require('./run-artifacts');

const ROOT = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'subpower-report-'));
const runDir = path.join(tmp, 'run');
copyFixtureToRunDir(path.join(ROOT, 'fixtures', 'bugfix-board-failure-rework'), runDir, { route: 'coder_rework' });

const report = buildRuntimeReport(runDir);
assert.strictEqual(report.ok, false);
assert.strictEqual(report.gates.route.gate_result, 'ready');
assert.strictEqual(report.gates.evidence.gate_result, 'ready');
assert(report.blocked.includes('closure'));
assert(report.recommendations.includes('closure has blockers'));

const empty = buildRuntimeReport(path.join(tmp, 'empty'));
assert.strictEqual(empty.ok, false);
assert.strictEqual(empty.gates.route.gate_result, 'blocked');

console.log('runtime report tests passed');

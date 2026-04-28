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
assert(Array.isArray(report.next_structural_actions));
assert(Array.isArray(report.route_rounds));

const empty = buildRuntimeReport(path.join(tmp, 'empty'));
assert.strictEqual(empty.ok, false);
assert.strictEqual(empty.gates.route.gate_result, 'blocked');
assert(empty.next_structural_actions.some((item) => item.action === 'create_board_target'));

const failedRun = path.join(tmp, 'failed-missing-review');
fs.mkdirSync(failedRun);
fs.copyFileSync(
  path.join(ROOT, 'fixtures', 'bugfix-board-failure-rework', 'board_validation_result.failed.json'),
  path.join(failedRun, 'board_validation_result.json')
);
const failedReport = buildRuntimeReport(failedRun);
assert(failedReport.next_structural_actions.some((item) => item.action === 'create_board_failure_review'));

console.log('runtime report tests passed');

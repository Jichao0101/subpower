'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  artifactStatus,
  copyFixtureToRunDir,
  listArtifacts,
  normalizeFixtureArtifactName,
  writeArtifact,
  writeRunReport,
} = require('./run-artifacts');

const ROOT = path.resolve(__dirname, '..');
const fixture = path.join(ROOT, 'fixtures', 'bugfix-board-failure-rework');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'subpower-lifecycle-'));

const runDir = path.join(tmp, 'run');
writeArtifact(runDir, 'task_profile', { session_id: 's1', producer_agent: 'workflow-1', primary_type: 'bug_fix', task_goal: 'x' });
assert.deepStrictEqual(listArtifacts(runDir), ['task_profile']);
assert.deepStrictEqual(artifactStatus(runDir, ['task_profile', 'evidence_manifest']).missing, ['evidence_manifest']);

assert.strictEqual(normalizeFixtureArtifactName('side_state.initial.json'), 'side_state.json');
assert.strictEqual(normalizeFixtureArtifactName('board_failure_review.plan_mismatch.json', { route: 'planner_rework' }), 'board_failure_review.json');
assert.throws(() => normalizeFixtureArtifactName('../x.json'), /unsafe fixture file name/);

const demoDir = path.join(tmp, 'demo');
const copied = copyFixtureToRunDir(fixture, demoDir, { route: 'coder_rework' });
assert(copied.copied.includes('main_route_decision.json'));
assert(listArtifacts(demoDir).includes('board_failure_review'));
assert.throws(() => copyFixtureToRunDir(fixture, demoDir), /target already exists/);

const reportPath = writeRunReport(demoDir, path.join(tmp, 'report.json'));
assert.strictEqual(fs.existsSync(reportPath), true);

console.log('run artifact lifecycle tests passed');

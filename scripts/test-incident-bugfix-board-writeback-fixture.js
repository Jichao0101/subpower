'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validate } = require('./schema-validator');
const { buildRuntimeReport } = require('./runtime-report');
const { gateClosure, gateRoute, gateWriteback } = require('./runtime-gates');
const { writeArtifact } = require('./run-artifacts');
const { expectReady } = require('./test-helpers');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = path.join(ROOT, 'fixtures', 'incident-bugfix-board-writeback');

function artifactName(fileName) {
  return fileName
    .slice(0, -'.json'.length)
    .replace(/\.(failed|passed|round1|final|rework)$/, '');
}

function read(fileName) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE, fileName), 'utf8'));
}

function tempRun(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

for (const fileName of fs.readdirSync(FIXTURE).filter((name) => name.endsWith('.json')).sort()) {
  const artifact = artifactName(fileName);
  const schemaPath = path.join(ROOT, 'schemas', 'run-artifacts', `${artifact}.schema.json`);
  assert.strictEqual(fs.existsSync(schemaPath), true, `${fileName}: missing schema ${artifact}`);
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  assert.deepStrictEqual(validate(read(fileName), schema), [], fileName);
}

const fixtureText = fs.readdirSync(FIXTURE)
  .map((name) => fs.readFileSync(path.join(FIXTURE, name), 'utf8'))
  .join('\n');
assert(!/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(fixtureText), 'fixture must not contain real-looking IP addresses');
for (const token of ['/home/', '/mnt/', '/userdata/', '/Users/', '/Knowledge-Base/', 'C:\\\\']) {
  assert.strictEqual(fixtureText.includes(token), false, `fixture must not contain real path token ${token}`);
}

{
  const run = tempRun('subpower-incident-board-route');
  writeArtifact(run, 'subagent_execution_status', read('subagent_execution_status.json'));
  writeArtifact(run, 'agent_invocation_manifest', read('agent_invocation_manifest.json'));
  writeArtifact(run, 'board_validation_result', read('board_validation_result.failed.json'));
  writeArtifact(run, 'evidence_manifest', read('evidence_manifest.json'));
  writeArtifact(run, 'board_failure_review', read('board_failure_review.json'));
  writeArtifact(run, 'main_route_decision', read('main_route_decision.json'));
  writeArtifact(run, 'route_history', read('route_history.round1.json'));
  expectReady(gateRoute(run));
  const report = buildRuntimeReport(run);
  assert(report.route_rounds.some((round) => round.route === 'planner_rework'));
}

{
  const run = tempRun('subpower-incident-board-writeback');
  writeArtifact(run, 'subagent_execution_status', read('subagent_execution_status.json'));
  writeArtifact(run, 'agent_invocation_manifest', read('agent_invocation_manifest.json'));
  writeArtifact(run, 'board_validation_result', read('board_validation_result.passed.json'));
  writeArtifact(run, 'evidence_manifest', read('evidence_manifest.json'));
  writeArtifact(run, 'review_decision', read('review_decision.rework.json'));
  writeArtifact(run, 'route_history', read('route_history.final.json'));
  writeArtifact(run, 'closure_matrix', read('closure_matrix.json'));
  writeArtifact(run, 'knowledge_writeback_candidate', read('knowledge_writeback_candidate.json'));
  writeArtifact(run, 'writeback_plan', read('writeback_plan.json'));
  writeArtifact(run, 'writeback_receipt', read('writeback_receipt.json'));
  expectReady(gateClosure(run));
  expectReady(gateWriteback(run));
  const report = buildRuntimeReport(run);
  assert(report.ready.includes('closure'));
  assert(report.ready.includes('writeback'));
}

console.log('incident bugfix board writeback fixture tests passed');

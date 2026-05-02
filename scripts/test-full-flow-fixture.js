'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validate } = require('./schema-validator');
const { gateClosure, gateRoute } = require('./runtime-gates');
const { writeArtifact } = require('./run-artifacts');
const { expectBlocked, expectReady } = require('./test-helpers');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = path.join(ROOT, 'fixtures', 'full-flow-board-log-rework-closure');

function artifactName(fileName) {
  return fileName.slice(0, -'.json'.length).replace(/\.(round1|round2|failed|passed|plan_mismatch|planner_rework|final)$/, '');
}

function read(fileName) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE, fileName), 'utf8'));
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
for (const token of ['/home/', '/mnt/', '/userdata/', '/Users/', 'C:\\\\']) {
  assert.strictEqual(fixtureText.includes(token), false, `fixture must not contain real path token ${token}`);
}
assert(fixtureText.includes('/logs/example/'), 'fixture should use example log paths');

function tempRun(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

function writeRound1Base(runDir) {
  writeArtifact(runDir, 'subagent_execution_status', read('subagent_execution_status.json'));
  writeArtifact(runDir, 'agent_invocation_manifest', read('agent_invocation_manifest.json'));
  writeArtifact(runDir, 'board_session', read('board_session.round1.json'));
  writeArtifact(runDir, 'board_validation_result', read('board_validation_result.failed.json'));
  writeArtifact(runDir, 'evidence_manifest', read('evidence_manifest.final.json'));
  writeArtifact(runDir, 'main_route_decision', read('main_route_decision.planner_rework.json'));
}

{
  const run = tempRun('subpower-full-flow-missing-assessment');
  writeRound1Base(run);
  expectBlocked(gateRoute(run), 'missing_required_artifacts');
}

{
  const run = tempRun('subpower-full-flow-planner-route');
  writeRound1Base(run);
  writeArtifact(run, 'board_failure_review', read('board_failure_review.plan_mismatch.json'));
  writeArtifact(run, 'route_history', read('route_history.round1.json'));
  expectReady(gateRoute(run));
}

{
  const run = tempRun('subpower-full-flow-round1-no-close');
  writeArtifact(run, 'subagent_execution_status', read('subagent_execution_status.json'));
  writeArtifact(run, 'agent_invocation_manifest', read('agent_invocation_manifest.json'));
  writeArtifact(run, 'board_session', read('board_session.round1.json'));
  writeArtifact(run, 'board_validation_result', read('board_validation_result.failed.json'));
  writeArtifact(run, 'evidence_manifest', read('evidence_manifest.final.json'));
  writeArtifact(run, 'review_decision', read('review_decision.round1.json'));
  writeArtifact(run, 'route_history', read('route_history.round1.json'));
  writeArtifact(run, 'closure_matrix', read('closure_matrix.passed.json'));
  expectBlocked(gateClosure(run), 'cannot_pass_close_failed_board_validation');
}

{
  const run = tempRun('subpower-full-flow-closure');
  writeArtifact(run, 'subagent_execution_status', read('subagent_execution_status.json'));
  writeArtifact(run, 'agent_invocation_manifest', read('agent_invocation_manifest.json'));
  writeArtifact(run, 'board_session', read('board_session.round2.json'));
  writeArtifact(run, 'board_validation_result', read('board_validation_result.passed.json'));
  writeArtifact(run, 'evidence_manifest', read('evidence_manifest.final.json'));
  writeArtifact(run, 'review_decision', read('review_decision.round2.json'));
  writeArtifact(run, 'route_history', read('route_history.final.json'));
  writeArtifact(run, 'closure_matrix', read('closure_matrix.passed.json'));
  expectReady(gateClosure(run));
}

const history = read('route_history.round1.json');
assert.strictEqual(history.routes.length, 1);
assert.strictEqual(history.routes[0].round, 1);
assert.strictEqual(history.routes[0].route, 'planner_rework');

console.log('full-flow fixture tests passed');

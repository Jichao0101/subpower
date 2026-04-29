'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validate } = require('./schema-validator');
const { writeArtifact } = require('./run-artifacts');
const { gateClosure, gateRoute } = require('./runtime-gates');
const { expectBlocked, expectReady } = require('./test-helpers');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = path.join(ROOT, 'fixtures', 'bugfix-board-failure-rework');

function read(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE, name), 'utf8'));
}

function validateFixture(file, artifactName) {
  const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'schemas', 'run-artifacts', `${artifactName}.schema.json`), 'utf8'));
  assert.deepStrictEqual(validate(read(file), schema), [], file);
}

const fixtureSchemas = {
  'task_profile.json': 'task_profile',
  'workflow_plan.json': 'workflow_plan',
  'side_state.initial.json': 'side_state',
  'implementation_plan.json': 'implementation_plan',
  'code_change_manifest.json': 'code_change_manifest',
  'review_decision.json': 'review_decision',
  'board_target.json': 'board_target',
  'board_session.json': 'board_session',
  'board_validation_result.failed.json': 'board_validation_result',
  'evidence_manifest.json': 'evidence_manifest',
  'board_failure_review.implementation_defect.json': 'board_failure_review',
  'board_failure_review.plan_mismatch.json': 'board_failure_review',
  'main_route_decision.coder_rework.json': 'main_route_decision',
  'main_route_decision.planner_rework.json': 'main_route_decision',
  'route_history.coder_rework.json': 'route_history',
  'route_history.planner_rework.json': 'route_history',
  'closure_matrix.blocked.json': 'closure_matrix'
};

for (const [file, artifactName] of Object.entries(fixtureSchemas)) {
  validateFixture(file, artifactName);
}

function runDir(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

function writeCommon(run) {
  writeArtifact(run, 'board_validation_result', read('board_validation_result.failed.json'));
  writeArtifact(run, 'evidence_manifest', read('evidence_manifest.json'));
}

{
  const run = runDir('subpower-fixture-no-assessment');
  writeCommon(run);
  writeArtifact(run, 'main_route_decision', read('main_route_decision.coder_rework.json'));
  expectBlocked(gateRoute(run), 'missing_required_artifacts');
}

{
  const run = runDir('subpower-fixture-failed-board-no-route-decision');
  writeCommon(run);
  writeArtifact(run, 'board_failure_review', read('board_failure_review.implementation_defect.json'));
  expectBlocked(gateRoute(run), 'missing_required_artifacts');
}

{
  const run = runDir('subpower-fixture-coder-rework');
  writeCommon(run);
  writeArtifact(run, 'board_failure_review', read('board_failure_review.implementation_defect.json'));
  writeArtifact(run, 'main_route_decision', read('main_route_decision.coder_rework.json'));
  writeArtifact(run, 'route_history', read('route_history.coder_rework.json'));
  expectReady(gateRoute(run));
}

{
  const run = runDir('subpower-fixture-planner-rework');
  writeCommon(run);
  writeArtifact(run, 'board_failure_review', read('board_failure_review.plan_mismatch.json'));
  writeArtifact(run, 'main_route_decision', read('main_route_decision.planner_rework.json'));
  writeArtifact(run, 'route_history', read('route_history.planner_rework.json'));
  expectReady(gateRoute(run));
}

{
  const run = runDir('subpower-fixture-closure-blocked');
  writeCommon(run);
  writeArtifact(run, 'review_decision', read('review_decision.json'));
  writeArtifact(run, 'board_failure_review', read('board_failure_review.implementation_defect.json'));
  writeArtifact(run, 'main_route_decision', read('main_route_decision.coder_rework.json'));
  writeArtifact(run, 'route_history', read('route_history.coder_rework.json'));
  writeArtifact(run, 'closure_matrix', read('closure_matrix.blocked.json'));
  expectBlocked(gateClosure(run), 'closure_has_blockers');
}

{
  const run = runDir('subpower-fixture-invalid-close-route');
  writeCommon(run);
  writeArtifact(run, 'board_failure_review', read('board_failure_review.implementation_defect.json'));
  const badRoute = {
    ...read('main_route_decision.coder_rework.json'),
    route: 'proceed_to_closure',
    reason: 'invalid closure attempt after failed board validation'
  };
  writeArtifact(run, 'main_route_decision', badRoute);
  expectBlocked(gateRoute(run), 'route_not_allowed_for_decision_point');
}

console.log('fixture tests passed');

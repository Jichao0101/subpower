'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { gateClosure, gateRoute } = require('./runtime-gates');
const { copyFixtureToRunDir, listArtifacts } = require('./run-artifacts');
const { expectBlocked, expectReady } = require('./test-helpers');

const ROOT = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'subpower-demo-'));
const fixture = path.join(ROOT, 'fixtures', 'bugfix-board-failure-rework');

const coderRun = path.join(tmp, 'coder');
copyFixtureToRunDir(fixture, coderRun, { route: 'coder_rework' });
for (const artifact of ['side_state', 'board_validation_result', 'board_failure_review', 'main_route_decision', 'closure_matrix']) {
  assert(listArtifacts(coderRun).includes(artifact), artifact);
}
expectReady(gateRoute(coderRun));
expectBlocked(gateClosure(coderRun), 'closure_has_blockers');

const plannerRun = path.join(tmp, 'planner');
copyFixtureToRunDir(fixture, plannerRun, { route: 'planner_rework' });
expectReady(gateRoute(plannerRun));

assert.throws(() => copyFixtureToRunDir(fixture, path.join(tmp, 'bad'), { route: 'unknown' }), /unknown demo route/);

assert.throws(() => copyFixtureToRunDir(fixture, coderRun, { route: 'coder_rework' }), /target already exists/);

console.log('demo tests passed');

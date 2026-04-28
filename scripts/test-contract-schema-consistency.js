'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { readJson } = require('./run-artifacts');

const ROOT = path.resolve(__dirname, '..');
const contracts = (name) => readJson(path.join(ROOT, 'contracts', name));

const artifactRequirements = contracts('artifact-requirements.yaml').artifacts;
for (const artifact of Object.keys(artifactRequirements)) {
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'schemas', 'run-artifacts', `${artifact}.schema.json`)), true, artifact);
}

const roles = contracts('role-contracts.yaml').roles;
for (const role of roles) {
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'agents', `${role.role_id}.toml`)), true, role.role_id);
}

const decisionPoints = new Set(contracts('decision-points.yaml').decision_points.map((point) => point.decision_point_id));
const routes = new Set(contracts('route-policy.yaml').routes);
for (const workflow of contracts('workflow-patterns.yaml').workflows) {
  for (const point of workflow.decision_points || []) {
    assert(decisionPoints.has(point), `${workflow.workflow_id}: ${point}`);
  }
  for (const participant of ['failure-analyst', 'verification-manager', 'knowledge-closer']) {
    assert(!(workflow.default_steps || []).includes(participant), `${participant} must not be in default steps`);
  }
}

for (const point of contracts('decision-points.yaml').decision_points) {
  for (const route of point.allowed_routes || []) {
    assert(routes.has(route), `${point.decision_point_id}: ${route}`);
  }
}

const roleActions = new Set();
for (const role of roles) {
  for (const action of role.allowed_actions || []) roleActions.add(action);
  for (const action of role.denied_actions || []) roleActions.add(action);
}
for (const actions of Object.values(contracts('gate-matrix.yaml').phase_actions)) {
  for (const action of actions) {
    assert(roleActions.has(action), `unknown gate action: ${action}`);
  }
}

console.log('contract schema consistency tests passed');

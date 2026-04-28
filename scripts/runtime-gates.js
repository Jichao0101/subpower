'use strict';

const fs = require('fs');
const path = require('path');
const {
  hasArtifact,
  readArtifact,
  readJson,
} = require('./run-artifacts');
const { validate } = require('./schema-validator');

const ROOT = path.resolve(__dirname, '..');

function loadContract(name) {
  return readJson(path.join(ROOT, 'contracts', name));
}

function verdict(gate, ready, reason, extra = {}) {
  return {
    gate,
    gate_result: ready ? 'ready' : 'blocked',
    reason,
    ...extra,
  };
}

function getRole(roleId) {
  const contract = loadContract('role-contracts.yaml');
  return contract.roles.find((role) => role.role_id === roleId);
}

function getDecisionPoint(decisionPointId) {
  const contract = loadContract('decision-points.yaml');
  return contract.decision_points.find((point) => point.decision_point_id === decisionPointId);
}

function artifactRequirements() {
  return loadContract('artifact-requirements.yaml').artifacts;
}

function validateArtifactShape(runDir, artifactName) {
  if (!hasArtifact(runDir, artifactName)) {
    return verdict('schema_gate', false, `missing_${artifactName}`);
  }
  const schemaPath = path.join(ROOT, 'schemas', 'run-artifacts', `${artifactName}.schema.json`);
  if (!fs.existsSync(schemaPath)) {
    return verdict('schema_gate', false, `unknown_artifact_${artifactName}`);
  }
  const value = readArtifact(runDir, artifactName);
  const schema = readJson(schemaPath);
  const errors = validate(value, schema);
  if (errors.length > 0) {
    return verdict('schema_gate', false, 'schema_validation_failed', { artifact: artifactName, errors });
  }
  return verdict('schema_gate', true, 'artifact_schema_ready', { artifact: artifactName });
}

function gateAction({ roleId, phase, action }) {
  const role = getRole(roleId);
  if (!role) {
    return verdict('role_gate', false, 'unknown_role');
  }
  if (!role.allowed_actions.includes(action)) {
    return verdict('role_gate', false, 'action_not_allowed_for_role', { role_id: roleId, action });
  }

  const gateMatrix = loadContract('gate-matrix.yaml');
  const allowedInPhase = gateMatrix.phase_actions[phase] || [];
  if (!allowedInPhase.includes(action)) {
    return verdict('phase_gate', false, 'action_not_allowed_in_phase', { phase, action });
  }

  return verdict('role_phase_gate', true, 'action_allowed', { role_id: roleId, phase, action });
}

function requireArtifacts(runDir, artifactNames, gate = 'artifact_gate') {
  const missing = artifactNames.filter((name) => !hasArtifact(runDir, name));
  if (missing.length > 0) {
    return verdict(gate, false, 'missing_required_artifacts', { missing });
  }
  return verdict(gate, true, 'required_artifacts_present', { artifacts: artifactNames });
}

function gateBoardExecution(runDir) {
  if (!hasArtifact(runDir, 'board_target')) {
    if (!hasArtifact(runDir, 'prompt_context')) {
      return verdict('board_target_gate', false, 'missing_required_artifacts', { missing: ['board_target'] });
    }
    const promptShape = validateArtifactShape(runDir, 'prompt_context');
    if (promptShape.gate_result !== 'ready') {
      return promptShape;
    }
    const prompt = readArtifact(runDir, 'prompt_context');
    const boardContext = prompt.board_context || {};
    const hasTargetMaterial = Boolean(boardContext.target_id)
      || (Array.isArray(boardContext.log_paths) && boardContext.log_paths.length > 0)
      || (Array.isArray(boardContext.collect_paths) && boardContext.collect_paths.length > 0);
    const hasExpectedMaterial = Boolean(prompt.expected_behavior)
      || (Array.isArray(prompt.validation_criteria) && prompt.validation_criteria.length > 0);
    if (boardContext.provided !== true || !hasTargetMaterial || !hasExpectedMaterial) {
      return verdict('board_target_gate', false, 'missing_board_target_context');
    }
    return verdict('board_target_gate', true, 'prompt_board_context_ready');
  }
  const shape = validateArtifactShape(runDir, 'board_target');
  if (shape.gate_result !== 'ready') {
    return shape;
  }
  const target = readArtifact(runDir, 'board_target');
  const hasTargetMaterial = Boolean(target.target_id)
    || (Array.isArray(target.log_paths) && target.log_paths.length > 0)
    || (Array.isArray(target.collect_paths) && target.collect_paths.length > 0);
  const hasExpectedMaterial = Boolean(target.expected_behavior)
    || (Array.isArray(target.validation_criteria) && target.validation_criteria.length > 0);
  if (!hasTargetMaterial) {
    return verdict('board_target_gate', false, 'missing_board_target_material');
  }
  if (!hasExpectedMaterial) {
    return verdict('board_target_gate', false, 'missing_board_expected_behavior');
  }
  return verdict('board_target_gate', true, 'board_target_ready');
}

function findInvocation(manifest, producerAgent) {
  return (manifest.invocations || []).find((invocation) => (
    invocation.invocation_id === producerAgent || invocation.agent_id === producerAgent
  ));
}

function gateReviewIndependence(runDir) {
  const required = requireArtifacts(runDir, ['agent_invocation_manifest', 'code_change_manifest', 'review_decision'], 'independence_gate');
  if (required.gate_result !== 'ready') {
    return required;
  }
  const manifest = readArtifact(runDir, 'agent_invocation_manifest');
  const changes = readArtifact(runDir, 'code_change_manifest');
  const review = readArtifact(runDir, 'review_decision');
  const implementer = findInvocation(manifest, changes.producer_agent);
  const reviewer = findInvocation(manifest, review.producer_agent);

  if (!reviewer || reviewer.role_id !== 'repo-reviewer') {
    return verdict('independence_gate', false, 'review_decision_not_produced_by_repo_reviewer');
  }
  if (!implementer || implementer.role_id !== 'repo-implementer') {
    return verdict('independence_gate', false, 'code_change_manifest_not_produced_by_repo_implementer');
  }
  if (implementer.invocation_id === reviewer.invocation_id || implementer.agent_id === reviewer.agent_id) {
    return verdict('independence_gate', false, 'implementer_and_reviewer_not_independent');
  }
  return verdict('independence_gate', true, 'reviewer_independent');
}

function gateRoute(runDir) {
  const required = requireArtifacts(runDir, ['main_route_decision'], 'route_gate');
  if (required.gate_result !== 'ready') {
    return required;
  }
  const shape = validateArtifactShape(runDir, 'main_route_decision');
  if (shape.gate_result !== 'ready') {
    return shape;
  }
  const decision = readArtifact(runDir, 'main_route_decision');
  const point = getDecisionPoint(decision.decision_point_id);
  if (!point) {
    return verdict('route_gate', false, 'unknown_decision_point');
  }
  if (!point.allowed_routes.includes(decision.route)) {
    return verdict('route_gate', false, 'route_not_allowed_for_decision_point', {
      decision_point_id: decision.decision_point_id,
      route: decision.route,
    });
  }
  const artifacts = Array.from(new Set([...point.required_artifacts, ...(decision.based_on_artifacts || [])]));
  const artifactGate = requireArtifacts(runDir, artifacts, 'route_gate');
  if (artifactGate.gate_result !== 'ready') {
    return artifactGate;
  }
  if (decision.decision_point_id === 'board_validation_failed') {
    const result = readArtifact(runDir, 'board_validation_result');
    if (result.status !== 'failed') {
      return verdict('route_gate', false, 'board_validation_failed_route_requires_failed_result');
    }
    const assessmentShape = validateArtifactShape(runDir, 'board_failure_review');
    if (assessmentShape.gate_result !== 'ready') {
      return assessmentShape;
    }
    const assessment = readArtifact(runDir, 'board_failure_review');
    if (assessment.recommended_next !== decision.route) {
      return verdict('route_gate', false, 'route_does_not_match_reviewer_recommendation');
    }
  }
  if (hasArtifact(runDir, 'route_history')) {
    const historyShape = validateArtifactShape(runDir, 'route_history');
    if (historyShape.gate_result !== 'ready') {
      return historyShape;
    }
    const history = readArtifact(runDir, 'route_history');
    const found = (history.routes || []).some((route) => (
      route.decision_point_id === decision.decision_point_id
      && route.assessor_artifact === decision.assessor_artifact
      && route.route === decision.route
      && route.reason === decision.reason
    ));
    if (!found) {
      return verdict('route_gate', false, 'route_history_missing_decision');
    }
  }
  return verdict('route_gate', true, 'route_allowed');
}

function gateEvidence(runDir) {
  const required = requireArtifacts(runDir, ['evidence_manifest'], 'evidence_gate');
  if (required.gate_result !== 'ready') {
    return required;
  }
  const shape = validateArtifactShape(runDir, 'evidence_manifest');
  if (shape.gate_result !== 'ready') {
    return shape;
  }
  const evidence = readArtifact(runDir, 'evidence_manifest');
  if (!Array.isArray(evidence.evidence) || evidence.evidence.length === 0) {
    return verdict('evidence_gate', false, 'evidence_manifest_empty');
  }
  return verdict('evidence_gate', true, 'evidence_ready');
}

function gateClosure(runDir) {
  const required = requireArtifacts(runDir, ['evidence_manifest', 'closure_matrix'], 'closure_gate');
  if (required.gate_result !== 'ready') {
    return required;
  }
  const closureShape = validateArtifactShape(runDir, 'closure_matrix');
  if (closureShape.gate_result !== 'ready') {
    return closureShape;
  }
  const evidenceGate = gateEvidence(runDir);
  if (evidenceGate.gate_result !== 'ready') {
    return evidenceGate;
  }
  const closure = readArtifact(runDir, 'closure_matrix');
  const missing = (closure.required_artifacts || []).filter((name) => !hasArtifact(runDir, name));
  if (missing.length > 0) {
    return verdict('closure_gate', false, 'closure_required_artifacts_missing', { missing });
  }
  if (Array.isArray(closure.blockers) && closure.blockers.length > 0) {
    return verdict('closure_gate', false, 'closure_has_blockers', { blockers: closure.blockers });
  }
  if (hasArtifact(runDir, 'board_validation_result')) {
    const board = readArtifact(runDir, 'board_validation_result');
    if (board.status === 'failed' && closure.close_allowed === true) {
      return verdict('closure_gate', false, 'cannot_pass_close_failed_board_validation');
    }
  }
  if (hasArtifact(runDir, 'main_route_decision')) {
    if (!hasArtifact(runDir, 'route_history')) {
      return verdict('closure_gate', false, 'route_history_required_after_decision_point');
    }
    const historyShape = validateArtifactShape(runDir, 'route_history');
    if (historyShape.gate_result !== 'ready') {
      return historyShape;
    }
  }
  if (closure.close_allowed !== true) {
    return verdict('closure_gate', false, 'closure_not_allowed');
  }
  return verdict('closure_gate', true, 'closure_ready');
}

function gateWriteback(runDir) {
  const required = requireArtifacts(runDir, ['evidence_manifest', 'review_decision', 'closure_matrix'], 'writeback_gate');
  if (required.gate_result !== 'ready') {
    return required;
  }
  const closure = gateClosure(runDir);
  if (closure.gate_result !== 'ready') {
    return verdict('writeback_gate', false, closure.reason, closure);
  }
  const review = readArtifact(runDir, 'review_decision');
  if (review.decision !== 'approved') {
    return verdict('writeback_gate', false, 'writeback_requires_approved_review');
  }
  return verdict('writeback_gate', true, 'writeback_allowed');
}

if (require.main === module) {
  const [command, runDir] = process.argv.slice(2);
  const commands = {
    board: () => gateBoardExecution(runDir),
    independence: () => gateReviewIndependence(runDir),
    route: () => gateRoute(runDir),
    evidence: () => gateEvidence(runDir),
    closure: () => gateClosure(runDir),
    writeback: () => gateWriteback(runDir),
  };
  if (!commands[command]) {
    console.error('usage: node scripts/runtime-gates.js board|independence|route|evidence|closure|writeback <runDir>');
    process.exit(2);
  }
  const result = commands[command]();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.gate_result === 'ready' ? 0 : 1);
}

module.exports = {
  gateAction,
  gateBoardExecution,
  gateClosure,
  gateEvidence,
  gateReviewIndependence,
  gateRoute,
  gateWriteback,
  validateArtifactShape,
};

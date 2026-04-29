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
    return verdict('board_target_gate', false, 'missing_required_artifacts', { missing: ['board_target'] });
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

function producerRole(runDir, producerAgent) {
  if (!hasArtifact(runDir, 'agent_invocation_manifest')) return null;
  const manifest = readArtifact(runDir, 'agent_invocation_manifest');
  const invocation = findInvocation(manifest, producerAgent);
  return invocation ? invocation.role_id : null;
}

function indicatesSubpowerInvocation(value) {
  if (!value || typeof value !== 'object') return false;
  if (value.subpower_invoked === true) return true;
  if (value.execution_mode === 'subpower') return true;
  const phrase = String(value.subpower_invocation_phrase || '').toLowerCase();
  if (phrase.includes('subpower')) return true;
  return Array.isArray(value.task_modifiers) && value.task_modifiers.some((item) => String(item).toLowerCase().includes('subpower'));
}

function runIndicatesSubpower(runDir) {
  if (hasArtifact(runDir, 'subagent_execution_status')) {
    const status = readArtifact(runDir, 'subagent_execution_status');
    return status.subpower_invoked === true;
  }
  return ['prompt_context', 'task_profile', 'workflow_plan'].some((artifact) => {
    if (!hasArtifact(runDir, artifact)) return false;
    return indicatesSubpowerInvocation(readArtifact(runDir, artifact));
  });
}

function hasCompleteSubpowerClaim(value) {
  if (!value || typeof value !== 'object') return false;
  return value.completed_as_subagent_first_execution === true
    || value.completed_by_subpower === true
    || value.complete_subpower_execution === true;
}

function requireProducerRole(runDir, artifactName, allowedRoles) {
  if (!hasArtifact(runDir, artifactName)) return null;
  const artifact = readArtifact(runDir, artifactName);
  const role = producerRole(runDir, artifact.producer_agent);
  if (!role) {
    return verdict('subagent_execution_gate', false, 'insufficient_independence_evidence', { artifact: artifactName });
  }
  if (!allowedRoles.includes(role)) {
    return verdict('subagent_execution_gate', false, 'artifact_produced_by_wrong_role', {
      artifact: artifactName,
      role,
      allowed_roles: allowedRoles,
    });
  }
  return null;
}

function validateSubagentExecutionStatus(runDir) {
  if (runIndicatesSubpower(runDir) && !hasArtifact(runDir, 'subagent_execution_status')) {
    return verdict('subagent_execution_gate', false, 'missing_subagent_execution_status', {
      missing: ['subagent_execution_status'],
    });
  }
  if (!hasArtifact(runDir, 'subagent_execution_status')) {
    return verdict('subagent_execution_gate', true, 'subagent_execution_not_required');
  }
  const shape = validateArtifactShape(runDir, 'subagent_execution_status');
  if (shape.gate_result !== 'ready') return shape;

  const status = readArtifact(runDir, 'subagent_execution_status');
  const guarantee = status.independence_guarantee || {};
  if (status.subpower_invoked === true && status.subagent_execution_required !== true) {
    return verdict('subagent_execution_gate', false, 'subpower_invocation_requires_subagents');
  }
  if (status.subpower_invoked === true && status.subagent_execution_mode === 'not_required') {
    return verdict('subagent_execution_gate', false, 'subpower_invocation_cannot_be_not_required');
  }
  if (status.subagent_execution_mode === 'spawned_subagents' && status.degraded !== false) {
    return verdict('subagent_execution_gate', false, 'spawned_subagents_must_not_be_degraded');
  }
  if (status.subagent_execution_mode === 'host_only_fallback') {
    if (status.fallback_used !== true || status.degraded !== true) {
      return verdict('subagent_execution_gate', false, 'host_only_fallback_must_be_degraded');
    }
    if (!status.fallback_reason || !status.degradation_reason) {
      return verdict('subagent_execution_gate', false, 'host_only_fallback_requires_reasons');
    }
    if (
      guarantee.implementation_review_separated === true
      && guarantee.verification_separated_from_implementation === true
      && guarantee.writeback_assessment_separated === true
    ) {
      return verdict('subagent_execution_gate', false, 'host_only_fallback_cannot_claim_complete_independence');
    }
    if (hasArtifact(runDir, 'closure_matrix') && hasCompleteSubpowerClaim(readArtifact(runDir, 'closure_matrix'))) {
      return verdict('subagent_execution_gate', false, 'host_only_fallback_cannot_claim_complete_subpower_execution');
    }
    if (hasArtifact(runDir, 'closure_matrix')) {
      const closure = readArtifact(runDir, 'closure_matrix');
      if (
        closure.completed_under_subpower_contracts_with_host_only_fallback !== true
        || closure.degraded !== true
      ) {
        return verdict('subagent_execution_gate', false, 'host_only_fallback_requires_degraded_closure_claim');
      }
    }
  }
  if (status.subagent_execution_mode === 'not_required' && status.subpower_invoked === true) {
    return verdict('subagent_execution_gate', false, 'not_required_only_for_non_subpower');
  }
  if (status.subagent_execution_mode === 'spawned_subagents') {
    const requiredRoles = ['repo-implementer', 'repo-reviewer', 'verification-manager'];
    const missingRoles = requiredRoles.filter((role) => !status.spawned_roles.includes(role));
    if (missingRoles.length > 0) {
      return verdict('subagent_execution_gate', false, 'missing_required_spawned_roles', { missing_roles: missingRoles });
    }
    if (
      guarantee.implementation_review_separated !== true
      || guarantee.verification_separated_from_implementation !== true
      || guarantee.writeback_assessment_separated !== true
    ) {
      return verdict('subagent_execution_gate', false, 'spawned_subagents_requires_complete_independence_guarantee');
    }
    if (!hasArtifact(runDir, 'agent_invocation_manifest')) {
      return verdict('subagent_execution_gate', false, 'missing_agent_invocation_manifest');
    }
    for (const [artifact, roles] of [
      ['code_change_manifest', ['repo-implementer']],
      ['review_decision', ['repo-reviewer']],
      ['board_validation_result', ['board-runner']],
      ['board_failure_review', ['repo-reviewer', 'failure-analyst']],
      ['knowledge_writeback_candidate', ['knowledge-closer']],
    ]) {
      const roleVerdict = requireProducerRole(runDir, artifact, roles);
      if (roleVerdict) return roleVerdict;
    }
    if (hasArtifact(runDir, 'code_change_manifest') && hasArtifact(runDir, 'review_decision')) {
      const changes = readArtifact(runDir, 'code_change_manifest');
      const review = readArtifact(runDir, 'review_decision');
      if (changes.producer_agent === review.producer_agent) {
        return verdict('subagent_execution_gate', false, 'implementation_review_actor_not_separated');
      }
    }
  }
  return verdict('subagent_execution_gate', true, 'subagent_execution_ready');
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
    const assessmentRole = producerRole(runDir, assessment.producer_agent);
    if (assessmentRole && !['repo-reviewer', 'failure-analyst'].includes(assessmentRole)) {
      return verdict('route_gate', false, 'board_failure_review_produced_by_wrong_role', {
        role: assessmentRole,
        allowed_roles: ['repo-reviewer', 'failure-analyst'],
      });
    }
    if (assessment.recommended_route && assessment.recommended_next && assessment.recommended_route !== assessment.recommended_next) {
      return verdict('route_gate', false, 'board_failure_recommendation_mismatch');
    }
    const recommendedRoute = assessment.recommended_route || assessment.recommended_next;
    if (recommendedRoute !== decision.route) {
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

function hasEvidenceRefs(value) {
  return Array.isArray(value.evidence_refs) && value.evidence_refs.length > 0;
}

function claimClassification(claim) {
  if (claim.claim_classification) return claim.claim_classification;
  if (claim.verification_status === 'verified') return 'verified_runtime_fact';
  return 'unverified_claim';
}

function writebackClaimVerdict(candidate, terminalArtifact) {
  const claims = Array.isArray(candidate.claims) ? candidate.claims : [];
  for (const claim of claims) {
    const classification = claimClassification(claim);
    if (!hasEvidenceRefs(claim)) {
      return verdict('writeback_gate', false, 'writeback_requires_evidence_refs');
    }
    if (classification === 'unverified_claim' && terminalArtifact !== 'writeback_declined') {
      return verdict('writeback_gate', false, 'unverified_claim_must_be_declined');
    }
    if (classification === 'temporary_observation' && terminalArtifact !== 'writeback_declined') {
      return verdict('writeback_gate', false, 'temporary_observation_cannot_enter_long_term_knowledge');
    }
    if (
      terminalArtifact !== 'writeback_declined'
      &&
      candidate.target_scope === 'current_knowledge'
      && !['verified_runtime_fact', 'project_decision'].includes(classification)
    ) {
      return verdict('writeback_gate', false, 'claim_classification_not_allowed_for_current_knowledge');
    }
  }
  return null;
}

function containsForbiddenKnowledgePath(value) {
  if (typeof value === 'string') {
    return value.includes('/Knowledge-Base/')
      || value.startsWith('/mnt/')
      || value.startsWith('/home/')
      || value.startsWith('/Users/')
      || /^[A-Za-z]:\\/.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenKnowledgePath(item));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => containsForbiddenKnowledgePath(item));
  }
  return false;
}

function gateClosure(runDir) {
  const subagentGate = validateSubagentExecutionStatus(runDir);
  if (subagentGate.gate_result !== 'ready') {
    return verdict('closure_gate', false, subagentGate.reason, subagentGate);
  }
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
  if (hasArtifact(runDir, 'code_change_manifest') && !hasArtifact(runDir, 'review_decision')) {
    return verdict('closure_gate', false, 'closure_requires_review_decision_for_repo_changes');
  }
  if (hasArtifact(runDir, 'code_change_manifest') && hasArtifact(runDir, 'review_decision') && hasArtifact(runDir, 'agent_invocation_manifest')) {
    const independence = gateReviewIndependence(runDir);
    if (independence.gate_result !== 'ready') {
      return verdict('closure_gate', false, independence.reason, independence);
    }
  }
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
  const subagentGate = validateSubagentExecutionStatus(runDir);
  if (subagentGate.gate_result !== 'ready') {
    return verdict('writeback_gate', false, subagentGate.reason, subagentGate);
  }
  const required = requireArtifacts(
    runDir,
    ['evidence_manifest', 'review_decision', 'closure_matrix', 'knowledge_writeback_candidate', 'writeback_plan'],
    'writeback_gate'
  );
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
  for (const artifact of ['knowledge_writeback_candidate', 'writeback_plan']) {
    const shape = validateArtifactShape(runDir, artifact);
    if (shape.gate_result !== 'ready') {
      return shape;
    }
  }
  const candidate = readArtifact(runDir, 'knowledge_writeback_candidate');
  const plan = readArtifact(runDir, 'writeback_plan');
  if (!hasEvidenceRefs(candidate) || !hasEvidenceRefs(plan)) {
    return verdict('writeback_gate', false, 'writeback_requires_evidence_refs');
  }
  if (candidate.target_scope !== plan.target_scope) {
    return verdict('writeback_gate', false, 'writeback_plan_scope_mismatch');
  }
  if (containsForbiddenKnowledgePath(candidate) || containsForbiddenKnowledgePath(plan)) {
    return verdict('writeback_gate', false, 'external_knowledge_path_forbidden');
  }
  if (!hasArtifact(runDir, 'writeback_receipt') && !hasArtifact(runDir, 'writeback_declined')) {
    return verdict('writeback_gate', false, 'missing_writeback_terminal_artifact', {
      missing: ['writeback_receipt_or_writeback_declined'],
    });
  }
  const terminalArtifact = hasArtifact(runDir, 'writeback_declined') ? 'writeback_declined' : 'writeback_receipt';
  const claimVerdict = writebackClaimVerdict(candidate, terminalArtifact);
  if (claimVerdict) {
    return claimVerdict;
  }
  if (hasArtifact(runDir, 'writeback_receipt')) {
    const claims = Array.isArray(candidate.claims) ? candidate.claims : [];
    if (candidate.target_scope === 'current_knowledge' && claims.some((claim) => claim.verification_status !== 'verified')) {
      return verdict('writeback_gate', false, 'unverified_claims_cannot_enter_current_knowledge');
    }
    const receiptShape = validateArtifactShape(runDir, 'writeback_receipt');
    if (receiptShape.gate_result !== 'ready') {
      return receiptShape;
    }
    const receipt = readArtifact(runDir, 'writeback_receipt');
    if (!hasEvidenceRefs(receipt)) {
      return verdict('writeback_gate', false, 'writeback_requires_evidence_refs');
    }
    if (receipt.external_write_performed_by_subpower !== false) {
      return verdict('writeback_gate', false, 'subpower_must_not_write_external_knowledge_base');
    }
    if (containsForbiddenKnowledgePath(receipt)) {
      return verdict('writeback_gate', false, 'external_knowledge_path_forbidden');
    }
  }
  if (hasArtifact(runDir, 'writeback_declined')) {
    const declinedShape = validateArtifactShape(runDir, 'writeback_declined');
    if (declinedShape.gate_result !== 'ready') {
      return declinedShape;
    }
    const declined = readArtifact(runDir, 'writeback_declined');
    if (!hasEvidenceRefs(declined)) {
      return verdict('writeback_gate', false, 'writeback_requires_evidence_refs');
    }
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
    subagents: () => validateSubagentExecutionStatus(runDir),
    writeback: () => gateWriteback(runDir),
  };
  if (!commands[command]) {
    console.error('usage: node scripts/runtime-gates.js board|independence|route|evidence|closure|subagents|writeback <runDir>');
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
  validateSubagentExecutionStatus,
  validateArtifactShape,
};

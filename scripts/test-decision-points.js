'use strict';

const { gateRoute } = require('./runtime-gates');
const {
  expectBlocked,
  expectReady,
  tempRunDir,
  writeArtifact,
} = require('./test-helpers');

{
  const runDir = tempRunDir('subpower-board-failed-no-review');
  writeArtifact(runDir, 'board_validation_result', {
    session_id: 's1',
    producer_agent: 'board-1',
    status: 'failed',
    evidence_refs: ['logs/board.log']
  });
  writeArtifact(runDir, 'evidence_manifest', {
    session_id: 's1',
    producer_agent: 'board-1',
    status: 'sufficient',
    evidence: [{ id: 'board-log', path: 'logs/board.log' }]
  });
  writeArtifact(runDir, 'main_route_decision', {
    session_id: 's1',
    producer_agent: 'workflow-1',
    decision_point_id: 'board_validation_failed',
    assessor_artifact: 'board_failure_review',
    route: 'coder_rework',
    reason: 'reviewer classified the failed board run as an implementation defect',
    based_on_artifacts: ['board_validation_result', 'evidence_manifest']
  });
  expectBlocked(gateRoute(runDir), 'missing_required_artifacts');
}

{
  const runDir = tempRunDir('subpower-illegal-route');
  writeArtifact(runDir, 'board_validation_result', {
    session_id: 's1',
    producer_agent: 'board-1',
    status: 'failed',
    evidence_refs: ['logs/board.log']
  });
  writeArtifact(runDir, 'evidence_manifest', {
    session_id: 's1',
    producer_agent: 'board-1',
    status: 'sufficient',
    evidence: [{ id: 'board-log', path: 'logs/board.log' }]
  });
  writeArtifact(runDir, 'board_failure_review', {
    session_id: 's1',
    producer_agent: 'review-1',
    failure_class: 'implementation_defect',
    recommended_next: 'coder_rework',
    confidence: 0.9,
    blocking_evidence: ['logs/board.log'],
    rationale: ['Observed failure maps to changed behavior.']
  });
  writeArtifact(runDir, 'main_route_decision', {
    session_id: 's1',
    producer_agent: 'workflow-1',
    decision_point_id: 'board_validation_failed',
    assessor_artifact: 'board_failure_review',
    route: 'proceed_to_closure',
    reason: 'invalid attempt to close after failed board validation',
    based_on_artifacts: ['board_validation_result', 'evidence_manifest', 'board_failure_review']
  });
  expectBlocked(gateRoute(runDir), 'route_not_allowed_for_decision_point');
}

{
  const runDir = tempRunDir('subpower-route-ready');
  writeArtifact(runDir, 'board_validation_result', {
    session_id: 's1',
    producer_agent: 'board-1',
    status: 'failed',
    evidence_refs: ['logs/board.log']
  });
  writeArtifact(runDir, 'evidence_manifest', {
    session_id: 's1',
    producer_agent: 'board-1',
    status: 'sufficient',
    evidence: [{ id: 'board-log', path: 'logs/board.log' }]
  });
  writeArtifact(runDir, 'board_failure_review', {
    session_id: 's1',
    producer_agent: 'review-1',
    failure_class: 'implementation_defect',
    recommended_next: 'coder_rework',
    confidence: 0.9,
    blocking_evidence: ['logs/board.log'],
    rationale: ['Observed failure maps to changed behavior.']
  });
  writeArtifact(runDir, 'main_route_decision', {
    session_id: 's1',
    producer_agent: 'workflow-1',
    decision_point_id: 'board_validation_failed',
    assessor_artifact: 'board_failure_review',
    route: 'coder_rework',
    reason: 'reviewer classified the failed board run as an implementation defect',
    based_on_artifacts: ['board_validation_result', 'evidence_manifest', 'board_failure_review']
  });
  expectReady(gateRoute(runDir));
}

console.log('decision point tests passed');

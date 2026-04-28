'use strict';

const path = require('path');
const { artifactStatus, hasArtifact, listArtifacts, readArtifact } = require('./run-artifacts');
const {
  gateBoardExecution,
  gateClosure,
  gateEvidence,
  gateReviewIndependence,
  gateRoute,
  gateWriteback,
} = require('./runtime-gates');

const EXPECTED = [
  'prompt_context',
  'task_profile',
  'workflow_plan',
  'workflow_state',
  'agent_invocation_manifest',
  'side_state',
  'handoff_packet',
  'incident_report',
  'root_cause_hypotheses',
  'next_workflow_recommendation',
  'implementation_plan',
  'code_change_manifest',
  'review_decision',
  'board_target',
  'board_validation_result',
  'board_failure_review',
  'main_route_decision',
  'route_history',
  'evidence_manifest',
  'closure_matrix',
];

function recommendationFor(name, verdict) {
  if (!verdict || verdict.gate_result === 'ready') return null;
  if (verdict.reason === 'missing_required_artifacts') return `missing ${verdict.missing.join(', ')}`;
  if (verdict.reason === 'closure_has_blockers') return 'closure has blockers';
  if (verdict.reason === 'evidence_manifest_empty') return 'evidence manifest empty';
  if (verdict.reason === 'route_does_not_match_reviewer_recommendation') return 'route does not match reviewer recommendation';
  return `${name}: ${verdict.reason}`;
}

function safeGate(fn, runDir) {
  try {
    return fn(runDir);
  } catch (error) {
    return { gate: 'runtime_report_gate', gate_result: 'blocked', reason: 'gate_exception', error: error.message };
  }
}

function action(actionName, recommendedRole, reason) {
  return {
    action: actionName,
    recommended_role: recommendedRole,
    reason,
  };
}

function readOptional(runDir, artifactName) {
  try {
    return readArtifact(runDir, artifactName);
  } catch (_error) {
    return null;
  }
}

function nextStructuralActions(runDir) {
  const actions = [];
  const boardResult = readOptional(runDir, 'board_validation_result');
  const boardTarget = readOptional(runDir, 'board_target');
  const promptContext = readOptional(runDir, 'prompt_context');
  const failureReview = readOptional(runDir, 'board_failure_review');
  const routeDecision = readOptional(runDir, 'main_route_decision');

  if (!boardTarget) {
    const promptBoardContext = promptContext && promptContext.board_context;
    const hasPromptTarget = promptBoardContext && promptBoardContext.provided === true && (
      promptBoardContext.target_id
      || (Array.isArray(promptBoardContext.log_paths) && promptBoardContext.log_paths.length > 0)
      || (Array.isArray(promptBoardContext.collect_paths) && promptBoardContext.collect_paths.length > 0)
    );
    if (!hasPromptTarget) {
      actions.push(action(
        'create_board_target',
        'knowledge-planner',
        'board validation needs board_target or prompt_context.board_context with provided board material'
      ));
    }
  }

  if (boardResult && boardResult.status === 'failed' && !failureReview) {
    actions.push(action(
      'create_board_failure_review',
      'repo-reviewer',
      'board_validation_result is failed and board_failure_review is missing'
    ));
  }

  if (boardResult && boardResult.status === 'failed' && failureReview && !routeDecision) {
    actions.push(action(
      'create_main_route_decision',
      'workflow-orchestrator',
      'board_failure_review exists but main_route_decision is missing'
    ));
  }

  if (routeDecision && !hasArtifact(runDir, 'route_history')) {
    actions.push(action(
      'append_route_history',
      'workflow-orchestrator',
      'main_route_decision exists and route_history is missing'
    ));
  }

  if (!hasArtifact(runDir, 'closure_matrix')) {
    actions.push(action(
      'create_closure_matrix',
      'workflow-orchestrator',
      'closure requires closure_matrix after evidence, review, board, and route state are known'
    ));
  }

  return actions;
}

function routeRounds(runDir) {
  const history = readOptional(runDir, 'route_history');
  if (!history || !Array.isArray(history.routes)) return [];
  return history.routes.map((item) => ({
    round: item.round,
    decision_point_id: item.decision_point_id,
    route: item.route,
    assessor_artifact: item.assessor_artifact,
  }));
}

function buildRuntimeReport(runDir) {
  const gates = {
    board: safeGate(gateBoardExecution, runDir),
    independence: safeGate(gateReviewIndependence, runDir),
    route: safeGate(gateRoute, runDir),
    evidence: safeGate(gateEvidence, runDir),
    closure: safeGate(gateClosure, runDir),
    writeback: safeGate(gateWriteback, runDir),
  };
  const ready = [];
  const blocked = [];
  const recommendations = [];
  for (const [name, result] of Object.entries(gates)) {
    if (result.gate_result === 'ready') ready.push(name);
    else blocked.push(name);
    const recommendation = recommendationFor(name, result);
    if (recommendation) recommendations.push(recommendation);
  }
  let sideState = null;
  try {
    sideState = readArtifact(runDir, 'side_state');
  } catch (_error) {
    sideState = {};
  }
  return {
    ok: blocked.length === 0,
    run_dir: path.resolve(runDir),
    artifacts: artifactStatus(runDir, EXPECTED),
    artifact_names: listArtifacts(runDir),
    gates,
    blocked,
    ready,
    side_state: sideState,
    route_rounds: routeRounds(runDir),
    recommendations: Array.from(new Set(recommendations)),
    next_structural_actions: nextStructuralActions(runDir),
  };
}

if (require.main === module) {
  const [runDir] = process.argv.slice(2);
  if (!runDir) {
    console.error('usage: node scripts/runtime-report.js <run-dir>');
    process.exit(2);
  }
  console.log(JSON.stringify(buildRuntimeReport(runDir), null, 2));
}

module.exports = { buildRuntimeReport };

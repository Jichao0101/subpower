'use strict';

const path = require('path');
const { artifactStatus, listArtifacts, readArtifact } = require('./run-artifacts');
const {
  gateBoardExecution,
  gateClosure,
  gateEvidence,
  gateReviewIndependence,
  gateRoute,
  gateWriteback,
} = require('./runtime-gates');

const EXPECTED = [
  'task_profile',
  'workflow_plan',
  'agent_invocation_manifest',
  'side_state',
  'handoff_packet',
  'implementation_plan',
  'code_change_manifest',
  'review_decision',
  'board_target',
  'board_validation_result',
  'board_failure_review',
  'main_route_decision',
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
    recommendations: Array.from(new Set(recommendations)),
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

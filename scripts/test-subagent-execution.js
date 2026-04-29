'use strict';

const assert = require('assert');
const { validateSubagentExecutionStatus, gateClosure, gateWriteback } = require('./runtime-gates');
const { expectBlocked, expectReady, tempRunDir, writeArtifact } = require('./test-helpers');

function subagentStatus(overrides = {}) {
  return {
    session_id: 's1',
    producer_agent: 'workflow-orchestrator',
    subpower_invoked: true,
    subagent_execution_required: true,
    subagent_execution_mode: 'spawned_subagents',
    spawned_roles: ['repo-implementer', 'repo-reviewer', 'verification-manager', 'board-runner', 'knowledge-closer'],
    not_spawned_roles: [],
    fallback_used: false,
    fallback_reason: null,
    degraded: false,
    degradation_reason: null,
    independence_guarantee: {
      implementation_review_separated: true,
      verification_separated_from_implementation: true,
      writeback_assessment_separated: true
    },
    ...overrides
  };
}

function invocationManifest() {
  return {
    session_id: 's1',
    producer_agent: 'workflow-orchestrator',
    invocations: [
      { invocation_id: 'impl-1', agent_id: 'agent-impl', role_id: 'repo-implementer' },
      { invocation_id: 'review-1', agent_id: 'agent-review', role_id: 'repo-reviewer' },
      { invocation_id: 'verify-1', agent_id: 'agent-verify', role_id: 'verification-manager' },
      { invocation_id: 'board-1', agent_id: 'agent-board', role_id: 'board-runner' },
      { invocation_id: 'closer-1', agent_id: 'agent-closer', role_id: 'knowledge-closer' }
    ]
  };
}

function evidenceManifest() {
  return {
    session_id: 's1',
    producer_agent: 'board-1',
    status: 'sufficient',
    evidence: [{ id: 'ev1', path: 'logs/example/board.log' }]
  };
}

function closureMatrix(overrides = {}) {
  return {
    session_id: 's1',
    producer_agent: 'workflow-orchestrator',
    close_allowed: true,
    review_status: 'approved',
    evidence_status: 'sufficient',
    repo_state: 'reviewed',
    board_state: 'passed',
    knowledge_state: 'context_ready',
    blockers: [],
    ...overrides
  };
}

function reviewDecision() {
  return {
    session_id: 's1',
    producer_agent: 'review-1',
    decision: 'approved',
    findings: []
  };
}

function codeChangeManifest() {
  return {
    session_id: 's1',
    producer_agent: 'impl-1',
    files_changed: ['src/example.js'],
    verification_results: [{ command: 'node scripts/test.js', status: 'passed' }]
  };
}

function boardValidationResult() {
  return {
    session_id: 's1',
    producer_agent: 'board-1',
    status: 'passed',
    evidence_refs: ['ev1']
  };
}

function writebackCandidate() {
  return {
    session_id: 's1',
    producer_agent: 'closer-1',
    target_scope: 'current_knowledge',
    title: 'Verified subagent execution closure',
    summary: 'Only spawned subagents can claim complete subpower execution.',
    claims: [
      {
        text: 'Complete subpower execution requires role-separated subagents.',
        claim_classification: 'verified_runtime_fact',
        verification_status: 'verified',
        evidence_refs: ['ev1']
      }
    ],
    evidence_refs: ['ev1'],
    source_artifacts: ['subagent_execution_status', 'agent_invocation_manifest'],
    risks: [],
    boundaries: ['Host-only fallback cannot claim complete subagent-first execution.']
  };
}

function writebackPlan() {
  return {
    session_id: 's1',
    producer_agent: 'closer-1',
    candidate_artifact: 'knowledge_writeback_candidate',
    target_scope: 'current_knowledge',
    destination_ref: 'logical:current-knowledge/subagent-execution',
    evidence_refs: ['ev1'],
    requires_host_write: true,
    planned_steps: ['host reviews plan', 'host records receipt']
  };
}

function writebackReceipt() {
  return {
    session_id: 's1',
    producer_agent: 'closer-1',
    candidate_artifact: 'knowledge_writeback_candidate',
    plan_artifact: 'writeback_plan',
    status: 'staged_for_host',
    target_scope: 'current_knowledge',
    writeback_refs: ['logical:current-knowledge/subagent-execution'],
    evidence_refs: ['ev1'],
    external_write_performed_by_subpower: false
  };
}

{
  const run = tempRunDir('subpower-missing-subagent-status');
  writeArtifact(run, 'task_profile', {
    session_id: 's1',
    producer_agent: 'workflow-orchestrator',
    subpower_invoked: true,
    execution_mode: 'subpower',
    primary_type: 'bug_fix',
    task_goal: 'Fix a subpower-governed issue.'
  });
  expectBlocked(validateSubagentExecutionStatus(run), 'missing_subagent_execution_status');
}

{
  const run = tempRunDir('subpower-host-only-complete-claim');
  writeArtifact(run, 'subagent_execution_status', subagentStatus({
    subagent_execution_mode: 'host_only_fallback',
    spawned_roles: [],
    not_spawned_roles: ['repo-implementer', 'repo-reviewer', 'verification-manager'],
    fallback_used: true,
    fallback_reason: 'Runtime did not expose subagent spawning.',
    degraded: true,
    degradation_reason: 'Host-only fallback cannot prove role separation.',
    independence_guarantee: {
      implementation_review_separated: false,
      verification_separated_from_implementation: false,
      writeback_assessment_separated: false
    }
  }));
  writeArtifact(run, 'evidence_manifest', evidenceManifest());
  writeArtifact(run, 'closure_matrix', closureMatrix({
    completed_as_subagent_first_execution: true,
    completed_by_subpower: true,
    complete_subpower_execution: true,
    blockers: []
  }));
  expectBlocked(gateClosure(run), 'host_only_fallback_cannot_claim_complete_subpower_execution');
}

{
  const run = tempRunDir('subpower-host-only-degraded-claim');
  writeArtifact(run, 'subagent_execution_status', subagentStatus({
    subagent_execution_mode: 'host_only_fallback',
    spawned_roles: [],
    not_spawned_roles: ['repo-implementer', 'repo-reviewer', 'verification-manager'],
    fallback_used: true,
    fallback_reason: 'Runtime did not expose subagent spawning.',
    degraded: true,
    degradation_reason: 'Host-only fallback cannot prove role separation.',
    independence_guarantee: {
      implementation_review_separated: false,
      verification_separated_from_implementation: false,
      writeback_assessment_separated: false
    }
  }));
  writeArtifact(run, 'evidence_manifest', evidenceManifest());
  writeArtifact(run, 'closure_matrix', closureMatrix({
    completed_under_subpower_contracts_with_host_only_fallback: true,
    degraded: true,
    independence_evidence_status: 'degraded'
  }));
  expectReady(gateClosure(run));
}

{
  const run = tempRunDir('subpower-spawned-subagents-complete');
  writeArtifact(run, 'subagent_execution_status', subagentStatus());
  writeArtifact(run, 'agent_invocation_manifest', invocationManifest());
  writeArtifact(run, 'code_change_manifest', codeChangeManifest());
  writeArtifact(run, 'review_decision', reviewDecision());
  writeArtifact(run, 'board_validation_result', boardValidationResult());
  writeArtifact(run, 'evidence_manifest', evidenceManifest());
  writeArtifact(run, 'closure_matrix', closureMatrix({
    completed_as_subagent_first_execution: true,
    completed_by_subpower: true,
    complete_subpower_execution: true,
    independence_evidence_status: 'complete'
  }));
  writeArtifact(run, 'knowledge_writeback_candidate', writebackCandidate());
  writeArtifact(run, 'writeback_plan', writebackPlan());
  writeArtifact(run, 'writeback_receipt', writebackReceipt());
  expectReady(validateSubagentExecutionStatus(run));
  expectReady(gateClosure(run));
  expectReady(gateWriteback(run));
}

{
  const run = tempRunDir('subpower-spawned-subagents-wrong-reviewer');
  writeArtifact(run, 'subagent_execution_status', subagentStatus());
  writeArtifact(run, 'agent_invocation_manifest', invocationManifest());
  writeArtifact(run, 'code_change_manifest', codeChangeManifest());
  writeArtifact(run, 'review_decision', {
    ...reviewDecision(),
    producer_agent: 'impl-1'
  });
  expectBlocked(validateSubagentExecutionStatus(run), 'artifact_produced_by_wrong_role');
}

assert.strictEqual(typeof validateSubagentExecutionStatus, 'function');
console.log('subagent execution tests passed');

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
    execution_evidence_status: 'complete',
    critical_host_participation: [],
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
      { invocation_id: 'impl-1', agent_id: 'agent-impl', role_id: 'repo-implementer', execution_evidence: { evidence_type: 'runtime_spawn', evidence_ref: 'handoff:impl-1' } },
      { invocation_id: 'review-1', agent_id: 'agent-review', role_id: 'repo-reviewer', execution_evidence: { evidence_type: 'runtime_spawn', evidence_ref: 'handoff:review-1' } },
      { invocation_id: 'verify-1', agent_id: 'agent-verify', role_id: 'verification-manager', execution_evidence: { evidence_type: 'runtime_spawn', evidence_ref: 'handoff:verify-1' } },
      { invocation_id: 'board-1', agent_id: 'agent-board', role_id: 'board-runner', execution_evidence: { evidence_type: 'runtime_spawn', evidence_ref: 'handoff:board-1' } },
      { invocation_id: 'closer-1', agent_id: 'agent-closer', role_id: 'knowledge-closer', execution_evidence: { evidence_type: 'runtime_spawn', evidence_ref: 'handoff:closer-1' } }
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

function boardSession() {
  return {
    session_id: 's1',
    producer_agent: 'board-1',
    board: 'example-board',
    scenario: 'manual validation using example evidence',
    status: 'completed'
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
  const run = tempRunDir('subpower-status-false-conflicts-with-task-marker');
  writeArtifact(run, 'task_profile', {
    session_id: 's1',
    producer_agent: 'workflow-orchestrator',
    subpower_invoked: true,
    execution_mode: 'subpower',
    primary_type: 'bug_fix',
    task_goal: 'Fix a subpower-governed issue.'
  });
  writeArtifact(run, 'subagent_execution_status', subagentStatus({
    subpower_invoked: false,
    subagent_execution_required: false,
    subagent_execution_mode: 'not_required',
    spawned_roles: [],
    not_spawned_roles: [],
    execution_evidence_status: 'insufficient',
    degraded: true,
    degradation_reason: 'conflicting status fixture'
  }));
  expectBlocked(validateSubagentExecutionStatus(run), 'status_subpower_invoked_conflicts_with_invocation_markers');
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
    execution_evidence_status: 'degraded',
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
  expectBlocked(gateClosure(run), 'complete_claim_requires_spawned_subagents');
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
    execution_evidence_status: 'degraded',
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
  writeArtifact(run, 'board_session', boardSession());
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

{
  const run = tempRunDir('subpower-declared-only-complete-claim');
  writeArtifact(run, 'subagent_execution_status', subagentStatus({
    execution_evidence_status: 'declared_only'
  }));
  const manifest = invocationManifest();
  manifest.invocations = manifest.invocations.map((invocation) => ({
    ...invocation,
    execution_evidence: { evidence_type: 'declared_only', evidence_ref: null }
  }));
  writeArtifact(run, 'agent_invocation_manifest', manifest);
  writeArtifact(run, 'code_change_manifest', codeChangeManifest());
  writeArtifact(run, 'review_decision', reviewDecision());
  writeArtifact(run, 'board_session', boardSession());
  writeArtifact(run, 'board_validation_result', boardValidationResult());
  writeArtifact(run, 'evidence_manifest', evidenceManifest());
  writeArtifact(run, 'closure_matrix', closureMatrix({
    completed_as_subagent_first_execution: true,
    complete_subpower_execution: true,
    independence_evidence_status: 'complete'
  }));
  expectBlocked(validateSubagentExecutionStatus(run), 'complete_claim_requires_complete_execution_evidence');
}

{
  const run = tempRunDir('subpower-complete-claim-missing-board-session');
  writeArtifact(run, 'subagent_execution_status', subagentStatus());
  writeArtifact(run, 'agent_invocation_manifest', invocationManifest());
  writeArtifact(run, 'code_change_manifest', codeChangeManifest());
  writeArtifact(run, 'review_decision', reviewDecision());
  writeArtifact(run, 'board_validation_result', boardValidationResult());
  writeArtifact(run, 'evidence_manifest', evidenceManifest());
  writeArtifact(run, 'closure_matrix', closureMatrix({
    completed_as_subagent_first_execution: true,
    complete_subpower_execution: true,
    independence_evidence_status: 'complete'
  }));
  expectBlocked(validateSubagentExecutionStatus(run), 'complete_claim_requires_board_session');
}

{
  const run = tempRunDir('subpower-complete-evidence-status-missing-board-session');
  writeArtifact(run, 'subagent_execution_status', subagentStatus());
  writeArtifact(run, 'agent_invocation_manifest', invocationManifest());
  writeArtifact(run, 'review_decision', reviewDecision());
  writeArtifact(run, 'board_validation_result', boardValidationResult());
  expectBlocked(validateSubagentExecutionStatus(run), 'complete_execution_evidence_status_requires_board_session');
}

{
  const run = tempRunDir('subpower-closure-missing-board-session');
  writeArtifact(run, 'subagent_execution_status', subagentStatus({
    execution_evidence_status: 'synthetic_fixture'
  }));
  const manifest = invocationManifest();
  manifest.invocations = manifest.invocations.map((invocation) => ({
    ...invocation,
    execution_evidence: {
      evidence_type: 'synthetic_fixture',
      evidence_ref: `fixture:${invocation.invocation_id}`
    }
  }));
  writeArtifact(run, 'agent_invocation_manifest', manifest);
  writeArtifact(run, 'review_decision', reviewDecision());
  writeArtifact(run, 'board_validation_result', boardValidationResult());
  writeArtifact(run, 'evidence_manifest', evidenceManifest());
  writeArtifact(run, 'closure_matrix', closureMatrix({ independence_evidence_status: 'degraded' }));
  expectBlocked(gateClosure(run), 'closure_requires_board_session_for_board_validation');
}

{
  const run = tempRunDir('subpower-writeback-missing-board-session');
  writeArtifact(run, 'subagent_execution_status', subagentStatus({
    execution_evidence_status: 'synthetic_fixture'
  }));
  const manifest = invocationManifest();
  manifest.invocations = manifest.invocations.map((invocation) => ({
    ...invocation,
    execution_evidence: {
      evidence_type: 'synthetic_fixture',
      evidence_ref: `fixture:${invocation.invocation_id}`
    }
  }));
  writeArtifact(run, 'agent_invocation_manifest', manifest);
  writeArtifact(run, 'review_decision', reviewDecision());
  writeArtifact(run, 'board_validation_result', boardValidationResult());
  writeArtifact(run, 'evidence_manifest', evidenceManifest());
  writeArtifact(run, 'closure_matrix', closureMatrix({ independence_evidence_status: 'degraded' }));
  writeArtifact(run, 'knowledge_writeback_candidate', writebackCandidate());
  writeArtifact(run, 'writeback_plan', writebackPlan());
  writeArtifact(run, 'writeback_receipt', writebackReceipt());
  expectBlocked(gateWriteback(run), 'writeback_requires_board_session_for_board_validation');
}

{
  const run = tempRunDir('subpower-spawned-subagents-synthetic-fixture-structural-only');
  writeArtifact(run, 'subagent_execution_status', subagentStatus({
    execution_evidence_status: 'synthetic_fixture'
  }));
  const manifest = invocationManifest();
  manifest.invocations = manifest.invocations.map((invocation) => ({
    ...invocation,
    execution_evidence: {
      evidence_type: 'synthetic_fixture',
      evidence_ref: `fixture:${invocation.invocation_id}`
    }
  }));
  writeArtifact(run, 'agent_invocation_manifest', manifest);
  const result = validateSubagentExecutionStatus(run);
  expectReady(result);
  assert.strictEqual(result.complete_execution_supported, false);
  assert.strictEqual(result.degraded_execution, true);
  assert.strictEqual(result.execution_classification, 'non_complete_execution_evidence');
}

{
  const run = tempRunDir('subpower-spawned-subagents-synthetic-fixture-complete-claim');
  writeArtifact(run, 'subagent_execution_status', subagentStatus({
    execution_evidence_status: 'synthetic_fixture'
  }));
  const manifest = invocationManifest();
  manifest.invocations = manifest.invocations.map((invocation) => ({
    ...invocation,
    execution_evidence: {
      evidence_type: 'synthetic_fixture',
      evidence_ref: `fixture:${invocation.invocation_id}`
    }
  }));
  writeArtifact(run, 'agent_invocation_manifest', manifest);
  writeArtifact(run, 'code_change_manifest', codeChangeManifest());
  writeArtifact(run, 'review_decision', reviewDecision());
  writeArtifact(run, 'evidence_manifest', evidenceManifest());
  writeArtifact(run, 'closure_matrix', closureMatrix({
    completed_as_subagent_first_execution: true,
    complete_subpower_execution: true,
    independence_evidence_status: 'complete'
  }));
  expectBlocked(validateSubagentExecutionStatus(run), 'complete_claim_requires_complete_execution_evidence');
}

{
  const run = tempRunDir('subpower-same-host-impl-review-complete-claim');
  writeArtifact(run, 'subagent_execution_status', subagentStatus());
  const manifest = invocationManifest();
  manifest.invocations = manifest.invocations.map((invocation) => (
    ['impl-1', 'review-1'].includes(invocation.invocation_id)
      ? { ...invocation, agent_id: 'host-agent' }
      : invocation
  ));
  writeArtifact(run, 'agent_invocation_manifest', manifest);
  writeArtifact(run, 'code_change_manifest', codeChangeManifest());
  writeArtifact(run, 'review_decision', reviewDecision());
  writeArtifact(run, 'evidence_manifest', evidenceManifest());
  writeArtifact(run, 'closure_matrix', closureMatrix({
    completed_as_subagent_first_execution: true,
    complete_subpower_execution: true,
    independence_evidence_status: 'complete'
  }));
  expectBlocked(validateSubagentExecutionStatus(run), 'implementation_review_actor_not_separated');
}

{
  const run = tempRunDir('subpower-nonconcrete-producer-complete-claim');
  writeArtifact(run, 'subagent_execution_status', subagentStatus());
  const manifest = invocationManifest();
  manifest.invocations.unshift({
    invocation_id: 'impl-manual',
    agent_id: 'manual-implementer',
    role_id: 'repo-implementer',
    execution_evidence: { evidence_type: 'manual_external', evidence_ref: 'manual:impl' }
  });
  writeArtifact(run, 'agent_invocation_manifest', manifest);
  writeArtifact(run, 'code_change_manifest', {
    ...codeChangeManifest(),
    producer_agent: 'impl-manual'
  });
  writeArtifact(run, 'review_decision', reviewDecision());
  writeArtifact(run, 'evidence_manifest', evidenceManifest());
  writeArtifact(run, 'closure_matrix', closureMatrix({
    completed_as_subagent_first_execution: true,
    complete_subpower_execution: true,
    independence_evidence_status: 'complete'
  }));
  expectBlocked(validateSubagentExecutionStatus(run), 'complete_claim_requires_concrete_artifact_producer_evidence');
}

{
  const run = tempRunDir('subpower-undisclosed-host-critical-participation');
  writeArtifact(run, 'subagent_execution_status', subagentStatus({
    critical_host_participation: [
      {
        role_id: 'repo-implementer',
        scope: 'host edited production files',
        disclosed: false,
        affects_independence: true
      }
    ]
  }));
  writeArtifact(run, 'agent_invocation_manifest', invocationManifest());
  writeArtifact(run, 'code_change_manifest', codeChangeManifest());
  writeArtifact(run, 'review_decision', reviewDecision());
  expectBlocked(validateSubagentExecutionStatus(run), 'host_critical_participation_must_be_disclosed');
}

{
  const run = tempRunDir('subpower-disclosed-host-critical-participation-complete-claim');
  writeArtifact(run, 'subagent_execution_status', subagentStatus({
    critical_host_participation: [
      {
        role_id: 'repo-implementer',
        scope: 'host edited production files',
        disclosed: true,
        affects_independence: true
      }
    ]
  }));
  writeArtifact(run, 'agent_invocation_manifest', invocationManifest());
  writeArtifact(run, 'code_change_manifest', codeChangeManifest());
  writeArtifact(run, 'review_decision', reviewDecision());
  writeArtifact(run, 'evidence_manifest', evidenceManifest());
  writeArtifact(run, 'closure_matrix', closureMatrix({
    completed_as_subagent_first_execution: true,
    complete_subpower_execution: true,
    independence_evidence_status: 'complete'
  }));
  expectBlocked(validateSubagentExecutionStatus(run), 'host_critical_participation_blocks_complete_claim');
}

{
  const run = tempRunDir('subpower-disclosed-host-critical-participation-non-affecting-complete-claim');
  writeArtifact(run, 'subagent_execution_status', subagentStatus({
    critical_host_participation: [
      {
        role_id: 'repo-implementer',
        scope: 'host directly performed implementation role work',
        disclosed: true,
        affects_independence: false
      }
    ]
  }));
  writeArtifact(run, 'agent_invocation_manifest', invocationManifest());
  writeArtifact(run, 'code_change_manifest', codeChangeManifest());
  writeArtifact(run, 'review_decision', reviewDecision());
  writeArtifact(run, 'evidence_manifest', evidenceManifest());
  writeArtifact(run, 'closure_matrix', closureMatrix({
    completed_as_subagent_first_execution: true,
    complete_subpower_execution: true,
    independence_evidence_status: 'complete'
  }));
  expectBlocked(validateSubagentExecutionStatus(run), 'host_critical_participation_blocks_complete_claim');
}

{
  const run = tempRunDir('subpower-writeback-plan-wrong-role-without-complete-claim');
  writeArtifact(run, 'subagent_execution_status', subagentStatus({
    execution_evidence_status: 'synthetic_fixture'
  }));
  const manifest = invocationManifest();
  manifest.invocations = manifest.invocations.map((invocation) => ({
    ...invocation,
    execution_evidence: {
      evidence_type: 'synthetic_fixture',
      evidence_ref: `fixture:${invocation.invocation_id}`
    }
  }));
  writeArtifact(run, 'agent_invocation_manifest', manifest);
  writeArtifact(run, 'review_decision', reviewDecision());
  writeArtifact(run, 'knowledge_writeback_candidate', writebackCandidate());
  writeArtifact(run, 'writeback_plan', {
    ...writebackPlan(),
    producer_agent: 'impl-1'
  });
  expectBlocked(validateSubagentExecutionStatus(run), 'artifact_produced_by_wrong_role');
}

{
  const run = tempRunDir('subpower-complete-evidence-collapsed-knowledge-closer');
  writeArtifact(run, 'subagent_execution_status', subagentStatus());
  const manifest = invocationManifest();
  manifest.invocations = manifest.invocations.map((invocation) => (
    invocation.role_id === 'knowledge-closer'
      ? { ...invocation, agent_id: 'agent-impl' }
      : invocation
  ));
  writeArtifact(run, 'agent_invocation_manifest', manifest);
  writeArtifact(run, 'code_change_manifest', codeChangeManifest());
  writeArtifact(run, 'review_decision', reviewDecision());
  writeArtifact(run, 'evidence_manifest', evidenceManifest());
  writeArtifact(run, 'knowledge_writeback_candidate', writebackCandidate());
  writeArtifact(run, 'writeback_plan', writebackPlan());
  expectBlocked(validateSubagentExecutionStatus(run), 'critical_role_actor_not_separated');
}

{
  const run = tempRunDir('subpower-duplicate-board-runner-producer-collapses-implementer');
  writeArtifact(run, 'subagent_execution_status', subagentStatus());
  const manifest = invocationManifest();
  manifest.invocations.push({
    invocation_id: 'board-2',
    agent_id: 'agent-impl',
    role_id: 'board-runner',
    execution_evidence: { evidence_type: 'runtime_spawn', evidence_ref: 'handoff:board-2' }
  });
  writeArtifact(run, 'agent_invocation_manifest', manifest);
  writeArtifact(run, 'code_change_manifest', codeChangeManifest());
  writeArtifact(run, 'review_decision', reviewDecision());
  writeArtifact(run, 'board_session', {
    ...boardSession(),
    producer_agent: 'board-2'
  });
  writeArtifact(run, 'board_validation_result', {
    ...boardValidationResult(),
    producer_agent: 'board-2'
  });
  writeArtifact(run, 'evidence_manifest', evidenceManifest());
  writeArtifact(run, 'closure_matrix', closureMatrix({
    completed_as_subagent_first_execution: true,
    complete_subpower_execution: true,
    independence_evidence_status: 'complete'
  }));
  expectBlocked(validateSubagentExecutionStatus(run), 'critical_role_actor_not_separated');
}

{
  const run = tempRunDir('subpower-duplicate-knowledge-closer-producer-collapses-reviewer');
  writeArtifact(run, 'subagent_execution_status', subagentStatus());
  const manifest = invocationManifest();
  manifest.invocations.push({
    invocation_id: 'closer-2',
    agent_id: 'agent-review',
    role_id: 'knowledge-closer',
    execution_evidence: { evidence_type: 'runtime_spawn', evidence_ref: 'handoff:closer-2' }
  });
  writeArtifact(run, 'agent_invocation_manifest', manifest);
  writeArtifact(run, 'code_change_manifest', codeChangeManifest());
  writeArtifact(run, 'review_decision', reviewDecision());
  writeArtifact(run, 'evidence_manifest', evidenceManifest());
  writeArtifact(run, 'knowledge_writeback_candidate', {
    ...writebackCandidate(),
    producer_agent: 'closer-2'
  });
  writeArtifact(run, 'writeback_plan', {
    ...writebackPlan(),
    producer_agent: 'closer-2'
  });
  expectBlocked(validateSubagentExecutionStatus(run), 'critical_role_actor_not_separated');
}

{
  const run = tempRunDir('subpower-duplicate-verification-manager-collapses-implementer');
  writeArtifact(run, 'subagent_execution_status', subagentStatus());
  const manifest = invocationManifest();
  manifest.invocations.push({
    invocation_id: 'verify-2',
    agent_id: 'agent-impl',
    role_id: 'verification-manager',
    execution_evidence: { evidence_type: 'runtime_spawn', evidence_ref: 'handoff:verify-2' }
  });
  writeArtifact(run, 'agent_invocation_manifest', manifest);
  writeArtifact(run, 'code_change_manifest', codeChangeManifest());
  writeArtifact(run, 'review_decision', reviewDecision());
  expectBlocked(validateSubagentExecutionStatus(run), 'critical_role_actor_not_separated');
}

assert.strictEqual(typeof validateSubagentExecutionStatus, 'function');
console.log('subagent execution tests passed');

'use strict';

const assert = require('assert');
const { gateClosure, gateWriteback, validateArtifactShape } = require('./runtime-gates');
const {
  expectBlocked,
  expectReady,
  tempRunDir,
  writeArtifact,
  writeBaseImplementationRun,
} = require('./test-helpers');
const { listArtifacts, readArtifact } = require('./run-artifacts');

{
  const runDir = tempRunDir('subpower-artifacts');
  writeArtifact(runDir, 'task_profile', {
    session_id: 's1',
    producer_agent: 'workflow-1',
    primary_type: 'bug_fix',
    task_goal: 'fix board failure'
  });
  assert.deepStrictEqual(listArtifacts(runDir), ['task_profile']);
  assert.strictEqual(readArtifact(runDir, 'task_profile').primary_type, 'bug_fix');
  expectReady(validateArtifactShape(runDir, 'task_profile'));
}

{
  const runDir = tempRunDir('subpower-schema-missing');
  writeArtifact(runDir, 'task_profile', {
    session_id: 's1',
    producer_agent: 'workflow-1',
    primary_type: 'bug_fix'
  });
  expectBlocked(validateArtifactShape(runDir, 'task_profile'), 'schema_validation_failed');
}

{
  const runDir = tempRunDir('subpower-writeback-no-closure');
  writeBaseImplementationRun(runDir);
  writeArtifact(runDir, 'review_decision', {
    session_id: 's1',
    producer_agent: 'review-1',
    decision: 'approved',
    findings: []
  });
  expectBlocked(gateWriteback(runDir), 'missing_required_artifacts');
}

{
  const runDir = tempRunDir('subpower-closure-ready');
  writeBaseImplementationRun(runDir);
  writeArtifact(runDir, 'review_decision', {
    session_id: 's1',
    producer_agent: 'review-1',
    decision: 'approved',
    findings: []
  });
  writeArtifact(runDir, 'closure_matrix', {
    session_id: 's1',
    producer_agent: 'workflow-1',
    close_allowed: true,
    review_status: 'approved',
    evidence_status: 'sufficient',
    repo_state: 'reviewed',
    board_state: 'not_required',
    knowledge_state: 'context_ready',
    required_artifacts: ['evidence_manifest', 'review_decision'],
    blockers: []
  });
  expectReady(gateClosure(runDir));
  expectReady(gateWriteback(runDir));
}

console.log('run artifact tests passed');

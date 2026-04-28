'use strict';

const { gateAction, gateBoardExecution, gateClosure } = require('./runtime-gates');
const {
  expectBlocked,
  tempRunDir,
  writeArtifact,
} = require('./test-helpers');

{
  const result = gateAction({ roleId: 'repo-reviewer', phase: 'review', action: 'repo_write' });
  expectBlocked(result, 'action_not_allowed_for_role');
}

{
  const result = gateAction({ roleId: 'repo-implementer', phase: 'implementation', action: 'review_decision_write' });
  expectBlocked(result, 'action_not_allowed_for_role');
}

{
  const runDir = tempRunDir('subpower-board-target');
  const result = gateBoardExecution(runDir);
  expectBlocked(result, 'missing_required_artifacts');
}

{
  const runDir = tempRunDir('subpower-close-evidence');
  writeArtifact(runDir, 'closure_matrix', {
    session_id: 's1',
    producer_agent: 'workflow-1',
    close_allowed: true,
    review_status: 'approved',
    evidence_status: 'sufficient',
    repo_state: 'reviewed',
    board_state: 'not_required',
    knowledge_state: 'context_ready',
    required_artifacts: [],
    blockers: []
  });
  const result = gateClosure(runDir);
  expectBlocked(result, 'missing_required_artifacts');
}

console.log('runtime gate negative tests passed');

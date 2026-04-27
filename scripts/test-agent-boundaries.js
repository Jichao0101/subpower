'use strict';

const { gateReviewIndependence } = require('./runtime-gates');
const {
  expectBlocked,
  expectReady,
  tempRunDir,
  writeArtifact,
  writeBaseImplementationRun,
} = require('./test-helpers');

{
  const runDir = tempRunDir('subpower-coder-self-review');
  writeBaseImplementationRun(runDir);
  writeArtifact(runDir, 'review_decision', {
    session_id: 's1',
    producer_agent: 'impl-1',
    decision: 'approved',
    findings: []
  });
  expectBlocked(gateReviewIndependence(runDir), 'review_decision_not_produced_by_repo_reviewer');
}

{
  const runDir = tempRunDir('subpower-same-agent-review');
  writeBaseImplementationRun(runDir);
  writeArtifact(runDir, 'agent_invocation_manifest', {
    session_id: 's1',
    invocations: [
      { invocation_id: 'impl-1', agent_id: 'agent-a', role_id: 'repo-implementer' },
      { invocation_id: 'review-1', agent_id: 'agent-a', role_id: 'repo-reviewer' }
    ]
  });
  writeArtifact(runDir, 'review_decision', {
    session_id: 's1',
    producer_agent: 'review-1',
    decision: 'approved',
    findings: []
  });
  expectBlocked(gateReviewIndependence(runDir), 'implementer_and_reviewer_not_independent');
}

{
  const runDir = tempRunDir('subpower-independent-review');
  writeBaseImplementationRun(runDir);
  writeArtifact(runDir, 'review_decision', {
    session_id: 's1',
    producer_agent: 'review-1',
    decision: 'approved',
    findings: []
  });
  expectReady(gateReviewIndependence(runDir));
}

console.log('agent boundary tests passed');


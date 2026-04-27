'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { writeArtifact } = require('./run-artifacts');

function tempRunDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function expectBlocked(result, reason) {
  assert.strictEqual(result.gate_result, 'blocked', JSON.stringify(result));
  if (reason) {
    assert.strictEqual(result.reason, reason, JSON.stringify(result));
  }
}

function expectReady(result) {
  assert.strictEqual(result.gate_result, 'ready', JSON.stringify(result));
}

function writeBaseImplementationRun(runDir) {
  writeArtifact(runDir, 'agent_invocation_manifest', {
    session_id: 's1',
    invocations: [
      { invocation_id: 'impl-1', agent_id: 'agent-a', role_id: 'repo-implementer' },
      { invocation_id: 'review-1', agent_id: 'agent-b', role_id: 'repo-reviewer' }
    ]
  });
  writeArtifact(runDir, 'implementation_plan', {
    session_id: 's1',
    producer_agent: 'planner-1',
    repo_scope: ['src'],
    verification_plan: ['unit']
  });
  writeArtifact(runDir, 'handoff_packet', {
    session_id: 's1',
    from_agent: 'knowledge-planner',
    to_agent: 'repo-implementer',
    artifacts: ['implementation_plan']
  });
  writeArtifact(runDir, 'code_change_manifest', {
    session_id: 's1',
    producer_agent: 'impl-1',
    files_changed: ['src/example.js'],
    verification_results: [{ command: 'node scripts/test.js', status: 'passed' }]
  });
  writeArtifact(runDir, 'evidence_manifest', {
    session_id: 's1',
    producer_agent: 'impl-1',
    status: 'sufficient',
    evidence: [{ id: 'ev1', path: 'logs/unit.log' }]
  });
}

module.exports = {
  expectBlocked,
  expectReady,
  tempRunDir,
  writeArtifact,
  writeBaseImplementationRun,
};


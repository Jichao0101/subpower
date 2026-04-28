'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validate } = require('./schema-validator');
const { gateWriteback } = require('./runtime-gates');
const { buildRuntimeReport } = require('./runtime-report');
const { writeArtifact } = require('./run-artifacts');
const { expectBlocked, expectReady } = require('./test-helpers');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = path.join(ROOT, 'fixtures', 'knowledge-writeback-closure');

function artifactName(fileName) {
  return fileName.slice(0, -'.json'.length).replace(/\.(passed|blocked|verified|unverified_current|receipt|declined)$/, '');
}

function read(fileName) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE, fileName), 'utf8'));
}

function runDir(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

function writeBase(run, closureFile = 'closure_matrix.passed.json') {
  writeArtifact(run, 'evidence_manifest', read('evidence_manifest.json'));
  writeArtifact(run, 'review_decision', read('review_decision.json'));
  writeArtifact(run, 'closure_matrix', read(closureFile));
}

function writeVerifiedWriteback(run) {
  writeArtifact(run, 'knowledge_writeback_candidate', read('knowledge_writeback_candidate.verified.json'));
  writeArtifact(run, 'writeback_plan', read('writeback_plan.receipt.json'));
  writeArtifact(run, 'writeback_receipt', read('writeback_receipt.json'));
}

for (const fileName of fs.readdirSync(FIXTURE).filter((name) => name.endsWith('.json')).sort()) {
  const artifact = artifactName(fileName);
  const schemaPath = path.join(ROOT, 'schemas', 'run-artifacts', `${artifact}.schema.json`);
  assert.strictEqual(fs.existsSync(schemaPath), true, `${fileName}: missing schema ${artifact}`);
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  assert.deepStrictEqual(validate(read(fileName), schema), [], fileName);
}

{
  const run = runDir('subpower-writeback-ready');
  writeBase(run);
  writeVerifiedWriteback(run);
  expectReady(gateWriteback(run));
}

{
  const run = runDir('subpower-writeback-before-closure');
  writeBase(run, 'closure_matrix.blocked.json');
  writeVerifiedWriteback(run);
  expectBlocked(gateWriteback(run), 'closure_has_blockers');
}

{
  const run = runDir('subpower-writeback-unverified-current-declined');
  writeBase(run);
  writeArtifact(run, 'knowledge_writeback_candidate', read('knowledge_writeback_candidate.unverified_current.json'));
  writeArtifact(run, 'writeback_plan', read('writeback_plan.declined.json'));
  writeArtifact(run, 'writeback_declined', read('writeback_declined.json'));
  expectReady(gateWriteback(run));
}

{
  const run = runDir('subpower-writeback-unverified-current-receipt');
  writeBase(run);
  writeArtifact(run, 'knowledge_writeback_candidate', read('knowledge_writeback_candidate.unverified_current.json'));
  writeArtifact(run, 'writeback_plan', read('writeback_plan.declined.json'));
  writeArtifact(run, 'writeback_receipt', read('writeback_receipt.json'));
  expectBlocked(gateWriteback(run), 'unverified_claims_cannot_enter_current_knowledge');
}

{
  const run = runDir('subpower-writeback-missing-evidence-refs');
  writeBase(run);
  const candidate = read('knowledge_writeback_candidate.verified.json');
  delete candidate.evidence_refs;
  writeArtifact(run, 'knowledge_writeback_candidate', candidate);
  writeArtifact(run, 'writeback_plan', read('writeback_plan.receipt.json'));
  writeArtifact(run, 'writeback_receipt', read('writeback_receipt.json'));
  expectBlocked(gateWriteback(run), 'schema_validation_failed');
}

{
  const run = runDir('subpower-writeback-forbidden-path');
  writeBase(run);
  writeArtifact(run, 'knowledge_writeback_candidate', read('knowledge_writeback_candidate.verified.json'));
  writeArtifact(run, 'writeback_plan', {
    ...read('writeback_plan.receipt.json'),
    destination_ref: '/external/example/Knowledge-Base/current/high-yaw-rate.md',
  });
  writeArtifact(run, 'writeback_receipt', read('writeback_receipt.json'));
  expectBlocked(gateWriteback(run), 'external_knowledge_path_forbidden');
}

{
  const run = runDir('subpower-writeback-subpower-external-write');
  writeBase(run);
  writeArtifact(run, 'knowledge_writeback_candidate', read('knowledge_writeback_candidate.verified.json'));
  writeArtifact(run, 'writeback_plan', read('writeback_plan.receipt.json'));
  writeArtifact(run, 'writeback_receipt', {
    ...read('writeback_receipt.json'),
    external_write_performed_by_subpower: true,
  });
  expectBlocked(gateWriteback(run), 'schema_validation_failed');
}

{
  const run = runDir('subpower-writeback-report');
  writeBase(run);
  const report = buildRuntimeReport(run);
  assert(report.next_structural_actions.some((item) => item.action === 'create_knowledge_writeback_candidate'));
}

const fixtureText = fs.readdirSync(FIXTURE)
  .map((name) => fs.readFileSync(path.join(FIXTURE, name), 'utf8'))
  .join('\n');
assert(!fixtureText.includes('/Knowledge-Base/'));
assert(!fixtureText.includes('/mnt/'));
assert(!fixtureText.includes('/home/'));
assert(!fixtureText.includes('/Users/'));
assert(!/[A-Za-z]:\\/.test(fixtureText));

console.log('knowledge writeback tests passed');

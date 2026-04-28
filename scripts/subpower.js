'use strict';

const path = require('path');
const { installPlugin } = require('./install-plugin');
const { copyFixtureToRunDir } = require('./run-artifacts');
const { buildRuntimeReport } = require('./runtime-report');
const { validateContracts } = require('./validate-contracts');
const {
  gateBoardExecution,
  gateClosure,
  gateEvidence,
  gateReviewIndependence,
  gateRoute,
  gateWriteback,
} = require('./runtime-gates');

const ROOT = path.resolve(__dirname, '..');

function parseFlagArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--force') args.force = true;
    else if (item === '--dry-run') args.dryRun = true;
    else if (item.startsWith('--')) args[item.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++index];
    else (args._ ||= []).push(item);
  }
  return args;
}

function demo(argv) {
  const [fixtureName, ...rest] = argv;
  const args = parseFlagArgs(rest);
  if (!fixtureName || !args.to) {
    throw new Error('usage: node scripts/subpower.js demo <fixture-name> --to <run-dir> [--route coder_rework|planner_rework] [--force]');
  }
  const fixtureDir = path.join(ROOT, 'fixtures', fixtureName);
  return copyFixtureToRunDir(fixtureDir, args.to, { route: args.route || 'coder_rework', force: args.force });
}

function gate(argv) {
  const [gateName, runDir] = argv;
  const gates = {
    board: gateBoardExecution,
    independence: gateReviewIndependence,
    route: gateRoute,
    evidence: gateEvidence,
    closure: gateClosure,
    writeback: gateWriteback,
  };
  if (!gates[gateName] || !runDir) {
    throw new Error('usage: node scripts/subpower.js gate board|independence|route|evidence|closure|writeback <run-dir>');
  }
  return gates[gateName](runDir);
}

function runValidation() {
  const errors = validateContracts();
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, message: 'contracts and schemas valid' };
}

function runTests() {
  const testAll = path.join(ROOT, 'scripts', 'test-all.js');
  delete require.cache[require.resolve(testAll)];
  require(testAll);
  return { ok: true };
}

function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  if (command === 'validate') return runValidation();
  if (command === 'test') return runTests();
  if (command === 'gate') return gate(rest);
  if (command === 'install') return installPlugin(rest);
  if (command === 'demo') return demo(rest);
  if (command === 'report') {
    const [runDir] = rest;
    if (!runDir) throw new Error('usage: node scripts/subpower.js report <run-dir>');
    return buildRuntimeReport(runDir);
  }
  throw new Error('usage: node scripts/subpower.js validate|test|gate|install|demo|report');
}

if (require.main === module) {
  try {
    const result = main();
    if (result) console.log(JSON.stringify(result, null, 2));
    if (result && result.ok === false) process.exit(1);
    if (result && result.gate_result === 'blocked') process.exit(1);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

module.exports = { main };

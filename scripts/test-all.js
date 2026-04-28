'use strict';

const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const tests = [
  'scripts/validate-contracts.js',
  'scripts/test-runtime-gates.js',
  'scripts/test-decision-points.js',
  'scripts/test-agent-boundaries.js',
  'scripts/test-run-artifacts.js',
  'scripts/test-schema-validator.js',
  'scripts/test-install-plugin.js',
  'scripts/test-install-docs.js',
  'scripts/test-fixtures.js',
  'scripts/test-demo.js',
  'scripts/test-run-artifact-lifecycle.js',
  'scripts/test-schema-diagnostics.js',
  'scripts/test-runtime-report.js',
  'scripts/test-no-external-runtime-dependency.js',
  'scripts/test-contract-schema-consistency.js',
];

for (const test of tests) {
  const resolved = path.join(ROOT, test);
  if (test === 'scripts/validate-contracts.js') {
    const { validateContracts } = require(resolved);
    const errors = validateContracts();
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
    console.log('contracts and schemas valid');
  } else {
    delete require.cache[require.resolve(resolved)];
    require(resolved);
  }
}

console.log('all tests passed');

'use strict';

const { spawnSync } = require('child_process');
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
  'scripts/test-fixtures.js',
  `scripts/test-no-${'cute'}${'power'}-dependency.js`
];

for (const test of tests) {
  const result = spawnSync(process.execPath, [test], { cwd: ROOT, stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('all tests passed');

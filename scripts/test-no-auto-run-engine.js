'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { main } = require('./subpower');

const ROOT = path.resolve(__dirname, '..');

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    if (['.git', 'node_modules', 'coverage'].includes(name)) continue;
    const abs = path.join(dir, name);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) walk(abs, files);
    else files.push(abs);
  }
  return files;
}

assert.throws(
  () => main(['run']),
  /Full business workflow execution is started by the using-subpower skill, not by a script runner\./
);

for (const rel of [
  path.join('scripts', 'workflow-runner.js'),
  path.join('scripts', 'auto-runner.js'),
  path.join('scripts', 'agent-runner.js'),
]) {
  assert.strictEqual(fs.existsSync(path.join(ROOT, rel)), false, `${rel} must not exist`);
}

const docs = [
  'README.md',
  'README.codex.md',
  'INSTALL.md',
  path.join('docs', 'plugin-installation.md'),
  path.join('docs', 'full-flow-agent-procedure.md'),
  path.join('skills', 'using-subpower', 'SKILL.md'),
].map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')).join('\n');

assert(docs.includes('skills/using-subpower/SKILL.md'), 'docs must name using-subpower as the entry point');
assert(/Scripts (provide|only validate)/.test(docs), 'docs must state scripts provide structural support only');
assert(docs.includes('There is no `subpower run` command.') || docs.includes('No `subpower run` command is required or allowed'), 'docs must reject subpower run');

for (const file of walk(path.join(ROOT, 'scripts'))) {
  const rel = path.relative(ROOT, file);
  const base = path.basename(file);
  assert(!/^(workflow|auto|agent)-runner\.js$/.test(base), `${rel}: automatic runner filename is forbidden`);
  const text = fs.readFileSync(file, 'utf8');
  if (rel !== path.join('scripts', 'test-no-auto-run-engine.js') && rel !== path.join('scripts', 'subpower.js')) {
    assert(!/command\s*===\s*['"]run['"]/.test(text), `${rel}: run command branch is forbidden`);
  }
}

console.log('no auto run engine tests passed');

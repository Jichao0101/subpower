'use strict';

const fs = require('fs');
const path = require('path');

function artifactPath(runDir, artifactName) {
  return path.join(runDir, `${artifactName}.json`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readArtifact(runDir, artifactName) {
  return readJson(artifactPath(runDir, artifactName));
}

function writeArtifact(runDir, artifactName, value) {
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(artifactPath(runDir, artifactName), `${JSON.stringify(value, null, 2)}\n`);
}

function hasArtifact(runDir, artifactName) {
  return fs.existsSync(artifactPath(runDir, artifactName));
}

function listArtifacts(runDir) {
  if (!fs.existsSync(runDir)) {
    return [];
  }
  return fs.readdirSync(runDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.slice(0, -'.json'.length))
    .sort();
}

function artifactStatus(runDir, expectedArtifacts) {
  const present = listArtifacts(runDir);
  const presentSet = new Set(present);
  return {
    present: present.filter((name) => expectedArtifacts.includes(name)),
    missing: expectedArtifacts.filter((name) => !presentSet.has(name)),
    extra: present.filter((name) => !expectedArtifacts.includes(name)),
  };
}

function assertSafeFileName(fileName) {
  if (fileName.includes('..') || path.basename(fileName) !== fileName) {
    throw new Error(`unsafe fixture file name: ${fileName}`);
  }
}

function assertInside(parent, target) {
  const parentAbs = path.resolve(parent);
  const targetAbs = path.resolve(target);
  if (targetAbs !== parentAbs && !targetAbs.startsWith(`${parentAbs}${path.sep}`)) {
    throw new Error(`path escapes target: ${target}`);
  }
}

function normalizeFixtureArtifactName(fileName, options = {}) {
  assertSafeFileName(fileName);
  const route = options.route || 'coder_rework';
  if (!fileName.endsWith('.json')) return null;
  if (fileName === 'side_state.initial.json') return 'side_state.json';
  if (fileName === 'board_validation_result.failed.json') return 'board_validation_result.json';
  if (fileName === 'closure_matrix.blocked.json') return 'closure_matrix.json';
  if (fileName.startsWith('board_failure_review.')) {
    if (route === 'coder_rework' && fileName === 'board_failure_review.implementation_defect.json') return 'board_failure_review.json';
    if (route === 'planner_rework' && fileName === 'board_failure_review.plan_mismatch.json') return 'board_failure_review.json';
    return null;
  }
  if (fileName.startsWith('main_route_decision.')) {
    if (route === 'coder_rework' && fileName === 'main_route_decision.coder_rework.json') return 'main_route_decision.json';
    if (route === 'planner_rework' && fileName === 'main_route_decision.planner_rework.json') return 'main_route_decision.json';
    return null;
  }
  return fileName;
}

function copyFixtureToRunDir(fixtureDir, runDir, options = {}) {
  const route = options.route || 'coder_rework';
  if (!['coder_rework', 'planner_rework'].includes(route)) {
    throw new Error(`unknown demo route: ${route}`);
  }
  const source = path.resolve(fixtureDir);
  const target = path.resolve(runDir);
  if (!fs.statSync(source, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`fixture not found: ${fixtureDir}`);
  }
  if (fs.existsSync(target) && !options.force) {
    throw new Error(`target already exists: ${target}`);
  }
  if (fs.existsSync(target) && options.force) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  fs.mkdirSync(target, { recursive: true });

  const copied = [];
  const skipped = [];
  for (const fileName of fs.readdirSync(source).sort()) {
    assertSafeFileName(fileName);
    const from = path.join(source, fileName);
    if (!fs.statSync(from).isFile() || !fileName.endsWith('.json')) {
      skipped.push(fileName);
      continue;
    }
    const normalized = normalizeFixtureArtifactName(fileName, { route });
    if (!normalized) {
      skipped.push(fileName);
      continue;
    }
    const to = path.join(target, normalized);
    assertInside(target, to);
    fs.copyFileSync(from, to);
    copied.push(normalized);
  }
  return { ok: true, fixture_dir: source, run_dir: target, route, copied: copied.sort(), skipped: skipped.sort() };
}

function writeRunReport(runDir, reportPath, report = null) {
  const target = path.resolve(reportPath);
  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true });
  const value = report || { ok: true, run_dir: path.resolve(runDir), artifacts: listArtifacts(runDir) };
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
  return target;
}

if (require.main === module) {
  const [command, runDir, artifactName, jsonPath] = process.argv.slice(2);
  if (command === 'status') {
    console.log(JSON.stringify({ run_dir: runDir, artifacts: listArtifacts(runDir) }, null, 2));
  } else if (command === 'read') {
    console.log(JSON.stringify(readArtifact(runDir, artifactName), null, 2));
  } else if (command === 'write') {
    writeArtifact(runDir, artifactName, readJson(jsonPath));
  } else {
    console.error('usage: node scripts/run-artifacts.js status|read|write <runDir> [artifactName] [jsonPath]');
    process.exit(2);
  }
}

module.exports = {
  artifactPath,
  artifactStatus,
  copyFixtureToRunDir,
  hasArtifact,
  listArtifacts,
  normalizeFixtureArtifactName,
  readArtifact,
  readJson,
  writeArtifact,
  writeRunReport,
};

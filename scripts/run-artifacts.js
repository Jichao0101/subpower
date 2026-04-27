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
  hasArtifact,
  listArtifacts,
  readArtifact,
  readJson,
  writeArtifact,
};


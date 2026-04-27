'use strict';

const fs = require('fs');
const path = require('path');
const { readJson, writeArtifact } = require('./run-artifacts');

const DEFAULT_ARTIFACTS = [
  'task_profile',
  'route_resolution',
  'evidence_manifest',
  'review_decision',
];

function importCutepowerContext({ cutepowerRunDir, subpowerRunDir, artifacts = DEFAULT_ARTIFACTS }) {
  const imported = [];
  const missing = [];
  const context = {
    schema: 'subpower.upstream-cutepower-context/v1',
    source_run_dir: cutepowerRunDir,
    imported_at: new Date().toISOString(),
    artifacts: {},
  };

  for (const artifactName of artifacts) {
    const filePath = path.join(cutepowerRunDir, `${artifactName}.json`);
    if (!fs.existsSync(filePath)) {
      missing.push(artifactName);
      continue;
    }
    context.artifacts[artifactName] = readJson(filePath);
    imported.push(artifactName);
  }

  writeArtifact(subpowerRunDir, 'upstream_cutepower_context', context);
  return { imported, missing, output: path.join(subpowerRunDir, 'upstream_cutepower_context.json') };
}

if (require.main === module) {
  const [cutepowerRunDir, subpowerRunDir] = process.argv.slice(2);
  if (!cutepowerRunDir || !subpowerRunDir) {
    console.error('usage: node scripts/cutepower-adapter.js <.cutepower/run/session> <.subpower/run/session>');
    process.exit(2);
  }
  console.log(JSON.stringify(importCutepowerContext({ cutepowerRunDir, subpowerRunDir }), null, 2));
}

module.exports = { importCutepowerContext };


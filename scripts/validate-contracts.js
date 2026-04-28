'use strict';

const fs = require('fs');
const path = require('path');
const { validateSchema } = require('./schema-validator');

const ROOT = path.resolve(__dirname, '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listFiles(dir, suffix) {
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith(suffix))
    .map((name) => path.join(dir, name))
    .sort();
}

function validateContracts() {
  const files = listFiles(path.join(ROOT, 'contracts'), '.yaml');
  const errors = [];
  for (const file of files) {
    try {
      const value = readJson(file);
      if (!value.schema) {
        errors.push(`${file}: missing schema`);
      }
      if (typeof value.schema !== 'string' || !value.schema.startsWith('subpower.')) {
        errors.push(`${file}: invalid schema id`);
      }
    } catch (error) {
      errors.push(`${file}: ${error.message}`);
    }
  }
  for (const schemaDir of [
    path.join(ROOT, 'schemas', 'run-artifacts'),
    path.join(ROOT, 'schemas', 'contracts'),
  ]) {
    if (!fs.existsSync(schemaDir)) {
      errors.push(`${schemaDir}: missing schema directory`);
      continue;
    }
    for (const file of listFiles(schemaDir, '.json')) {
      try {
        const value = readJson(file);
        if (!value.title || !value.type) {
          errors.push(`${file}: missing title or type`);
        }
        errors.push(...validateSchema(value).map((error) => `${file}: ${error}`));
      } catch (error) {
        errors.push(`${file}: ${error.message}`);
      }
    }
  }

  const artifactRequirements = readJson(path.join(ROOT, 'contracts', 'artifact-requirements.yaml')).artifacts;
  for (const artifactName of Object.keys(artifactRequirements)) {
    const schemaFile = path.join(ROOT, 'schemas', 'run-artifacts', `${artifactName}.schema.json`);
    if (!fs.existsSync(schemaFile)) {
      errors.push(`${schemaFile}: missing artifact schema`);
    }
  }

  for (const file of files) {
    try {
      readJson(file);
    } catch (error) {
      errors.push(`${file}: not parseable as YAML/JSON subset: ${error.message}`);
    }
  }
  return errors;
}

if (require.main === module) {
  const errors = validateContracts();
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('contracts and schemas valid');
}

module.exports = { validateContracts };

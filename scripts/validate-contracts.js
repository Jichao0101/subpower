'use strict';

const fs = require('fs');
const path = require('path');

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
    } catch (error) {
      errors.push(`${file}: ${error.message}`);
    }
  }
  const schemaDir = path.join(ROOT, 'schemas', 'run-artifacts');
  for (const file of listFiles(schemaDir, '.json')) {
    try {
      const value = readJson(file);
      if (!value.title || !Array.isArray(value.required)) {
        errors.push(`${file}: missing title or required fields`);
      }
    } catch (error) {
      errors.push(`${file}: ${error.message}`);
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


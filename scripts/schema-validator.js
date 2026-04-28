'use strict';

const fs = require('fs');
const path = require('path');

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function validate(value, schema, at = '$') {
  const errors = [];
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return [`${at}: schema must be an object`];
  }

  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = typeOf(value);
    const integerMatch = actual === 'number' && Number.isInteger(value) && allowed.includes('integer');
    if (!allowed.includes(actual) && !integerMatch) {
      errors.push(`${at}: expected ${allowed.join('|')}, got ${typeOf(value)}`);
      return errors;
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${at}: value not in enum`);
  }

  if (typeOf(value) === 'object') {
    const required = schema.required || [];
    for (const key of required) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        errors.push(`${at}.${key}: required property missing`);
      }
    }

    const properties = schema.properties || {};
    for (const [key, child] of Object.entries(value)) {
      if (properties[key]) {
        errors.push(...validate(child, properties[key], `${at}.${key}`));
      } else if (schema.additionalProperties === false) {
        errors.push(`${at}.${key}: additional property not allowed`);
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        errors.push(...validate(child, schema.additionalProperties, `${at}.${key}`));
      }
    }
  }

  if (typeOf(value) === 'array' && schema.items) {
    value.forEach((item, index) => {
      errors.push(...validate(item, schema.items, `${at}[${index}]`));
    });
  }

  return errors;
}

function validateSchema(schema, at = '$') {
  const errors = [];
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return [`${at}: schema must be an object`];
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const known = ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'];
    for (const type of types) {
      if (!known.includes(type)) errors.push(`${at}.type: unsupported type ${type}`);
    }
  }
  if (schema.required && (!Array.isArray(schema.required) || schema.required.some((item) => typeof item !== 'string'))) {
    errors.push(`${at}.required: must be an array of strings`);
  }
  if (schema.enum && !Array.isArray(schema.enum)) {
    errors.push(`${at}.enum: must be an array`);
  }
  if (schema.properties) {
    if (typeof schema.properties !== 'object' || Array.isArray(schema.properties)) {
      errors.push(`${at}.properties: must be an object`);
    } else {
      for (const [key, child] of Object.entries(schema.properties)) {
        errors.push(...validateSchema(child, `${at}.properties.${key}`));
      }
    }
  }
  if (schema.items) {
    errors.push(...validateSchema(schema.items, `${at}.items`));
  }
  if (
    schema.additionalProperties !== undefined
    && typeof schema.additionalProperties !== 'boolean'
    && typeof schema.additionalProperties !== 'object'
  ) {
    errors.push(`${at}.additionalProperties: must be boolean or schema object`);
  }
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    errors.push(...validateSchema(schema.additionalProperties, `${at}.additionalProperties`));
  }
  return errors;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function schemaPathForArtifact(root, artifactName) {
  return path.join(root, 'schemas', 'run-artifacts', `${artifactName}.schema.json`);
}

function validateArtifactFile(root, artifactName, artifactPath) {
  const schema = readJson(schemaPathForArtifact(root, artifactName));
  const value = readJson(artifactPath);
  return validate(value, schema);
}

if (require.main === module) {
  const [schemaFile, valueFile] = process.argv.slice(2);
  if (!schemaFile || !valueFile) {
    console.error('usage: node scripts/schema-validator.js <schema.json> <value.json>');
    process.exit(2);
  }
  const errors = validate(readJson(valueFile), readJson(schemaFile));
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('schema validation passed');
}

module.exports = {
  validate,
  validateArtifactFile,
  validateSchema,
};

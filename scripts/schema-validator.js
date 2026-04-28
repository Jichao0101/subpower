'use strict';

const fs = require('fs');
const path = require('path');

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function error(pathName, code, message, expected, actual) {
  const out = { path: pathName, code, message };
  if (expected !== undefined) out.expected = expected;
  if (actual !== undefined) out.actual = actual;
  return out;
}

function formatErrors(errors) {
  return errors.map((item) => {
    if (typeof item === 'string') return item;
    const suffix = [
      item.expected === undefined ? null : `expected=${JSON.stringify(item.expected)}`,
      item.actual === undefined ? null : `actual=${JSON.stringify(item.actual)}`,
    ].filter(Boolean).join(' ');
    return `${item.path}: ${item.code}: ${item.message}${suffix ? ` (${suffix})` : ''}`;
  });
}

function validate(value, schema, at = '$') {
  const errors = [];
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return [error(at, 'schema_invalid', 'schema must be an object', 'object', typeOf(schema))];
  }

  const actual = typeOf(value);
  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    const integerMatch = actual === 'number' && Number.isInteger(value) && allowed.includes('integer');
    if (!allowed.includes(actual) && !integerMatch) {
      errors.push(error(at, 'type_mismatch', 'value type mismatch', allowed.join('|'), actual));
      return errors;
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(error(at, 'enum_mismatch', 'value not in enum', schema.enum, value));
  }

  if (actual === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(error(at, 'minimum', 'value is below minimum', schema.minimum, value));
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(error(at, 'maximum', 'value is above maximum', schema.maximum, value));
    }
  }

  if (actual === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(error(at, 'minLength', 'string is shorter than minLength', schema.minLength, value.length));
    }
    if (schema.pattern !== undefined && !(new RegExp(schema.pattern).test(value))) {
      errors.push(error(at, 'pattern', 'string does not match pattern', schema.pattern, value));
    }
  }

  if (actual === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(error(at, 'minItems', 'array has fewer items than minItems', schema.minItems, value.length));
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validate(item, schema.items, `${at}[${index}]`));
      });
    }
  }

  if (actual === 'object') {
    const required = schema.required || [];
    for (const key of required) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        errors.push(error(`${at}.${key}`, 'required_missing', 'required property missing'));
      }
    }

    const properties = schema.properties || {};
    for (const [key, child] of Object.entries(value)) {
      if (properties[key]) {
        errors.push(...validate(child, properties[key], `${at}.${key}`));
      } else if (schema.additionalProperties === false) {
        errors.push(error(`${at}.${key}`, 'additional_property', 'additional property not allowed'));
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        errors.push(...validate(child, schema.additionalProperties, `${at}.${key}`));
      }
    }
  }

  return errors;
}

function validateSchema(schema, at = '$') {
  const errors = [];
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return [error(at, 'schema_invalid', 'schema must be an object', 'object', typeOf(schema))];
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const known = ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'];
    for (const type of types) {
      if (!known.includes(type)) errors.push(error(`${at}.type`, 'schema_type_unknown', 'unsupported type', known, type));
    }
  }
  if (schema.required && (!Array.isArray(schema.required) || schema.required.some((item) => typeof item !== 'string'))) {
    errors.push(error(`${at}.required`, 'schema_required_invalid', 'required must be an array of strings'));
  }
  if (schema.enum && !Array.isArray(schema.enum)) {
    errors.push(error(`${at}.enum`, 'schema_enum_invalid', 'enum must be an array'));
  }
  for (const numeric of ['minimum', 'maximum', 'minItems', 'minLength']) {
    if (schema[numeric] !== undefined && typeof schema[numeric] !== 'number') {
      errors.push(error(`${at}.${numeric}`, 'schema_keyword_invalid', `${numeric} must be a number`));
    }
  }
  if (schema.pattern !== undefined) {
    if (typeof schema.pattern !== 'string') {
      errors.push(error(`${at}.pattern`, 'schema_pattern_invalid', 'pattern must be a string'));
    } else {
      try {
        new RegExp(schema.pattern);
      } catch (regexpError) {
        errors.push(error(`${at}.pattern`, 'schema_pattern_invalid', regexpError.message));
      }
    }
  }
  if (schema.properties) {
    if (typeof schema.properties !== 'object' || Array.isArray(schema.properties)) {
      errors.push(error(`${at}.properties`, 'schema_properties_invalid', 'properties must be an object'));
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
    errors.push(error(`${at}.additionalProperties`, 'schema_additional_properties_invalid', 'additionalProperties must be boolean or schema object'));
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
    console.error(formatErrors(errors).join('\n'));
    process.exit(1);
  }
  console.log('schema validation passed');
}

module.exports = {
  formatErrors,
  validate,
  validateArtifactFile,
  validateSchema,
};

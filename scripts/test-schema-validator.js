'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { validate, validateSchema } = require('./schema-validator');

const ROOT = path.resolve(__dirname, '..');

const schema = {
  title: 'nested_example',
  type: 'object',
  required: ['kind', 'items'],
  additionalProperties: false,
  properties: {
    kind: { enum: ['demo'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name'],
        additionalProperties: false,
        properties: {
          name: { type: 'string' }
        }
      }
    }
  }
};

assert.deepStrictEqual(validateSchema(schema), []);
assert.deepStrictEqual(validate({ kind: 'demo', items: [{ name: 'ok' }] }, schema), []);
assert(validate({ kind: 'bad', items: [] }, schema).some((error) => error.includes('enum')));
assert(validate({ kind: 'demo', items: [{ name: 'ok', extra: true }] }, schema).some((error) => error.includes('additional')));
assert(validate({ kind: 'demo' }, schema).some((error) => error.includes('required')));

for (const dir of ['schemas/run-artifacts', 'schemas/contracts']) {
  for (const name of fs.readdirSync(path.join(ROOT, dir))) {
    if (!name.endsWith('.json')) continue;
    const value = JSON.parse(fs.readFileSync(path.join(ROOT, dir, name), 'utf8'));
    assert.deepStrictEqual(validateSchema(value), [], `${dir}/${name}`);
  }
}

console.log('schema validator tests passed');

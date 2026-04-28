'use strict';

const assert = require('assert');
const { validate, formatErrors } = require('./schema-validator');

const schema = {
  type: 'object',
  required: ['route', 'confidence', 'items', 'id', 'nested'],
  additionalProperties: false,
  properties: {
    route: { enum: ['coder_rework'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    items: { type: 'array', minItems: 1, items: { type: 'string' } },
    id: { type: 'string', pattern: '^ok-[0-9]+$' },
    nested: { type: 'object', required: ['name'], properties: { name: { type: 'string', minLength: 2 } }, additionalProperties: false }
  }
};

let errors = validate({ route: 'bad', confidence: 2, items: [], id: 'bad', nested: { name: 'x', extra: true }, stray: true }, schema);
assert(errors.some((item) => item.code === 'required_missing' && item.path === '$.nested.name') === false);
assert(errors.some((item) => item.code === 'enum_mismatch'));
assert(errors.some((item) => item.code === 'maximum'));
assert(errors.some((item) => item.code === 'minItems'));
assert(errors.some((item) => item.code === 'pattern'));
assert(errors.some((item) => item.code === 'minLength' && item.path === '$.nested.name'));
assert(errors.some((item) => item.code === 'additional_property'));
assert(formatErrors(errors).some((line) => line.includes('$.nested.name')));

errors = validate({}, schema);
assert(errors.some((item) => item.code === 'required_missing' && item.path === '$.route'));

const readable = formatErrors(validate({ route: 'bad', confidence: -1, items: [], id: 'no', nested: { name: '' } }, schema)).join('\n');
assert(readable.includes('enum_mismatch'), readable);
assert(readable.includes('minimum'), readable);

console.log('schema diagnostics tests passed');

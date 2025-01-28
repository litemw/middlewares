import { pipe, Pipe } from './core';
import * as _ from 'lodash-es';
import { oas31 } from 'openapi3-ts';
import { isArray, values } from 'lodash-es';

export class ParseError extends Error {
  name = 'ParseError';
}

const intSchema: { schema: oas31.SchemaObject } = {
    schema: { type: 'integer' },
  },
  floatSchema: { schema: oas31.SchemaObject } = { schema: { type: 'number' } },
  boolSchema: { schema: oas31.SchemaObject } = { schema: { type: 'boolean' } },
  enumSchema: { schema: oas31.SchemaObject } = { schema: { enum: [] } },
  jsonSchema: { schema: oas31.SchemaObject } = { schema: { type: 'object' } };

export function parseIntPipe(
  radix = 10,
  err = new ParseError('Parse int pipe error'),
) {
  const parsePipe = pipe(_.toString)
    .pipe((val) => parseInt(val, radix))
    .pipe((val) => {
      if (!_.isInteger(val)) return err;
      return val;
    });

  parsePipe.metadata = intSchema;
  return parsePipe;
}

export function parseFloatPipe(err = new ParseError('Parse float pipe error')) {
  const parsePipe = pipe(_.toString)
    .pipe(parseFloat)
    .pipe((val) => {
      if (!_.isFinite(val)) return err;
      return val;
    });

  parsePipe.metadata = floatSchema;
  return parsePipe;
}

export function parseBoolPipe(err = new ParseError('Parse bool pipe error')) {
  const parsePipe = pipe(_.toString)
    .pipe((val) => _.toLower(val.toString()))
    .pipe((val) => {
      if (val === 'true') return true;
      else if (val === 'false') return false;
      else return err;
    });

  parsePipe.metadata = boolSchema;
  return parsePipe;
}

export function defaultValuePipe<D, T = D>(defaultVal: D) {
  return pipe((val) => val ?? defaultVal) as Pipe<T | null | undefined, T | D>;
}

export function parseEnumPipe<E>(
  en: E,
  err = new ParseError('Parse enum pipe error'),
) {
  const enumValues = isArray(en) ? en : values(en),
    enumSet = new Set(enumValues);

  const parsePipe = pipe((val) => {
    if (enumSet.has(val)) return val;
    else return err;
  }) as Pipe<unknown, E[keyof E] | ParseError>;

  parsePipe.metadata = { ...enumSchema, schema: { enum: enumValues } };
  return parsePipe;
}

export function parseJSONPipe<T = any>(
  err = new ParseError('Parse array pipe error'),
): Pipe<unknown, T | ParseError> {
  const parsePipe = pipe((val: unknown) => {
    if (_.isString(val)) {
      try {
        return JSON.parse(val);
      } catch (parseErr) {
        err.cause = parseErr.cause;
        return err;
      }
    } else return err;
  }) satisfies Pipe<unknown, T | ParseError>;

  parsePipe.metadata = jsonSchema;
  return parsePipe;
}

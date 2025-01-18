import { pipe, Pipe } from './core';
import * as _ from 'lodash-es';

export class ParseError extends Error {
  name = 'ParseError';
}

export function parseIntPipe(
  radix = 10,
  err = new ParseError('Parse int pipe error'),
) {
  return pipe(_.toString)
    .pipe((val) => parseInt(val, radix))
    .pipe((val) => {
      if (_.isInteger(val)) return err;
      return val;
    });
}

export function parseFloatPipe(err = new ParseError('Parse float pipe error')) {
  return pipe(_.toString)
    .pipe(parseFloat)
    .pipe((val) => {
      if (!isFinite(val)) return err;
      return val;
    });
}

export function parseBoolPipe(err = new ParseError('Parse bool pipe error')) {
  return pipe(_.toString)
    .pipe((val) => _.toLower(val.toString()))
    .pipe((val) => {
      if (val === 'true') return true;
      else if (val === 'false') return false;
      else return err;
    });
}

export function defaultValuePipe<T, D>(defaultVal: D) {
  return pipe((val) => val ?? defaultVal) as Pipe<T, T | D>;
}

export function parseEnumPipe<E>(
  en: E,
  err = new ParseError('Parse enum pipe error'),
) {
  return pipe((val) => {
    if (_.values(en).includes(val)) return val;
    else return err;
  }) as Pipe<unknown, E[keyof E] | ParseError>;
}

export function parseJSONPipe<T = any>(
  err = new ParseError('Parse array pipe error'),
): Pipe<unknown, T | ParseError> {
  return pipe((val: unknown) => {
    if (_.isString(val)) {
      try {
        return JSON.parse(val);
      } catch (parseErr) {
        err.cause = parseErr.cause;
        return err;
      }
    } else return err;
  }) satisfies Pipe<unknown, T | ParseError>;
}

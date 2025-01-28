import { describe, test, expect } from 'bun:test';
import {
  ClassValidatorError,
  defaultValuePipe,
  parseBoolPipe,
  parseEnumPipe,
  ParseError,
  parseFloatPipe,
  parseIntPipe,
  parseJSONPipe,
  pipe,
  throwPipe,
  validatePipe,
} from '../../lib';
import { IsBoolean, IsNumber, IsString } from 'class-validator';
import { z } from 'zod';
import { values } from 'lodash-es';
import { JSONSchema } from 'class-validator-jsonschema';

describe('Pipes core functionality', () => {
  test('Pipe creation', () => {
    const fromVal = pipe('value 1'),
      fromFn = pipe(() => 'value 2'),
      fromPipe = pipe(fromVal);

    expect(fromVal()).toEqual('value 1');
    expect(fromFn()).toEqual('value 2');
    expect(fromPipe()).toEqual('value 1');
  });

  test('Transformations', () => {
    const p = pipe((s: string) => s.trim())
      .pipe(parseInt)
      .pipe((n) => n * 10)
      .pipe(String)
      .pipe((s) => s.split('').map((v) => parseInt(v)));

    expect(p('  1234   ')).toEqual([1, 2, 3, 4, 0]);
  });

  test('Async pipes', async () => {
    const p1 = pipe(Promise.resolve('value 1')).pipe((val) => ({
      key1: 'value 2',
      key2: val,
    }));

    const res1 = p1();
    expect(res1.key1).toEqual('value 2');
    expect(await res1.key2).toEqual('value 1');

    const p2 = pipe((s: string) => Promise.resolve(s))
      .flatPipe((s) => s.trim())
      .flatPipe(parseInt)
      .flatPipe((n) => n * 10);
    expect(await p2(' \t1234 \t')).toEqual(12340);
  });
});

describe('Parse pipes', () => {
  test('parseIntPipe', () => {
    const p = parseIntPipe();
    const res1 = p('1234');
    const res2 = p('ab123cd');

    expect(res1).toEqual(1234);
    expect(res2).toBeInstanceOf(ParseError);
    expect(p.metadata.schema).toEqual({ type: 'integer' });
  });

  test('parseFloatPipe', () => {
    const p = parseFloatPipe();
    const res1 = p('1234.567');
    const res2 = p('1.234567e3');
    const res3 = p('ab123cd');

    expect(res1).toBeCloseTo(1234.567, 3);
    expect(res2).toBeCloseTo(1234.567, 3);
    expect(res3).toBeInstanceOf(ParseError);
    expect(p.metadata.schema).toEqual({ type: 'number' });
  });

  test('parseBoolPipe', () => {
    const p = parseBoolPipe();
    const res1 = p('true');
    const res2 = p('false');
    const res3 = p('ab123cd');

    expect(res1).toBe(true);
    expect(res2).toBe(false);
    expect(res3).toBeInstanceOf(ParseError);
    expect(p.metadata.schema).toEqual({ type: 'boolean' });
  });

  test('defaultValuePipe', () => {
    const p = defaultValuePipe(1234);
    const res1 = p(undefined);
    const res2 = p(null);
    const res3 = p(5678);

    expect(res1).toBe(1234);
    expect(res2).toBe(1234);
    expect(res3).toBe(5678);
  });

  test('parseEnumPipe', () => {
    enum E {
      'key1' = 'value 1',
      'key2' = 'value 2',
      'key9' = 'value 3',
    }

    const p = parseEnumPipe(E);
    const res1 = p('value 1');
    const res2 = p('value 2');
    const res3 = p('value 3');
    const res4 = p('value 999');

    expect(res1).toBe(E.key1);
    expect(res2).toBe(E.key2);
    expect(res3).toBe(E.key9);
    expect(res4).toBeInstanceOf(ParseError);
    expect(p.metadata.schema).toEqual({ enum: values(E) });
  });

  test('parseJSONPipe', () => {
    const p = parseJSONPipe();
    const res1 = p('{"key": "value"}');
    const res2 = p('[1,2,3]');
    const res3 = p('key: 999');

    expect(res1).toEqual({ key: 'value' });
    expect(res2).toEqual([1, 2, 3]);
    expect(res3).toBeInstanceOf(ParseError);
    expect(p.metadata.schema).toEqual({ type: 'object' });
  });
});

describe('Throw pipe', () => {
  const p = throwPipe<number, ParseError>();
  try {
    const res = p(1234);
    expect(res).toBe(1234);
    p(new ParseError());
    expect(false);
  } catch (e) {
    expect(e).toBeInstanceOf(ParseError);
  }
});

describe('Validation pipes', () => {
  @JSONSchema({ additionalProperties: false })
  class UserClass {
    @IsString()
    name: string;
    @IsNumber()
    age: number;
    @IsBoolean()
    status: boolean;
  }

  const UserZod = z
    .object({
      name: z.string(),
      age: z.number(),
      status: z.boolean(),
    })
    .strict();

  const jsonSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
      status: { type: 'boolean' },
    },
    required: ['name', 'age', 'status'],
    additionalProperties: false,
  };

  const valid: unknown = { name: 'Vlad', age: 22, status: true },
    invalid: unknown = { name: 5140, age: '22', status: 'true' },
    extraFields: unknown = {
      name: 'Vlad',
      age: 22,
      status: true,
      someField: 'value',
    },
    emptyField: unknown = { name: 'Vlad', status: true };

  test('Class validator', async () => {
    const p = validatePipe(UserClass);

    const [res1, res2, res3, res4] = await Promise.all([
      p(valid),
      p(invalid),
      p(extraFields),
      p(emptyField),
    ]);

    expect(res1).not.toBeInstanceOf(ClassValidatorError);
    expect(res2).toBeInstanceOf(ClassValidatorError);
    expect(res3).not.toBeInstanceOf(ClassValidatorError);
    expect(res4).toBeInstanceOf(ClassValidatorError);
    expect(p.metadata.schema).toEqual(jsonSchema);
  });

  test('Zod', async () => {
    const p = validatePipe(UserZod, {});

    const [res1, res2, res3, res4] = await Promise.all([
      p(valid),
      p(invalid),
      p(extraFields),
      p(emptyField),
    ]);

    expect(res1).not.toBeInstanceOf(z.ZodError);
    expect(res2).toBeInstanceOf(z.ZodError);
    expect(res3).toBeInstanceOf(z.ZodError);
    expect(res4).toBeInstanceOf(z.ZodError);
    expect(p.metadata.schema).toEqual(jsonSchema);
  });
});

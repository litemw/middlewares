import { ClassSchema } from '../core';
import { pipe, Pipe } from './core';
import { validate, ValidationError, ValidatorOptions } from 'class-validator';
import { z } from 'zod';
import 'reflect-metadata';
import { ClassTransformOptions, plainToInstance } from 'class-transformer';

export class ClassValidatorError extends Error {
  name = 'ValidationError';
  constructor(public details: ValidationError[] = []) {
    super();
  }
}

export interface ClassParams {
  transform: Partial<ClassTransformOptions>;
  validation: Partial<ValidatorOptions>;
}

export function validatePipe<C>(
  schema: z.Schema<C>,
  params?: Partial<z.ParseParams>,
): Pipe<any, Promise<C | z.ZodError>>;

export function validatePipe<C extends object>(
  schema: ClassSchema<C>,
  params?: ClassParams,
): Pipe<any, Promise<C | ClassValidatorError>>;

export function validatePipe(
  schema: ClassSchema<object> | z.Schema,
  options?: Partial<z.ParseParams> | ClassParams,
): Pipe<any, Promise<any>> {
  if ('safeParseAsync' in schema) {
    return pipe(async (obj: unknown) => {
      const res = await schema.safeParseAsync(
        obj,
        options as Partial<z.ParseParams>,
      );
      if (res.success) return res.data;
      else return res.error;
    });
  } else {
    return pipe(async (obj: unknown) => {
      const validateObj = plainToInstance(
        schema,
        obj,
        (options as ClassParams)?.transform,
      );
      const res = await validate(
        validateObj,
        (options as ClassParams)?.validation,
      );
      if (!res.length) return obj;
      return new ClassValidatorError(res);
    });
  }
}

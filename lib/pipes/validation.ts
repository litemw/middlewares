import { ClassSchema } from '../core';
import Joi from 'joi';
import { pipe, Pipe } from './core';
import { validate, ValidationError } from 'class-validator';

export class ClassValidatorError extends Error {
  name = 'ValidationError';
  constructor(public details: ValidationError[] = []) {
    super();
  }
}

export function validatePipe<C extends object>(
  schema: ClassSchema<C>,
): Pipe<any, Promise<C | ClassValidatorError>>;

export function validatePipe<C>(
  schema: Joi.Schema<C>,
): Pipe<any, Promise<C | Joi.ValidationError>>;

export function validatePipe(
  schema: ClassSchema<object> | Joi.Schema,
): Pipe<any, Promise<any>> {
  if ('validateAsync' in schema) {
    return pipe(async (obj: any) => {
      try {
        return await schema.validateAsync(obj);
      } catch (err) {
        return err;
      }
    });
  } else {
    return pipe(async (obj: any) => {
      const validateObj: Record<string, any> = new schema();
      for (const key in obj) {
        validateObj[key] = obj[key];
      }
      const res = await validate(validateObj);
      if (!res.length) return obj;
      return new ClassValidatorError(res);
    });
  }
}

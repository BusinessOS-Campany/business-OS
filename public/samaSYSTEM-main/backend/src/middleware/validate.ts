import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../shared/errors.js';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const data = source === 'query' ? { ...req.query } : req[source];
    const result = schema.safeParse(data);
    if (!result.success) {
      const details = result.error.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(new ValidationError('Validation failed', details));
    }
    if (source !== 'query') {
      (req as any)[source] = result.data;
    }
    next();
  };
}

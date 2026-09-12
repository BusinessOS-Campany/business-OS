import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors.js';
import logger from '../shared/logger.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn(`${err.name}: ${err.message}`, {
      path: req.path,
      method: req.method,
      details: err.details,
    });
    res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
    return;
  }

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({ error: 'Internal server error' });
}

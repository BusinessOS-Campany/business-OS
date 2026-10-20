import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../shared/errors.js';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  let token: string | undefined;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  }

  if (!token) {
    token = req.query.token as string | undefined;
  }

  if (!token) {
    return next(new UnauthorizedError('No token provided'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    return next(new UnauthorizedError('Invalid or expired token'));
  }
}

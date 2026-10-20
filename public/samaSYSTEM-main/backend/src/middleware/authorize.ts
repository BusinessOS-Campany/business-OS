import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../shared/errors.js';

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ForbiddenError('Not authenticated');
    }
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  };
}

export function requirePermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ForbiddenError('Not authenticated');
    }
    // ADMIN role bypasses permission checks
    if (req.user.role === 'ADMIN') {
      return next();
    }
    const userPerms = req.user.permissions ?? [];
    const hasAll = permissions.every(p => userPerms.includes(p));
    if (!hasAll) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  };
}

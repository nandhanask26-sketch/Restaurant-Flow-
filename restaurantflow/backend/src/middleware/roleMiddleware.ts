import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userRole = req.user.role;
    const hasRole = allowedRoles.some((role) => {
      if (role === userRole) return true;
      if (
        (role === 'RESTAURANT_MANAGER' || role === 'MANAGER') &&
        (userRole === 'RESTAURANT_MANAGER' || userRole === 'MANAGER')
      ) {
        return true;
      }
      return false;
    });

    if (!hasRole) {
      return next(
        new ForbiddenError(
          `Access forbidden: requires one of the following roles: [${allowedRoles.join(', ')}]`
        )
      );
    }

    next();
  };
}

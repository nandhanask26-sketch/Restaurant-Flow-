import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/tokenGenerator';
import { UnauthorizedError } from '../utils/errors';
import { query } from '../config/database';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { restaurantId?: string };
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authorization token required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Token is missing');
    }

    const payload = verifyAccessToken(token);

    // If role is manager, lookup their associated restaurant if not in payload
    if ((payload.role === 'RESTAURANT_MANAGER' || payload.role === 'MANAGER') && !payload.restaurantId) {
      const { rows } = await query(
        `SELECT restaurant_id FROM restaurant_managers WHERE user_id = $1 LIMIT 1`,
        [payload.userId]
      );
      if (rows.length > 0) {
        payload.restaurantId = rows[0].restaurant_id;
      }
    }

    req.user = payload;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Access token expired. Please refresh.'));
    } else if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid access token'));
    } else {
      next(error);
    }
  }
}

export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    req.user = payload;
  } catch {
    // Ignore invalid optional tokens
  }
  next();
}

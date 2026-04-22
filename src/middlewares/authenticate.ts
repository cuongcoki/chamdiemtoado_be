/**
 * Node modules
 */
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

/**
 * Custom modules
 */
import { jwtService } from '@/helpers/jwt';
import { logger } from '@/helpers/winston';
import { UnauthorizedError, ForbiddenError } from '@/helpers/errorHandle';

/**
 * Types
 */
import type { Request, Response, NextFunction } from 'express';

/**
 * Extend Express Request interface để thêm user property
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
    }
  }
}

/**
 * @function authenticate
 * @description Middleware để verify access token từ Authorization header.
 *              Nếu token hợp lệ, user info sẽ được attach vào request.user
 *              Nếu không hợp lệ, throw UnauthorizedError
 *
 * @param {Request} req - Express request object (expect Bearer token in Authorization header)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @throws {UnauthorizedError} Nếu token không tồn tại, hết hạn hoặc không hợp lệ
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists and has Bearer format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token không tồn tại');
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Access token không tồn tại');
    }

    // Verify token and get payload
    const payload = jwtService.verifyAccessToken(token);

   

    // Attach user info to request
    req.user = {
      userId: payload.userId,
      role: payload.role,
    };

    // Proceed to next middleware
    next();
  } catch (error) {
    // Handle JWT specific errors
    if (error instanceof TokenExpiredError) {
      logger.warn('Access token expired', {
        ip: req.ip,
        url: req.originalUrl,
      });
      throw new UnauthorizedError('Access token đã hết hạn');
    }

    if (error instanceof JsonWebTokenError) {
      logger.warn('Invalid access token', {
        ip: req.ip,
        url: req.originalUrl,
      });
      throw new UnauthorizedError('Access token không hợp lệ');
    }

    // Re-throw if already an UnauthorizedError
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    // Log unexpected errors
    logger.error('Unexpected error during authentication:', error);
    throw new UnauthorizedError('Xác thực thất bại');
  }
};



/**
 * @function optionalAuth
 * @description Middleware để authenticate token nếu có, nhưng không bắt buộc.
 *              Hữu ích cho các endpoints public nhưng có thể customize cho logged-in users
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    // If no token, just proceed without attaching user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    // Try to verify token
    const payload = jwtService.verifyAccessToken(token);

    // Attach user info if token is valid
    req.user = {
      userId: payload.userId,
      role: payload.role,
    };

    next();
  } catch (error) {
    // If token is invalid, just proceed without user info
    // Don't throw error for optional auth
    logger.debug('Optional auth - invalid token', { error });
    next();
  }
};

/**
 * @function requireOwnership
 * @description Middleware để check xem user có phải là owner của resource không.
 *              Phải sử dụng sau authenticate middleware
 *
 * @param {string} paramName - Tên của param trong req.params (default: 'userId')
 *
 * @returns {Function} Express middleware function
 *
 * @throws {UnauthorizedError} Nếu user chưa được authenticate
 * @throws {ForbiddenError} Nếu user không phải là owner
 *
 * @example
 * // Check if user owns the resource
 * router.get('/users/:userId/profile', authenticate, requireOwnership('userId'), controller);
 *
 * // Admin bypass ownership check
 * router.get('/users/:userId/profile', authenticate, requireOwnership('userId', true), controller);
 */
export const requireOwnership = (
  paramName: string = 'userId',
  adminBypass: boolean = false
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Vui lòng đăng nhập để truy cập');
    }

    // Admin can access all resources
    if (adminBypass && req.user.role === 'admin') {
      return next();
    }

    const resourceOwnerId = req.params[paramName];

    if (!resourceOwnerId) {
      throw new ForbiddenError('Resource ID không hợp lệ');
    }

    // Check ownership
    if (req.user.userId !== resourceOwnerId) {
      logger.warn('Ownership check failed', {
        userId: req.user.userId,
        resourceOwnerId,
        url: req.originalUrl,
      });

      throw new ForbiddenError('Bạn không có quyền truy cập resource này');
    }

    next();
  };
};

/**
 * Export default authenticate middleware
 */
export default authenticate;
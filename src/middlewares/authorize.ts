/**
 * Custom modules
 */
import { logger } from '@/helpers/winston';
import { UnauthorizedError, ForbiddenError } from '@/helpers/errorHandle';

/**
 * Types
 */
import type { Request, Response, NextFunction } from 'express';

/**
 * @function authorize
 * @description Middleware để check role của user.
 *              Phải sử dụng sau authenticate middleware
 *
 * @param {...string[]} allowedRoles - Các roles được phép truy cập
 *
 * @returns {Function} Express middleware function
 *
 * @throws {UnauthorizedError} Nếu user chưa được authenticate
 * @throws {ForbiddenError} Nếu user không có quyền truy cập
 *
 * @example
 * // Chỉ admin
 * router.get('/admin', authenticate, authorize('admin'), controller);
 *
 * // Admin hoặc teacher
 * router.get('/teachers', authenticate, authorize('admin', 'teacher'), controller);
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if user is authenticated
    if (!req.user) {
      throw new UnauthorizedError('Vui lòng đăng nhập để truy cập');
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt', {
        userId: req.user.userId,
        role: req.user.role,
        allowedRoles,
        url: req.originalUrl,
      });

      throw new ForbiddenError(
        `Chỉ ${allowedRoles.join(', ')} mới có quyền truy cập`
      );
    }

    // User has permission, proceed
    next();
  };
};
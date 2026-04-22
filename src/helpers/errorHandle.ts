import { validationResult, ValidationError as ExpressValidationError, Result } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';

import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  RequestValidationError,
  UnauthorizedError,
} from '@/helpers/AppErrors';

// Re-export để các file khác chỉ cần import từ 1 chỗ
export * from '@/helpers/AppErrors';

// ========================================
// VALIDATE MIDDLEWARE (express-validator)
// ========================================
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors: Result<ExpressValidationError> = validationResult(req);

  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e: ExpressValidationError) => ({
      field: e.type === 'field' ? e.path : undefined,
      message: e.msg,
      value: e.type === 'field' ? e.value : undefined,
    }));
    throw new RequestValidationError('Lỗi validation dữ liệu', formatted);
  }

  next();
};

// ========================================
// ASYNC HANDLER
// ========================================
export const asyncHandler = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ========================================
// 404 HANDLER
// ========================================
export const notFoundHandler = (req: Request, _res: Response, _next: NextFunction) => {
  throw new NotFoundError(`Route ${req.originalUrl} không tồn tại`);
};

// ========================================
// MONGOOSE & JWT ERROR CONVERTERS (private)
// ========================================
const fromMongooseValidation = (error: any): AppError => {
  const errors = Object.values(error.errors).map((e: any) => ({
    field: e.path,
    message: e.message,
    value: e.value,
  }));
  return new RequestValidationError('Lỗi validation dữ liệu', errors);
};

const fromDuplicateKey = (error: any): AppError => {
  const field = Object.keys(error.keyValue)[0] ?? 'field';
  return new ConflictError(`${field} '${error.keyValue[field] as string}' đã tồn tại`);
};

const fromCastError = (error: any): AppError =>
  new BadRequestError(`${error.path} không hợp lệ: ${error.value}`);

const fromJWT = (error: any): AppError => {
  if (error.name === 'TokenExpiredError') return new UnauthorizedError('Token đã hết hạn');
  return new UnauthorizedError('Token không hợp lệ');
};

// ========================================
// GLOBAL ERROR HANDLER
// ========================================
export const enhancedErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error.name === 'ValidationError') {
    appError = fromMongooseValidation(error);
  } else if (error.code === 11000) {
    appError = fromDuplicateKey(error);
  } else if (error.name === 'CastError') {
    appError = fromCastError(error);
  } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    appError = fromJWT(error);
  } else {
    appError = new AppError(error.message || 'Lỗi server nội bộ');
    appError.stack = error.stack;
  }

  // Xóa file upload nếu request bị lỗi (tránh file orphan)
  const uploaded: Express.Multer.File[] = [
    ...((req.files as Express.Multer.File[]) ?? []),
    ...(req.file ? [req.file] : []),
  ];
  uploaded.forEach((f) => { try { fs.unlinkSync(f.path); } catch {} });

  console.error('❌ ERROR:', {
    statusCode: appError.statusCode,
    message: appError.message,
    url: req.originalUrl,
    method: req.method,
  });

  const response: Record<string, any> = {
    success: false,
    message: appError.message,
    statusCode: appError.statusCode,
  };

  if (appError.errors) response.errors = appError.errors;
  if (process.env.NODE_ENV === 'development') response.stack = appError.stack;

  res.status(appError.statusCode).json(response);
};

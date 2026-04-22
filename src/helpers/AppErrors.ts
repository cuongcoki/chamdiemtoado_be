import HttpStatus from '@/constants/httpStatus';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errors?: any;

  constructor(message: string, statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Yêu cầu không hợp lệ', errors?: any) {
    super(message, HttpStatus.BAD_REQUEST);
    this.errors = errors;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Chưa xác thực') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Bạn không có quyền truy cập') {
    super(message, HttpStatus.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Không tìm thấy tài nguyên') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class RequestValidationError extends AppError {
  constructor(message: string = 'Dữ liệu không hợp lệ', errors?: any) {
    super(message, HttpStatus.BAD_REQUEST);
    this.errors = errors;
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message: string = 'Dung lượng file quá lớn') {
    super(message, HttpStatus.Max_Payload_Size);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Xung đột dữ liệu') {
    super(message, HttpStatus.CONFLICT);
  }
}

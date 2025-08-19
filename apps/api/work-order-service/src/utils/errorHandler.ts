import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleValidationError = (error: ZodError) => {
  if (!error.issues || !Array.isArray(error.issues)) {
    return new AppError('输入验证失败', 400);
  }
  
  const errors = error.issues.map(err => ({
    field: err.path?.join?.('.') || 'unknown',
    message: err.message || 'Validation error',
  }));

  return new AppError(`输入验证失败: ${errors.map(e => e.message).join(', ')}`, 400);
};

export const handlePrismaError = (error: any) => {
  if (error.code === 'P2002') {
    return new AppError('数据已存在，违反唯一性约束', 409);
  }
  
  if (error.code === 'P2025') {
    return new AppError('请求的记录未找到', 404);
  }
  
  if (error.code === 'P2003') {
    return new AppError('外键约束失败，相关记录不存在', 400);
  }

  return new AppError('数据库操作失败', 500);
};

export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let err = error;

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    err = handleValidationError(error);
  }

  // Handle Prisma errors
  if (error.message.includes('P2002') || error.message.includes('P2025') || error.message.includes('P2003')) {
    err = handlePrismaError(error);
  }

  // Handle operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Handle programming errors
  console.error('ERROR:', error);
  
  return res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : error.message,
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
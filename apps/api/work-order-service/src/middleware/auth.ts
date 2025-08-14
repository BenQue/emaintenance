import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole } from '@emaintenance/database';
import { AppError, asyncHandler } from '../utils/errorHandler';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        firstName: string;
        lastName: string;
      };
    }
  }
}

const prisma = new PrismaClient();

export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('请提供有效的认证token', 401);
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    throw new AppError('认证token缺失', 401);
  }

  try {
    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new AppError('JWT密钥未配置', 500);
    }

    const decoded = jwt.verify(token, jwtSecret) as { 
      userId: string; 
      email: string; 
      role: UserRole 
    };

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError('用户不存在', 401);
    }

    if (!user.isActive) {
      throw new AppError('用户账户已被禁用', 401);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('无效的认证token', 401);
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('认证token已过期', 401);
    }
    throw error;
  }
});

export const authorize = (...roles: UserRole[]) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('权限不足', 403);
    }

    next();
  });
};

// Middleware to check if user can access work order
export const checkWorkOrderAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('用户未认证', 401);
  }

  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  // Admins and supervisors have access to all work orders
  if (['ADMIN', 'SUPERVISOR'].includes(userRole)) {
    next();
    return;
  }

  // For other roles, check if they created or are assigned to the work order
  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    select: {
      createdById: true,
      assignedToId: true,
    },
  });

  if (!workOrder) {
    throw new AppError('工单不存在', 404);
  }

  const hasAccess = 
    workOrder.createdById === userId || 
    workOrder.assignedToId === userId;

  if (!hasAccess) {
    throw new AppError('无权访问此工单', 403);
  }

  next();
});
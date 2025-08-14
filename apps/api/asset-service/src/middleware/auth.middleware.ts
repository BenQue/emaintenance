import { Request, Response, NextFunction } from 'express';
import { UserRole, PrismaClient } from '@emaintenance/database';
import { verifyToken, JWTPayload } from '../utils/jwt';
import logger from '../utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload & { isActive: boolean };
    }
  }
}

// Singleton Prisma instance for user verification
const prisma = new PrismaClient();

/**
 * JWT Authentication middleware
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] || `asset-${Date.now()}`;
  
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: No Bearer token provided', {
        correlationId,
        path: req.path,
        method: req.method
      });
      
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const payload = verifyToken(token);
      
      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, isActive: true, role: true }
      });

      if (!user || !user.isActive) {
        logger.warn('Authentication failed: User not found or inactive', {
          correlationId,
          userId: payload.userId,
          userExists: !!user,
          isActive: user?.isActive
        });
        
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token',
          timestamp: new Date().toISOString(),
        });
      }

      // Add user to request
      req.user = {
        ...payload,
        isActive: user.isActive,
      };

      logger.debug('User authenticated successfully', {
        correlationId,
        userId: payload.userId,
        role: payload.role
      });

      next();
    } catch (tokenError) {
      logger.warn('Authentication failed: Invalid token', {
        correlationId,
        error: tokenError instanceof Error ? tokenError.message : 'Unknown token error'
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const correlationId = req.headers['x-correlation-id'] || `asset-${Date.now()}`;
    
    if (!req.user) {
      logger.warn('Authorization failed: User not authenticated', {
        correlationId,
        path: req.path
      });
      
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed: Insufficient permissions', {
        correlationId,
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        timestamp: new Date().toISOString(),
      });
    }

    logger.debug('User authorized successfully', {
      correlationId,
      userId: req.user.userId,
      role: req.user.role,
      path: req.path
    });

    next();
  };
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = authorize([UserRole.ADMIN]);

/**
 * Middleware to require supervisor or admin role
 */
export const requireSupervisor = authorize([UserRole.SUPERVISOR, UserRole.ADMIN]);

/**
 * Middleware to require technician, supervisor, or admin role
 */
export const requireTechnician = authorize([UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN]);
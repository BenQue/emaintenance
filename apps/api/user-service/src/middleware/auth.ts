import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@emaintenance/database';
import { verifyToken } from '../utils/jwt';
import { AuthService } from '../services/AuthService';
import { JWTPayload } from '../types/auth';

// Singleton AuthService instance to avoid creating new instances on every request
const authService = new AuthService();

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload & { isActive: boolean };
    }
  }
}

/**
 * JWT Authentication middleware
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
      const user = await authService.getUserById(payload.userId);

      if (!user || !user.isActive) {
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

      next();
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
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
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        timestamp: new Date().toISOString(),
      });
    }

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
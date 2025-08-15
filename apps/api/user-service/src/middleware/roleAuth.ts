import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

/**
 * Middleware to authorize users based on their roles
 * @param allowedRoles - Array of roles that are allowed to access the route
 * @returns Express middleware function
 */
export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userRole = req.userRole;

      if (!userRole) {
        return res.status(401).json({
          error: 'User role not found',
          message: '用户角色信息缺失'
        });
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: '权限不足，无法执行此操作',
          required: allowedRoles,
          current: userRole
        });
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: '服务器内部错误'
      });
    }
  };
};

/**
 * Check if user has admin privileges
 */
export const requireAdmin = authorizeRoles(['ADMIN']);

/**
 * Check if user has supervisor or admin privileges
 */
export const requireSupervisorOrAdmin = authorizeRoles(['SUPERVISOR', 'ADMIN']);

/**
 * Check if user has management privileges (supervisor or admin)
 */
export const requireManagement = authorizeRoles(['SUPERVISOR', 'ADMIN']);

/**
 * Check if user has technician, supervisor, or admin privileges
 */
export const requireTechnical = authorizeRoles(['TECHNICIAN', 'SUPERVISOR', 'ADMIN']);
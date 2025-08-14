import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@emaintenance/database';
import { JWTPayload } from '../utils/jwt';
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload & {
                isActive: boolean;
            };
        }
    }
}
/**
 * JWT Authentication middleware
 */
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Role-based authorization middleware
 */
export declare const authorize: (allowedRoles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Middleware to require admin role
 */
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Middleware to require supervisor or admin role
 */
export declare const requireSupervisor: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Middleware to require technician, supervisor, or admin role
 */
export declare const requireTechnician: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.middleware.d.ts.map
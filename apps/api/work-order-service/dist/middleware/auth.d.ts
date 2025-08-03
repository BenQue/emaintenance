import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@emaintanance/database';
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
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => void;
export declare const authorize: (...roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const checkWorkOrderAccess: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map
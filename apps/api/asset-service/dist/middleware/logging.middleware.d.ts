import { Request, Response, NextFunction } from 'express';
/**
 * Request logging middleware
 */
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Error logging middleware
 */
export declare const errorLogger: (err: Error, req: Request, res: Response, next: NextFunction) => void;
/**
 * Rate limiting logging middleware
 */
export declare const rateLimitLogger: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=logging.middleware.d.ts.map
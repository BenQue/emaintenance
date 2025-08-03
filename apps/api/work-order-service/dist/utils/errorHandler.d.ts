import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode?: number);
}
export declare const handleValidationError: (error: ZodError) => AppError;
export declare const handlePrismaError: (error: any) => AppError;
export declare const globalErrorHandler: (error: Error, req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map
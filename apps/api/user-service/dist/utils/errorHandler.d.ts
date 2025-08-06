import { ZodError } from 'zod';
import { ApiResponse } from '../types/auth';
/**
 * Format Zod validation errors into user-friendly messages
 */
export declare function formatValidationErrors(error: ZodError): string;
/**
 * Create standardized API error response
 */
export declare function createErrorResponse(error: string, statusCode?: number): ApiResponse;
/**
 * Create standardized API success response
 */
export declare function createSuccessResponse<T>(data: T): ApiResponse<T>;
/**
 * Determine appropriate HTTP status code for different error types
 */
export declare function getErrorStatusCode(error: Error): number;
//# sourceMappingURL=errorHandler.d.ts.map
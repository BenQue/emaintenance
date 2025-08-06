import { ZodError } from 'zod';
import { ApiResponse } from '../types/auth';

/**
 * Format Zod validation errors into user-friendly messages
 */
export function formatValidationErrors(error: ZodError): string {
  return error.issues
    .map((err: any) => {
      const field = err.path.length > 0 ? err.path.join('.') : 'field';
      return `${field}: ${err.message}`;
    })
    .join(', ');
}

/**
 * Create standardized API error response
 */
export function createErrorResponse(error: string, statusCode: number = 500): ApiResponse {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create standardized API success response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Determine appropriate HTTP status code for different error types
 */
export function getErrorStatusCode(error: Error): number {
  const message = error.message.toLowerCase();
  
  if (message.includes('already exists')) return 409; // Conflict
  if (message.includes('invalid credentials') || message.includes('disabled')) return 401; // Unauthorized
  if (message.includes('not found')) return 404; // Not Found
  if (message.includes('authentication required')) return 401; // Unauthorized
  if (message.includes('insufficient permissions')) return 403; // Forbidden
  
  return 500; // Internal Server Error
}
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatValidationErrors = formatValidationErrors;
exports.createErrorResponse = createErrorResponse;
exports.createSuccessResponse = createSuccessResponse;
exports.getErrorStatusCode = getErrorStatusCode;
/**
 * Format Zod validation errors into user-friendly messages
 */
function formatValidationErrors(error) {
    return error.issues
        .map((err) => {
        const field = err.path.length > 0 ? err.path.join('.') : 'field';
        return `${field}: ${err.message}`;
    })
        .join(', ');
}
/**
 * Create standardized API error response
 */
function createErrorResponse(error, statusCode = 500) {
    return {
        success: false,
        error,
        timestamp: new Date().toISOString(),
    };
}
/**
 * Create standardized API success response
 */
function createSuccessResponse(data) {
    return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
    };
}
/**
 * Determine appropriate HTTP status code for different error types
 */
function getErrorStatusCode(error) {
    const message = error.message.toLowerCase();
    if (message.includes('already exists'))
        return 409; // Conflict
    if (message.includes('invalid credentials') || message.includes('disabled'))
        return 401; // Unauthorized
    if (message.includes('not found'))
        return 404; // Not Found
    if (message.includes('authentication required'))
        return 401; // Unauthorized
    if (message.includes('insufficient permissions'))
        return 403; // Forbidden
    return 500; // Internal Server Error
}

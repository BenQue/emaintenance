import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const correlationId = req.headers['x-correlation-id'] || `asset-${Date.now()}`;
  
  // Add correlation ID to request headers for other middleware
  req.headers['x-correlation-id'] = correlationId as string;
  
  // Log incoming request
  logger.info('Incoming request', {
    correlationId,
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString()
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - startTime;
    
    // Log response details
    logger.info('Request completed', {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      success: res.statusCode < 400
    });

    // Log error responses with more detail
    if (res.statusCode >= 400) {
      logger.warn('Request failed', {
        correlationId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseBody: body,
        timestamp: new Date().toISOString()
      });
    }

    return originalJson.call(this, body);
  };

  next();
};

/**
 * Error logging middleware
 */
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] || `asset-${Date.now()}`;
  
  logger.error('Unhandled error in request', {
    correlationId,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  // Send error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      details: err.message,
      stack: err.stack 
    })
  });
};

/**
 * Rate limiting logging middleware
 */
export const rateLimitLogger = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] || `asset-${Date.now()}`;
  
  // This would be called when rate limit is exceeded
  logger.warn('Rate limit exceeded', {
    correlationId,
    ip: req.ip || req.connection.remoteAddress,
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
  
  next();
};
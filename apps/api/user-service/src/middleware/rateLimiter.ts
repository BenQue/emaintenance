import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints to prevent brute force attacks
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs for auth endpoints
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for successful requests
  skipSuccessfulRequests: true,
});

/**
 * General rate limiter for all API endpoints
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 100, // Much higher limit for development
  message: {
    success: false,
    error: 'Rate limit exceeded, please try again later',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests in development
  skipSuccessfulRequests: process.env.NODE_ENV === 'development',
});
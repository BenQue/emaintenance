import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import workOrderRoutes from './routes/workOrders';
import assignmentRuleRoutes from './routes/assignmentRules';
import notificationRoutes from './routes/notifications';
import { globalErrorHandler } from './utils/errorHandler';

const app = express();
const PORT = process.env.PORT || 3002;

// Rate limiting configuration
const isDevelopment = process.env.NODE_ENV === 'development';

// General rate limiter for most operations (viewing, listing)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 50000 : 1000, // Very high limit for development viewing operations
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(15 * 60 * 1000 / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for create/update/delete operations
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 200 : 50, // Stricter limit for write operations
  message: {
    error: 'Too many create/update requests from this IP, please try again later.',
    retryAfter: Math.ceil(15 * 60 * 1000 / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors());
// Apply general rate limiter to all routes by default (production only)
if (process.env.NODE_ENV === 'production') {
  app.use(generalLimiter);
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'work-order-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/assignment-rules', assignmentRuleRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Work order service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
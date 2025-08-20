import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { PrismaClient } from '@emaintenance/database';
import { createWorkOrderRoutes } from './routes/workOrders';
import { createAssignmentRuleRoutes } from './routes/assignmentRules';
import { createNotificationRoutes } from './routes/notifications';
import { globalErrorHandler } from './utils/errorHandler';

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize Prisma client with error handling
let prisma: PrismaClient;

try {
  prisma = new PrismaClient();
  console.log('Prisma client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Prisma client:', error);
  process.exit(1);
}

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

// Health check with database connectivity test
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({ 
      status: 'ok', 
      service: 'work-order-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      service: 'work-order-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API Routes - Create routes with PrismaClient dependency injection
app.use('/api/work-orders', createWorkOrderRoutes(prisma));
app.use('/api/assignment-rules', createAssignmentRuleRoutes(prisma));
app.use('/api/notifications', createNotificationRoutes(prisma));

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(globalErrorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down Work Order Service...');
  try {
    await prisma.$disconnect();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  try {
    await prisma.$disconnect();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server with error handling
const startServer = async () => {
  try {
    // Test database connection before starting server
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection test successful');
    
    app.listen(PORT, () => {
      console.log(`Work order service running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server - database connection failed:', error);
    process.exit(1);
  }
};

startServer();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@emaintenance/database';
import assetRoutes from './routes';
import logger from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3003;
const prisma = new PrismaClient();

// Global middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy if behind load balancer
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// API routes
app.use('/api', assetRoutes);

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] || `asset-${Date.now()}`;
  
  logger.error('Unhandled application error', {
    correlationId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && {
      details: err.message,
      stack: err.stack,
    }),
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found', {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    error: 'Route not found',
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down Asset Service...');
  
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    process.exit(1);
  }
});

// Start server
app.listen(PORT, () => {
  logger.info('Asset service started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
});
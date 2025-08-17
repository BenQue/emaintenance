import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import assetRoutes from './routes/assets';
import userRoutes from './routes/users';
import settingsRoutes from './routes/settings';
// import importRoutes from './routes/import';
import { generalRateLimit } from './middleware/rateLimiter';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(helmet());
// Apply rate limiting only in production
if (process.env.NODE_ENV === 'production') {
  app.use(generalRateLimit);
}
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  res.status(500).json({ 
    error: 'Internal Server Error',
    service: 'user-service',
    timestamp: new Date().toISOString(),
  });
});

// Health check with enhanced info
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'user-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    dockerUpdate: '🚀 本地开发模式启动！',
    hotReload: true,
    developmentMode: '⚡ 实时热重载开发',
    feature: '代码修改立即生效！',
    lastModified: new Date().toLocaleString('zh-CN')
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
// app.use('/api/import', importRoutes);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    service: 'user-service',
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] User service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
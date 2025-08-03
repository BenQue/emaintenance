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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(limiter);
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
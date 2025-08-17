import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';

export interface ServiceConfig {
  serviceName: string;
  port: number;
  version?: string;
  corsOrigin?: string;
}

export abstract class BaseService {
  protected app: Application;
  protected config: ServiceConfig;
  private server?: import('http').Server;

  constructor(config: ServiceConfig) {
    this.app = express();
    this.config = {
      version: '1.0.0',
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      ...config,
    };

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: this.config.corsOrigin,
      credentials: true,
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        service: this.config.serviceName,
        version: this.config.version,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // Let subclasses define their routes
    this.defineRoutes();

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        path: req.originalUrl,
        service: this.config.serviceName,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      console.error(`[${new Date().toISOString()}] Error in ${this.config.serviceName}:`, err.message);
      
      res.status(500).json({
        error: 'Internal Server Error',
        service: this.config.serviceName,
        timestamp: new Date().toISOString(),
      });
    });
  }

  protected abstract defineRoutes(): void;

  public start(): void {
    this.server = this.app.listen(this.config.port, () => {
      console.log(`[${new Date().toISOString()}] ${this.config.serviceName} running on port ${this.config.port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log(`SIGTERM received, shutting down ${this.config.serviceName} gracefully`);
      this.server?.close(() => {
        console.log(`${this.config.serviceName} terminated`);
      });
    });
  }
}
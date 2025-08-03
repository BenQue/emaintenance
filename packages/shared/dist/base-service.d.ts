import { Application } from 'express';
export interface ServiceConfig {
    serviceName: string;
    port: number;
    version?: string;
    corsOrigin?: string;
}
export declare abstract class BaseService {
    protected app: Application;
    protected config: ServiceConfig;
    private server?;
    constructor(config: ServiceConfig);
    private setupMiddleware;
    private setupRoutes;
    private setupErrorHandling;
    protected abstract defineRoutes(): void;
    start(): void;
}
//# sourceMappingURL=base-service.d.ts.map
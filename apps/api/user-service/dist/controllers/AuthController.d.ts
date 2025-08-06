import { Request, Response } from 'express';
export declare class AuthController {
    private authService;
    constructor();
    /**
     * Register a new user
     */
    register: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Login user
     */
    login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get current user profile
     */
    profile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=AuthController.d.ts.map
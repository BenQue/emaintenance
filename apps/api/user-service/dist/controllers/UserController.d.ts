import { Request, Response } from 'express';
export declare class UserController {
    private userService;
    constructor();
    /**
     * Get paginated list of users with filtering
     */
    getUsers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get user by ID
     */
    getUserById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Create new user
     */
    createUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Update user
     */
    updateUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Update user role
     */
    updateUserRole: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Update user status (activate/deactivate)
     */
    updateUserStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Delete user (soft delete)
     */
    deleteUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Bulk operations on users
     */
    bulkOperation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get users by role (for dropdowns)
     */
    getUsersByRole: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Search users by query
     */
    searchUsers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=UserController.d.ts.map
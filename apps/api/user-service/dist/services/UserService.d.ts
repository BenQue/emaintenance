import { User, UserRole } from '@emaintenance/database';
export interface CreateUserInput {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    employeeId?: string;
    role?: UserRole;
}
export interface UpdateUserInput {
    email?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    employeeId?: string;
    role?: UserRole;
    isActive?: boolean;
}
export interface UserListQuery {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    isActive?: boolean;
}
export interface UserListResponse {
    users: User[];
    total: number;
    page: number;
    limit: number;
}
export interface BulkUserOperation {
    userIds: string[];
    operation: 'activate' | 'deactivate' | 'delete';
}
export declare class UserService {
    private userRepository;
    constructor();
    /**
     * Get paginated list of users with filtering
     */
    getUsers(query: UserListQuery): Promise<UserListResponse>;
    /**
     * Get user by ID
     */
    getUserById(id: string): Promise<User | null>;
    /**
     * Create new user (admin function)
     */
    createUser(data: CreateUserInput): Promise<User>;
    /**
     * Update user
     */
    updateUser(id: string, data: UpdateUserInput): Promise<User>;
    /**
     * Update user role
     */
    updateUserRole(id: string, role: UserRole): Promise<User>;
    /**
     * Update user status (activate/deactivate)
     */
    updateUserStatus(id: string, isActive: boolean): Promise<User>;
    /**
     * Delete user (soft delete by deactivating)
     */
    deleteUser(id: string): Promise<User>;
    /**
     * Bulk operations on users
     */
    bulkOperation(operation: BulkUserOperation): Promise<{
        success: number;
        failed: number;
        errors: string[];
    }>;
    /**
     * Get users by role (for dropdowns)
     */
    getUsersByRole(role: UserRole): Promise<User[]>;
    /**
     * Search users by name or email
     */
    searchUsers(query: string, limit?: number): Promise<User[]>;
}
//# sourceMappingURL=UserService.d.ts.map
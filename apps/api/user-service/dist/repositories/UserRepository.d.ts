import { User, UserRole } from '@emaintenance/database';
import { RegisterInput } from '../utils/validation';
export interface FindManyOptions {
    skip: number;
    limit: number;
    search?: string;
    role?: UserRole;
    isActive?: boolean;
}
export interface FindManyResult {
    users: User[];
    total: number;
}
export declare class UserRepository {
    /**
     * Create a new user
     */
    create(userData: RegisterInput & {
        password: string;
    }): Promise<User>;
    /**
     * Find user by email
     */
    findByEmail(email: string): Promise<User | null>;
    /**
     * Find user by username
     */
    findByUsername(username: string): Promise<User | null>;
    /**
     * Find user by email or username (optimized single query)
     */
    findByIdentifier(identifier: string): Promise<User | null>;
    /**
     * Find user by ID
     */
    findById(id: string): Promise<User | null>;
    /**
     * Check if email already exists
     */
    emailExists(email: string): Promise<boolean>;
    /**
     * Check if username already exists
     */
    usernameExists(username: string): Promise<boolean>;
    /**
     * Check if employee ID already exists
     */
    employeeIdExists(employeeId: string): Promise<boolean>;
    /**
     * Find many users with filtering and pagination
     */
    findMany(options: FindManyOptions): Promise<FindManyResult>;
    /**
     * Update user
     */
    update(id: string, data: Partial<User>): Promise<User>;
    /**
     * Find users by role
     */
    findByRole(role: UserRole): Promise<User[]>;
    /**
     * Search users by query
     */
    search(query: string, limit: number): Promise<User[]>;
    /**
     * Check if user has active work orders
     */
    hasActiveWorkOrders(userId: string): Promise<boolean>;
}
//# sourceMappingURL=UserRepository.d.ts.map
import { User } from '@emaintenance/database';
import { RegisterInput, LoginInput } from '../utils/validation';
import { AuthResponse } from '../types/auth';
export declare class AuthService {
    private userRepository;
    constructor();
    /**
     * Register a new user
     */
    register(data: RegisterInput): Promise<AuthResponse>;
    /**
     * Login user
     */
    login(data: LoginInput): Promise<AuthResponse>;
    /**
     * Get user by ID (for middleware use)
     */
    getUserById(id: string): Promise<User | null>;
}
//# sourceMappingURL=AuthService.d.ts.map
import { User, UserRole } from '@emaintenance/database';
import { UserRepository } from '../repositories/UserRepository';
import { hashPassword } from '../utils/crypto';

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

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Get paginated list of users with filtering
   */
  async getUsers(query: UserListQuery): Promise<UserListResponse> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Max 100 per page
    const skip = (page - 1) * limit;

    const { users, total } = await this.userRepository.findMany({
      skip,
      limit,
      search: query.search,
      role: query.role,
      isActive: query.isActive,
    });

    return {
      users,
      total,
      page,
      limit,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  /**
   * Create new user (admin function)
   */
  async createUser(data: CreateUserInput): Promise<User> {
    // Check if user already exists
    const [emailExists, usernameExists] = await Promise.all([
      this.userRepository.emailExists(data.email),
      this.userRepository.usernameExists(data.username),
    ]);

    if (emailExists) {
      const error = new Error('Email already exists') as any;
      error.code = 'EMAIL_EXISTS';
      throw error;
    }

    if (usernameExists) {
      const error = new Error('Username already exists') as any;
      error.code = 'USERNAME_EXISTS';
      throw error;
    }

    // Check employee ID if provided
    if (data.employeeId) {
      const employeeIdExists = await this.userRepository.employeeIdExists(data.employeeId);
      if (employeeIdExists) {
        throw new Error('Employee ID already exists');
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    return this.userRepository.create({
      ...data,
      password: hashedPassword,
    });
  }

  /**
   * Update user
   */
  async updateUser(id: string, data: UpdateUserInput): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Check for unique constraints if being updated
    if (data.email && data.email !== user.email) {
      const emailExists = await this.userRepository.emailExists(data.email);
      if (emailExists) {
        const error = new Error('Email already exists') as any;
        error.code = 'EMAIL_EXISTS';
        throw error;
      }
    }

    if (data.username && data.username !== user.username) {
      const usernameExists = await this.userRepository.usernameExists(data.username);
      if (usernameExists) {
        const error = new Error('Username already exists') as any;
        error.code = 'USERNAME_EXISTS';
        throw error;
      }
    }

    if (data.employeeId && data.employeeId !== user.employeeId) {
      const employeeIdExists = await this.userRepository.employeeIdExists(data.employeeId);
      if (employeeIdExists) {
        const error = new Error('Employee ID already exists') as any;
        error.code = 'EMPLOYEE_ID_EXISTS';
        throw error;
      }
    }

    return this.userRepository.update(id, data);
  }

  /**
   * Update user role
   */
  async updateUserRole(id: string, role: UserRole): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    return this.userRepository.update(id, { role });
  }

  /**
   * Update user status (activate/deactivate)
   */
  async updateUserStatus(id: string, isActive: boolean): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    return this.userRepository.update(id, { isActive });
  }

  /**
   * Delete user (soft delete by deactivating)
   */
  async deleteUser(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has active work orders
    const hasActiveWorkOrders = await this.userRepository.hasActiveWorkOrders(id);
    if (hasActiveWorkOrders) {
      throw new Error('Cannot delete user with active work orders. Please reassign or complete them first.');
    }

    // Soft delete by deactivating
    return this.userRepository.update(id, { isActive: false });
  }

  /**
   * Bulk operations on users
   */
  async bulkOperation(operation: BulkUserOperation): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const userId of operation.userIds) {
      try {
        switch (operation.operation) {
          case 'activate':
            await this.updateUserStatus(userId, true);
            break;
          case 'deactivate':
            await this.updateUserStatus(userId, false);
            break;
          case 'delete':
            await this.deleteUser(userId);
            break;
        }
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Get users by role (for dropdowns)
   */
  async getUsersByRole(role: UserRole): Promise<User[]> {
    return this.userRepository.findByRole(role);
  }

  /**
   * Search users by name or email
   */
  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    return this.userRepository.search(query, limit);
  }
}
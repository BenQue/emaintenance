import { apiClient } from './api-client';

// User types based on backend interfaces
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  employeeId?: string;
  role: 'EMPLOYEE' | 'TECHNICIAN' | 'SUPERVISOR' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  employeeId?: string;
  role?: 'EMPLOYEE' | 'TECHNICIAN' | 'SUPERVISOR' | 'ADMIN';
}

export interface UpdateUserInput {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  role?: 'EMPLOYEE' | 'TECHNICIAN' | 'SUPERVISOR' | 'ADMIN';
  isActive?: boolean;
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'EMPLOYEE' | 'TECHNICIAN' | 'SUPERVISOR' | 'ADMIN';
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

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: string[];
}

export class UserService {
  private baseUrl = '/api/users';

  /**
   * Get paginated list of users with filtering
   */
  async getUsers(query: UserListQuery = {}): Promise<UserListResponse> {
    const searchParams = new URLSearchParams();
    
    if (query.page) searchParams.append('page', query.page.toString());
    if (query.limit) searchParams.append('limit', query.limit.toString());
    if (query.search) searchParams.append('search', query.search);
    if (query.role) searchParams.append('role', query.role);
    if (query.isActive !== undefined) searchParams.append('isActive', query.isActive.toString());

    const url = `${this.baseUrl}?${searchParams.toString()}`;
    const response = await apiClient.get(url);
    return response.data as UserListResponse;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response.data as User;
  }

  /**
   * Create new user
   */
  async createUser(userData: CreateUserInput): Promise<User> {
    const response = await apiClient.post(this.baseUrl, userData);
    return response.data as User;
  }

  /**
   * Update user
   */
  async updateUser(id: string, userData: UpdateUserInput): Promise<User> {
    const response = await apiClient.put(`${this.baseUrl}/${id}`, userData);
    return response.data as User;
  }

  /**
   * Update user role
   */
  async updateUserRole(id: string, role: User['role']): Promise<User> {
    const response = await apiClient.patch(`${this.baseUrl}/${id}/role`, { role });
    return response.data as User;
  }

  /**
   * Update user status (activate/deactivate)
   */
  async updateUserStatus(id: string, isActive: boolean): Promise<User> {
    const response = await apiClient.patch(`${this.baseUrl}/${id}/status`, { isActive });
    return response.data as User;
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(id: string): Promise<User> {
    const response = await apiClient.delete(`${this.baseUrl}/${id}`);
    return response.data as User;
  }

  /**
   * Bulk operations on users
   */
  async bulkOperation(operation: BulkUserOperation): Promise<BulkOperationResult> {
    const response = await apiClient.post(`${this.baseUrl}/bulk`, operation);
    return response.data as BulkOperationResult;
  }

  /**
   * Get users by role (for dropdowns)
   */
  async getUsersByRole(role: User['role']): Promise<User[]> {
    const response = await apiClient.get(`${this.baseUrl}/role/${role}`);
    return response.data as User[];
  }

  /**
   * Search users by query
   */
  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('q', query);
    searchParams.append('limit', limit.toString());

    const response = await apiClient.get(`${this.baseUrl}/search?${searchParams.toString()}`);
    return response.data as User[];
  }
}

export const userService = new UserService();
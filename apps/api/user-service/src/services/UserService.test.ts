import { UserService, CreateUserInput, UpdateUserInput, UserListQuery, BulkUserOperation } from './UserService';
import { UserRepository } from '../repositories/UserRepository';
import { UserRole } from '@emaintenance/database';
import { hashPassword } from '../utils/crypto';

// Mock dependencies
jest.mock('../repositories/UserRepository');
jest.mock('../utils/crypto');

const mockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;

describe('UserService', () => {
  let userService: UserService;
  let mockRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = new mockUserRepository() as jest.Mocked<UserRepository>;
    userService = new UserService();
    (userService as any).userRepository = mockRepository;
  });

  describe('getUsers', () => {
    it('should return paginated users with default pagination', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@example.com', username: 'user1', firstName: 'John', lastName: 'Doe', role: UserRole.EMPLOYEE, isActive: true },
        { id: '2', email: 'user2@example.com', username: 'user2', firstName: 'Jane', lastName: 'Smith', role: UserRole.TECHNICIAN, isActive: true }
      ];
      const mockResult = { users: mockUsers, total: 2 };

      mockRepository.findMany.mockResolvedValue(mockResult);

      const query: UserListQuery = {};
      const result = await userService.getUsers(query);

      expect(mockRepository.findMany).toHaveBeenCalledWith({
        skip: 0,
        limit: 20,
        search: undefined,
        role: undefined,
        isActive: undefined,
      });
      expect(result).toEqual({
        users: mockUsers,
        total: 2,
        page: 1,
        limit: 20,
      });
    });

    it('should return paginated users with custom pagination and filters', async () => {
      const mockUsers = [
        { id: '1', email: 'supervisor@example.com', username: 'supervisor1', firstName: 'Super', lastName: 'Visor', role: UserRole.SUPERVISOR, isActive: true }
      ];
      const mockResult = { users: mockUsers, total: 1 };

      mockRepository.findMany.mockResolvedValue(mockResult);

      const query: UserListQuery = {
        page: 2,
        limit: 10,
        search: 'super',
        role: UserRole.SUPERVISOR,
        isActive: true,
      };
      const result = await userService.getUsers(query);

      expect(mockRepository.findMany).toHaveBeenCalledWith({
        skip: 10,
        limit: 10,
        search: 'super',
        role: UserRole.SUPERVISOR,
        isActive: true,
      });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should limit max page size to 100', async () => {
      const mockResult = { users: [], total: 0 };
      mockRepository.findMany.mockResolvedValue(mockResult);

      const query: UserListQuery = { limit: 200 };
      await userService.getUsers(query);

      expect(mockRepository.findMany).toHaveBeenCalledWith({
        skip: 0,
        limit: 100,
        search: undefined,
        role: undefined,
        isActive: undefined,
      });
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const mockUser = { id: '1', email: 'user@example.com', username: 'user1', firstName: 'John', lastName: 'Doe', role: UserRole.EMPLOYEE, isActive: true };
      mockRepository.findById.mockResolvedValue(mockUser as any);

      const result = await userService.getUserById('1');

      expect(mockRepository.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await userService.getUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    const createUserData: CreateUserInput = {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
      role: UserRole.EMPLOYEE,
    };

    it('should create a new user successfully', async () => {
      const hashedPassword = 'hashedpassword123';
      const mockCreatedUser = { id: '1', ...createUserData, password: hashedPassword };

      mockRepository.emailExists.mockResolvedValue(false);
      mockRepository.usernameExists.mockResolvedValue(false);
      mockHashPassword.mockResolvedValue(hashedPassword);
      mockRepository.create.mockResolvedValue(mockCreatedUser as any);

      const result = await userService.createUser(createUserData);

      expect(mockRepository.emailExists).toHaveBeenCalledWith(createUserData.email);
      expect(mockRepository.usernameExists).toHaveBeenCalledWith(createUserData.username);
      expect(mockHashPassword).toHaveBeenCalledWith(createUserData.password);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createUserData,
        password: hashedPassword,
      });
      expect(result).toEqual(mockCreatedUser);
    });

    it('should throw error if email already exists', async () => {
      mockRepository.emailExists.mockResolvedValue(true);

      await expect(userService.createUser(createUserData)).rejects.toThrow('Email already exists');
    });

    it('should throw error if username already exists', async () => {
      mockRepository.emailExists.mockResolvedValue(false);
      mockRepository.usernameExists.mockResolvedValue(true);

      await expect(userService.createUser(createUserData)).rejects.toThrow('Username already exists');
    });

    it('should throw error if employee ID already exists', async () => {
      const dataWithEmployeeId = { ...createUserData, employeeId: 'EMP001' };

      mockRepository.emailExists.mockResolvedValue(false);
      mockRepository.usernameExists.mockResolvedValue(false);
      mockRepository.employeeIdExists.mockResolvedValue(true);

      await expect(userService.createUser(dataWithEmployeeId)).rejects.toThrow('Employee ID already exists');
    });
  });

  describe('updateUser', () => {
    const userId = 'user123';
    const updateData: UpdateUserInput = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update user successfully', async () => {
      const existingUser = { id: userId, email: 'user@example.com', username: 'user1', firstName: 'Old', lastName: 'Name', role: UserRole.EMPLOYEE, isActive: true };
      const updatedUser = { ...existingUser, ...updateData };

      mockRepository.findById.mockResolvedValue(existingUser as any);
      mockRepository.update.mockResolvedValue(updatedUser as any);

      const result = await userService.updateUser(userId, updateData);

      expect(mockRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockRepository.update).toHaveBeenCalledWith(userId, updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should throw error if user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(userService.updateUser(userId, updateData)).rejects.toThrow('User not found');
    });

    it('should validate unique constraints when updating email', async () => {
      const existingUser = { id: userId, email: 'old@example.com', username: 'user1', firstName: 'John', lastName: 'Doe', role: UserRole.EMPLOYEE, isActive: true };
      const updateWithEmail = { email: 'new@example.com' };

      mockRepository.findById.mockResolvedValue(existingUser as any);
      mockRepository.emailExists.mockResolvedValue(true);

      await expect(userService.updateUser(userId, updateWithEmail)).rejects.toThrow('Email already exists');
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      const userId = 'user123';
      const newRole = UserRole.SUPERVISOR;
      const existingUser = { id: userId, email: 'user@example.com', username: 'user1', firstName: 'John', lastName: 'Doe', role: UserRole.EMPLOYEE, isActive: true };
      const updatedUser = { ...existingUser, role: newRole };

      mockRepository.findById.mockResolvedValue(existingUser as any);
      mockRepository.update.mockResolvedValue(updatedUser as any);

      const result = await userService.updateUserRole(userId, newRole);

      expect(mockRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockRepository.update).toHaveBeenCalledWith(userId, { role: newRole });
      expect(result).toEqual(updatedUser);
    });

    it('should throw error if user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(userService.updateUserRole('nonexistent', UserRole.SUPERVISOR)).rejects.toThrow('User not found');
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status successfully', async () => {
      const userId = 'user123';
      const existingUser = { id: userId, email: 'user@example.com', username: 'user1', firstName: 'John', lastName: 'Doe', role: UserRole.EMPLOYEE, isActive: true };
      const updatedUser = { ...existingUser, isActive: false };

      mockRepository.findById.mockResolvedValue(existingUser as any);
      mockRepository.update.mockResolvedValue(updatedUser as any);

      const result = await userService.updateUserStatus(userId, false);

      expect(mockRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockRepository.update).toHaveBeenCalledWith(userId, { isActive: false });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user successfully', async () => {
      const userId = 'user123';
      const existingUser = { id: userId, email: 'user@example.com', username: 'user1', firstName: 'John', lastName: 'Doe', role: UserRole.EMPLOYEE, isActive: true };
      const deletedUser = { ...existingUser, isActive: false };

      mockRepository.findById.mockResolvedValue(existingUser as any);
      mockRepository.hasActiveWorkOrders.mockResolvedValue(false);
      mockRepository.update.mockResolvedValue(deletedUser as any);

      const result = await userService.deleteUser(userId);

      expect(mockRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockRepository.hasActiveWorkOrders).toHaveBeenCalledWith(userId);
      expect(mockRepository.update).toHaveBeenCalledWith(userId, { isActive: false });
      expect(result).toEqual(deletedUser);
    });

    it('should throw error if user has active work orders', async () => {
      const userId = 'user123';
      const existingUser = { id: userId, email: 'user@example.com', username: 'user1', firstName: 'John', lastName: 'Doe', role: UserRole.TECHNICIAN, isActive: true };

      mockRepository.findById.mockResolvedValue(existingUser as any);
      mockRepository.hasActiveWorkOrders.mockResolvedValue(true);

      await expect(userService.deleteUser(userId)).rejects.toThrow('Cannot delete user with active work orders. Please reassign or complete them first.');
    });
  });

  describe('bulkOperation', () => {
    it('should perform bulk activate operation successfully', async () => {
      const operation: BulkUserOperation = {
        userIds: ['user1', 'user2'],
        operation: 'activate',
      };

      const mockUser1 = { id: 'user1', isActive: false };
      const mockUser2 = { id: 'user2', isActive: false };
      const updatedUser1 = { ...mockUser1, isActive: true };
      const updatedUser2 = { ...mockUser2, isActive: true };

      mockRepository.findById
        .mockResolvedValueOnce(mockUser1 as any)
        .mockResolvedValueOnce(mockUser2 as any);
      mockRepository.update
        .mockResolvedValueOnce(updatedUser1 as any)
        .mockResolvedValueOnce(updatedUser2 as any);

      const result = await userService.bulkOperation(operation);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should handle partial failures in bulk operation', async () => {
      const operation: BulkUserOperation = {
        userIds: ['user1', 'nonexistent'],
        operation: 'deactivate',
      };

      const mockUser1 = { id: 'user1', isActive: true };

      mockRepository.findById
        .mockResolvedValueOnce(mockUser1 as any)
        .mockResolvedValueOnce(null);
      mockRepository.update.mockResolvedValueOnce({ ...mockUser1, isActive: false } as any);

      const result = await userService.bulkOperation(operation);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toEqual(['User nonexistent: User not found']);
    });
  });

  describe('getUsersByRole', () => {
    it('should return users by role', async () => {
      const mockUsers = [
        { id: '1', role: UserRole.TECHNICIAN, firstName: 'Tech', lastName: 'One' },
        { id: '2', role: UserRole.TECHNICIAN, firstName: 'Tech', lastName: 'Two' },
      ];

      mockRepository.findByRole.mockResolvedValue(mockUsers as any);

      const result = await userService.getUsersByRole(UserRole.TECHNICIAN);

      expect(mockRepository.findByRole).toHaveBeenCalledWith(UserRole.TECHNICIAN);
      expect(result).toEqual(mockUsers);
    });
  });

  describe('searchUsers', () => {
    it('should search users with default limit', async () => {
      const query = 'john';
      const mockUsers = [
        { id: '1', firstName: 'John', lastName: 'Doe' },
        { id: '2', firstName: 'Johnny', lastName: 'Smith' },
      ];

      mockRepository.search.mockResolvedValue(mockUsers as any);

      const result = await userService.searchUsers(query);

      expect(mockRepository.search).toHaveBeenCalledWith(query, 20);
      expect(result).toEqual(mockUsers);
    });

    it('should search users with custom limit', async () => {
      const query = 'jane';
      const limit = 10;
      const mockUsers = [{ id: '1', firstName: 'Jane', lastName: 'Doe' }];

      mockRepository.search.mockResolvedValue(mockUsers as any);

      const result = await userService.searchUsers(query, limit);

      expect(mockRepository.search).toHaveBeenCalledWith(query, limit);
      expect(result).toEqual(mockUsers);
    });
  });
});
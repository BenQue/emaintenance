"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UserService_1 = require("./UserService");
const UserRepository_1 = require("../repositories/UserRepository");
const database_1 = require("@emaintenance/database");
const crypto_1 = require("../utils/crypto");
// Mock dependencies
jest.mock('../repositories/UserRepository');
jest.mock('../utils/crypto');
const mockUserRepository = UserRepository_1.UserRepository;
const mockHashPassword = crypto_1.hashPassword;
describe('UserService', () => {
    let userService;
    let mockRepository;
    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = new mockUserRepository();
        userService = new UserService_1.UserService();
        userService.userRepository = mockRepository;
    });
    describe('getUsers', () => {
        it('should return paginated users with default pagination', async () => {
            const mockUsers = [
                { id: '1', email: 'user1@example.com', username: 'user1', firstName: 'John', lastName: 'Doe', role: database_1.UserRole.EMPLOYEE, isActive: true },
                { id: '2', email: 'user2@example.com', username: 'user2', firstName: 'Jane', lastName: 'Smith', role: database_1.UserRole.TECHNICIAN, isActive: true }
            ];
            const mockResult = { users: mockUsers, total: 2 };
            mockRepository.findMany.mockResolvedValue(mockResult);
            const query = {};
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
                { id: '1', email: 'supervisor@example.com', username: 'supervisor1', firstName: 'Super', lastName: 'Visor', role: database_1.UserRole.SUPERVISOR, isActive: true }
            ];
            const mockResult = { users: mockUsers, total: 1 };
            mockRepository.findMany.mockResolvedValue(mockResult);
            const query = {
                page: 2,
                limit: 10,
                search: 'super',
                role: database_1.UserRole.SUPERVISOR,
                isActive: true,
            };
            const result = await userService.getUsers(query);
            expect(mockRepository.findMany).toHaveBeenCalledWith({
                skip: 10,
                limit: 10,
                search: 'super',
                role: database_1.UserRole.SUPERVISOR,
                isActive: true,
            });
            expect(result.page).toBe(2);
            expect(result.limit).toBe(10);
        });
        it('should limit max page size to 100', async () => {
            const mockResult = { users: [], total: 0 };
            mockRepository.findMany.mockResolvedValue(mockResult);
            const query = { limit: 200 };
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
            const mockUser = { id: '1', email: 'user@example.com', username: 'user1', firstName: 'John', lastName: 'Doe', role: database_1.UserRole.EMPLOYEE, isActive: true };
            mockRepository.findById.mockResolvedValue(mockUser);
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
        const createUserData = {
            email: 'newuser@example.com',
            username: 'newuser',
            password: 'password123',
            firstName: 'New',
            lastName: 'User',
            role: database_1.UserRole.EMPLOYEE,
        };
        it('should create a new user successfully', async () => {
            const hashedPassword = 'hashedpassword123';
            const mockCreatedUser = { id: '1', ...createUserData, password: hashedPassword };
            mockRepository.emailExists.mockResolvedValue(false);
            mockRepository.usernameExists.mockResolvedValue(false);
            mockHashPassword.mockResolvedValue(hashedPassword);
            mockRepository.create.mockResolvedValue(mockCreatedUser);
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
        const updateData = {
            firstName: 'Updated',
            lastName: 'Name',
        };
        it('should update user successfully', async () => {
            const existingUser = { id: userId, email: 'user@example.com', username: 'user1', firstName: 'Old', lastName: 'Name', role: database_1.UserRole.EMPLOYEE, isActive: true };
            const updatedUser = { ...existingUser, ...updateData };
            mockRepository.findById.mockResolvedValue(existingUser);
            mockRepository.update.mockResolvedValue(updatedUser);
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
            const existingUser = { id: userId, email: 'old@example.com', username: 'user1', firstName: 'John', lastName: 'Doe', role: database_1.UserRole.EMPLOYEE, isActive: true };
            const updateWithEmail = { email: 'new@example.com' };
            mockRepository.findById.mockResolvedValue(existingUser);
            mockRepository.emailExists.mockResolvedValue(true);
            await expect(userService.updateUser(userId, updateWithEmail)).rejects.toThrow('Email already exists');
        });
    });
    describe('updateUserRole', () => {
        it('should update user role successfully', async () => {
            const userId = 'user123';
            const newRole = database_1.UserRole.SUPERVISOR;
            const existingUser = { id: userId, email: 'user@example.com', username: 'user1', firstName: 'John', lastName: 'Doe', role: database_1.UserRole.EMPLOYEE, isActive: true };
            const updatedUser = { ...existingUser, role: newRole };
            mockRepository.findById.mockResolvedValue(existingUser);
            mockRepository.update.mockResolvedValue(updatedUser);
            const result = await userService.updateUserRole(userId, newRole);
            expect(mockRepository.findById).toHaveBeenCalledWith(userId);
            expect(mockRepository.update).toHaveBeenCalledWith(userId, { role: newRole });
            expect(result).toEqual(updatedUser);
        });
        it('should throw error if user not found', async () => {
            mockRepository.findById.mockResolvedValue(null);
            await expect(userService.updateUserRole('nonexistent', database_1.UserRole.SUPERVISOR)).rejects.toThrow('User not found');
        });
    });
    describe('updateUserStatus', () => {
        it('should update user status successfully', async () => {
            const userId = 'user123';
            const existingUser = { id: userId, email: 'user@example.com', username: 'user1', firstName: 'John', lastName: 'Doe', role: database_1.UserRole.EMPLOYEE, isActive: true };
            const updatedUser = { ...existingUser, isActive: false };
            mockRepository.findById.mockResolvedValue(existingUser);
            mockRepository.update.mockResolvedValue(updatedUser);
            const result = await userService.updateUserStatus(userId, false);
            expect(mockRepository.findById).toHaveBeenCalledWith(userId);
            expect(mockRepository.update).toHaveBeenCalledWith(userId, { isActive: false });
            expect(result).toEqual(updatedUser);
        });
    });
    describe('deleteUser', () => {
        it('should soft delete user successfully', async () => {
            const userId = 'user123';
            const existingUser = { id: userId, email: 'user@example.com', username: 'user1', firstName: 'John', lastName: 'Doe', role: database_1.UserRole.EMPLOYEE, isActive: true };
            const deletedUser = { ...existingUser, isActive: false };
            mockRepository.findById.mockResolvedValue(existingUser);
            mockRepository.hasActiveWorkOrders.mockResolvedValue(false);
            mockRepository.update.mockResolvedValue(deletedUser);
            const result = await userService.deleteUser(userId);
            expect(mockRepository.findById).toHaveBeenCalledWith(userId);
            expect(mockRepository.hasActiveWorkOrders).toHaveBeenCalledWith(userId);
            expect(mockRepository.update).toHaveBeenCalledWith(userId, { isActive: false });
            expect(result).toEqual(deletedUser);
        });
        it('should throw error if user has active work orders', async () => {
            const userId = 'user123';
            const existingUser = { id: userId, email: 'user@example.com', username: 'user1', firstName: 'John', lastName: 'Doe', role: database_1.UserRole.TECHNICIAN, isActive: true };
            mockRepository.findById.mockResolvedValue(existingUser);
            mockRepository.hasActiveWorkOrders.mockResolvedValue(true);
            await expect(userService.deleteUser(userId)).rejects.toThrow('Cannot delete user with active work orders. Please reassign or complete them first.');
        });
    });
    describe('bulkOperation', () => {
        it('should perform bulk activate operation successfully', async () => {
            const operation = {
                userIds: ['user1', 'user2'],
                operation: 'activate',
            };
            const mockUser1 = { id: 'user1', isActive: false };
            const mockUser2 = { id: 'user2', isActive: false };
            const updatedUser1 = { ...mockUser1, isActive: true };
            const updatedUser2 = { ...mockUser2, isActive: true };
            mockRepository.findById
                .mockResolvedValueOnce(mockUser1)
                .mockResolvedValueOnce(mockUser2);
            mockRepository.update
                .mockResolvedValueOnce(updatedUser1)
                .mockResolvedValueOnce(updatedUser2);
            const result = await userService.bulkOperation(operation);
            expect(result.success).toBe(2);
            expect(result.failed).toBe(0);
            expect(result.errors).toEqual([]);
        });
        it('should handle partial failures in bulk operation', async () => {
            const operation = {
                userIds: ['user1', 'nonexistent'],
                operation: 'deactivate',
            };
            const mockUser1 = { id: 'user1', isActive: true };
            mockRepository.findById
                .mockResolvedValueOnce(mockUser1)
                .mockResolvedValueOnce(null);
            mockRepository.update.mockResolvedValueOnce({ ...mockUser1, isActive: false });
            const result = await userService.bulkOperation(operation);
            expect(result.success).toBe(1);
            expect(result.failed).toBe(1);
            expect(result.errors).toEqual(['User nonexistent: User not found']);
        });
    });
    describe('getUsersByRole', () => {
        it('should return users by role', async () => {
            const mockUsers = [
                { id: '1', role: database_1.UserRole.TECHNICIAN, firstName: 'Tech', lastName: 'One' },
                { id: '2', role: database_1.UserRole.TECHNICIAN, firstName: 'Tech', lastName: 'Two' },
            ];
            mockRepository.findByRole.mockResolvedValue(mockUsers);
            const result = await userService.getUsersByRole(database_1.UserRole.TECHNICIAN);
            expect(mockRepository.findByRole).toHaveBeenCalledWith(database_1.UserRole.TECHNICIAN);
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
            mockRepository.search.mockResolvedValue(mockUsers);
            const result = await userService.searchUsers(query);
            expect(mockRepository.search).toHaveBeenCalledWith(query, 20);
            expect(result).toEqual(mockUsers);
        });
        it('should search users with custom limit', async () => {
            const query = 'jane';
            const limit = 10;
            const mockUsers = [{ id: '1', firstName: 'Jane', lastName: 'Doe' }];
            mockRepository.search.mockResolvedValue(mockUsers);
            const result = await userService.searchUsers(query, limit);
            expect(mockRepository.search).toHaveBeenCalledWith(query, limit);
            expect(result).toEqual(mockUsers);
        });
    });
});

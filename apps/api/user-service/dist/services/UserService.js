"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const UserRepository_1 = require("../repositories/UserRepository");
const crypto_1 = require("../utils/crypto");
class UserService {
    userRepository;
    constructor() {
        this.userRepository = new UserRepository_1.UserRepository();
    }
    /**
     * Get paginated list of users with filtering
     */
    async getUsers(query) {
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
    async getUserById(id) {
        return this.userRepository.findById(id);
    }
    /**
     * Create new user (admin function)
     */
    async createUser(data) {
        // Check if user already exists
        const [emailExists, usernameExists] = await Promise.all([
            this.userRepository.emailExists(data.email),
            this.userRepository.usernameExists(data.username),
        ]);
        if (emailExists) {
            const error = new Error('Email already exists');
            error.code = 'EMAIL_EXISTS';
            throw error;
        }
        if (usernameExists) {
            const error = new Error('Username already exists');
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
        const hashedPassword = await (0, crypto_1.hashPassword)(data.password);
        // Create user
        return this.userRepository.create({
            ...data,
            password: hashedPassword,
        });
    }
    /**
     * Update user
     */
    async updateUser(id, data) {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new Error('User not found');
        }
        // Check for unique constraints if being updated
        if (data.email && data.email !== user.email) {
            const emailExists = await this.userRepository.emailExists(data.email);
            if (emailExists) {
                const error = new Error('Email already exists');
                error.code = 'EMAIL_EXISTS';
                throw error;
            }
        }
        if (data.username && data.username !== user.username) {
            const usernameExists = await this.userRepository.usernameExists(data.username);
            if (usernameExists) {
                const error = new Error('Username already exists');
                error.code = 'USERNAME_EXISTS';
                throw error;
            }
        }
        if (data.employeeId && data.employeeId !== user.employeeId) {
            const employeeIdExists = await this.userRepository.employeeIdExists(data.employeeId);
            if (employeeIdExists) {
                const error = new Error('Employee ID already exists');
                error.code = 'EMPLOYEE_ID_EXISTS';
                throw error;
            }
        }
        return this.userRepository.update(id, data);
    }
    /**
     * Update user role
     */
    async updateUserRole(id, role) {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new Error('User not found');
        }
        return this.userRepository.update(id, { role });
    }
    /**
     * Update user status (activate/deactivate)
     */
    async updateUserStatus(id, isActive) {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new Error('User not found');
        }
        return this.userRepository.update(id, { isActive });
    }
    /**
     * Delete user (soft delete by deactivating)
     */
    async deleteUser(id) {
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
    async bulkOperation(operation) {
        const results = {
            success: 0,
            failed: 0,
            errors: [],
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
            }
            catch (error) {
                results.failed++;
                results.errors.push(`User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        return results;
    }
    /**
     * Get users by role (for dropdowns)
     */
    async getUsersByRole(role) {
        return this.userRepository.findByRole(role);
    }
    /**
     * Search users by name or email
     */
    async searchUsers(query, limit = 20) {
        return this.userRepository.search(query, limit);
    }
}
exports.UserService = UserService;

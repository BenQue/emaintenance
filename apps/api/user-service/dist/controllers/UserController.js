"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const UserService_1 = require("../services/UserService");
const validation_1 = require("../utils/validation");
const errorHandler_1 = require("../utils/errorHandler");
class UserController {
    userService;
    constructor() {
        this.userService = new UserService_1.UserService();
    }
    /**
     * Get paginated list of users with filtering
     */
    getUsers = async (req, res) => {
        try {
            // Validate query parameters
            const validationResult = validation_1.userListQuerySchema.safeParse(req.query);
            if (!validationResult.success) {
                const errorMessage = `Validation failed: ${(0, errorHandler_1.formatValidationErrors)(validationResult.error)}`;
                return res.status(400).json((0, errorHandler_1.createErrorResponse)(errorMessage, 400));
            }
            const query = validationResult.data;
            const result = await this.userService.getUsers(query);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(result));
        }
        catch (error) {
            console.error('Get users error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to get users';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Get user by ID
     */
    getUserById = async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('User ID is required', 400));
            }
            const user = await this.userService.getUserById(id);
            if (!user) {
                return res.status(404).json((0, errorHandler_1.createErrorResponse)('User not found', 404));
            }
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(user));
        }
        catch (error) {
            console.error('Get user by ID error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to get user';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Create new user
     */
    createUser = async (req, res) => {
        try {
            // Validate input
            const validationResult = validation_1.createUserSchema.safeParse(req.body);
            if (!validationResult.success) {
                const errorMessage = `Validation failed: ${(0, errorHandler_1.formatValidationErrors)(validationResult.error)}`;
                return res.status(400).json((0, errorHandler_1.createErrorResponse)(errorMessage, 400));
            }
            const userData = validationResult.data;
            const user = await this.userService.createUser(userData);
            res.status(201).json((0, errorHandler_1.createSuccessResponse)(user));
        }
        catch (error) {
            console.error('Create user error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Update user
     */
    updateUser = async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('User ID is required', 400));
            }
            // Validate input
            const validationResult = validation_1.updateUserSchema.safeParse(req.body);
            if (!validationResult.success) {
                const errorMessage = `Validation failed: ${(0, errorHandler_1.formatValidationErrors)(validationResult.error)}`;
                return res.status(400).json((0, errorHandler_1.createErrorResponse)(errorMessage, 400));
            }
            const updateData = validationResult.data;
            const user = await this.userService.updateUser(id, updateData);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(user));
        }
        catch (error) {
            console.error('Update user error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Update user role
     */
    updateUserRole = async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('User ID is required', 400));
            }
            // Validate input
            const validationResult = validation_1.updateUserRoleSchema.safeParse(req.body);
            if (!validationResult.success) {
                const errorMessage = `Validation failed: ${(0, errorHandler_1.formatValidationErrors)(validationResult.error)}`;
                return res.status(400).json((0, errorHandler_1.createErrorResponse)(errorMessage, 400));
            }
            const { role } = validationResult.data;
            const user = await this.userService.updateUserRole(id, role);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(user));
        }
        catch (error) {
            console.error('Update user role error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update user role';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Update user status (activate/deactivate)
     */
    updateUserStatus = async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('User ID is required', 400));
            }
            // Validate input
            const validationResult = validation_1.updateUserStatusSchema.safeParse(req.body);
            if (!validationResult.success) {
                const errorMessage = `Validation failed: ${(0, errorHandler_1.formatValidationErrors)(validationResult.error)}`;
                return res.status(400).json((0, errorHandler_1.createErrorResponse)(errorMessage, 400));
            }
            const { isActive } = validationResult.data;
            const user = await this.userService.updateUserStatus(id, isActive);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(user));
        }
        catch (error) {
            console.error('Update user status error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update user status';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Delete user (soft delete)
     */
    deleteUser = async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('User ID is required', 400));
            }
            const user = await this.userService.deleteUser(id);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(user));
        }
        catch (error) {
            console.error('Delete user error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Bulk operations on users
     */
    bulkOperation = async (req, res) => {
        try {
            // Validate input
            const validationResult = validation_1.bulkUserOperationSchema.safeParse(req.body);
            if (!validationResult.success) {
                const errorMessage = `Validation failed: ${(0, errorHandler_1.formatValidationErrors)(validationResult.error)}`;
                return res.status(400).json((0, errorHandler_1.createErrorResponse)(errorMessage, 400));
            }
            const operation = validationResult.data;
            const result = await this.userService.bulkOperation(operation);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(result));
        }
        catch (error) {
            console.error('Bulk operation error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to perform bulk operation';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Get users by role (for dropdowns)
     */
    getUsersByRole = async (req, res) => {
        try {
            const { role } = req.params;
            if (!role || !Object.values(['EMPLOYEE', 'TECHNICIAN', 'SUPERVISOR', 'ADMIN']).includes(role)) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('Valid role is required', 400));
            }
            const users = await this.userService.getUsersByRole(role);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(users));
        }
        catch (error) {
            console.error('Get users by role error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to get users by role';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Search users by query
     */
    searchUsers = async (req, res) => {
        try {
            const { q, limit } = req.query;
            if (!q || typeof q !== 'string' || q.trim().length < 2) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('Search query must be at least 2 characters', 400));
            }
            const searchLimit = limit && typeof limit === 'string' ? parseInt(limit, 10) : 20;
            if (isNaN(searchLimit) || searchLimit < 1 || searchLimit > 100) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('Limit must be between 1 and 100', 400));
            }
            const users = await this.userService.searchUsers(q.trim(), searchLimit);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(users));
        }
        catch (error) {
            console.error('Search users error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to search users';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
}
exports.UserController = UserController;

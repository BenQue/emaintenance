"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const AuthService_1 = require("../services/AuthService");
const validation_1 = require("../utils/validation");
const errorHandler_1 = require("../utils/errorHandler");
class AuthController {
    authService;
    constructor() {
        this.authService = new AuthService_1.AuthService();
    }
    /**
     * Register a new user
     */
    register = async (req, res) => {
        try {
            // Validate input
            const validationResult = validation_1.registerSchema.safeParse(req.body);
            if (!validationResult.success) {
                const errorMessage = `Validation failed: ${(0, errorHandler_1.formatValidationErrors)(validationResult.error)}`;
                return res.status(400).json((0, errorHandler_1.createErrorResponse)(errorMessage, 400));
            }
            const userData = validationResult.data;
            // Register user
            const result = await this.authService.register(userData);
            res.status(201).json((0, errorHandler_1.createSuccessResponse)(result));
        }
        catch (error) {
            console.error('Registration error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Login user
     */
    login = async (req, res) => {
        try {
            // Validate input
            const validationResult = validation_1.loginSchema.safeParse(req.body);
            if (!validationResult.success) {
                const errorMessage = `Validation failed: ${(0, errorHandler_1.formatValidationErrors)(validationResult.error)}`;
                return res.status(400).json((0, errorHandler_1.createErrorResponse)(errorMessage, 400));
            }
            const loginData = validationResult.data;
            // Login user
            const result = await this.authService.login(loginData);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(result));
        }
        catch (error) {
            console.error('Login error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Get current user profile
     */
    profile = async (req, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    timestamp: new Date().toISOString(),
                });
            }
            // Get full user data
            const user = await this.authService.getUserById(req.user.userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                    timestamp: new Date().toISOString(),
                });
            }
            res.status(200).json({
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    employeeId: user.employeeId,
                    isActive: user.isActive,
                    createdAt: user.createdAt,
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('Profile error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get user profile',
                timestamp: new Date().toISOString(),
            });
        }
    };
}
exports.AuthController = AuthController;

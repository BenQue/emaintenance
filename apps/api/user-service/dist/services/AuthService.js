"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const UserRepository_1 = require("../repositories/UserRepository");
const crypto_1 = require("../utils/crypto");
const jwt_1 = require("../utils/jwt");
class AuthService {
    userRepository;
    constructor() {
        this.userRepository = new UserRepository_1.UserRepository();
    }
    /**
     * Register a new user
     */
    async register(data) {
        // Check if user already exists
        const [emailExists, usernameExists] = await Promise.all([
            this.userRepository.emailExists(data.email),
            this.userRepository.usernameExists(data.username),
        ]);
        if (emailExists) {
            throw new Error('Email already exists');
        }
        if (usernameExists) {
            throw new Error('Username already exists');
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
        const user = await this.userRepository.create({
            ...data,
            password: hashedPassword,
        });
        // Generate token
        const token = (0, jwt_1.generateToken)({
            userId: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                employeeId: user.employeeId,
            },
            token,
            expiresIn: (0, jwt_1.getExpirationTime)(),
        };
    }
    /**
     * Login user
     */
    async login(data) {
        // Find user by email or username
        const user = await this.userRepository.findByIdentifier(data.identifier);
        if (!user) {
            throw new Error('Invalid credentials');
        }
        if (!user.isActive) {
            throw new Error('Account is disabled');
        }
        // Verify password
        const isValidPassword = await (0, crypto_1.verifyPassword)(data.password, user.password);
        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }
        // Generate token
        const token = (0, jwt_1.generateToken)({
            userId: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                employeeId: user.employeeId,
            },
            token,
            expiresIn: (0, jwt_1.getExpirationTime)(),
        };
    }
    /**
     * Get user by ID (for middleware use)
     */
    async getUserById(id) {
        return this.userRepository.findById(id);
    }
}
exports.AuthService = AuthService;

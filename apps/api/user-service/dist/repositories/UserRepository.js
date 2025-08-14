"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const database_1 = require("@emaintenance/database");
class UserRepository {
    /**
     * Create a new user
     */
    async create(userData) {
        return database_1.prisma.user.create({
            data: {
                email: userData.email,
                username: userData.username,
                password: userData.password,
                firstName: userData.firstName,
                lastName: userData.lastName,
                employeeId: userData.employeeId,
                role: userData.role || database_1.UserRole.EMPLOYEE,
            },
        });
    }
    /**
     * Find user by email
     */
    async findByEmail(email) {
        return database_1.prisma.user.findUnique({
            where: { email },
        });
    }
    /**
     * Find user by username
     */
    async findByUsername(username) {
        return database_1.prisma.user.findUnique({
            where: { username },
        });
    }
    /**
     * Find user by email or username (optimized single query)
     */
    async findByIdentifier(identifier) {
        // Use a single query with OR condition for better performance
        return database_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier },
                ],
            },
        });
    }
    /**
     * Find user by ID
     */
    async findById(id) {
        return database_1.prisma.user.findUnique({
            where: { id },
        });
    }
    /**
     * Check if email already exists
     */
    async emailExists(email) {
        const user = await database_1.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        return !!user;
    }
    /**
     * Check if username already exists
     */
    async usernameExists(username) {
        const user = await database_1.prisma.user.findUnique({
            where: { username },
            select: { id: true },
        });
        return !!user;
    }
    /**
     * Check if employee ID already exists
     */
    async employeeIdExists(employeeId) {
        const user = await database_1.prisma.user.findUnique({
            where: { employeeId },
            select: { id: true },
        });
        return !!user;
    }
    /**
     * Find many users with filtering and pagination
     */
    async findMany(options) {
        const where = {};
        // Add filters
        if (options.role) {
            where.role = options.role;
        }
        if (options.isActive !== undefined) {
            where.isActive = options.isActive;
        }
        if (options.search) {
            where.OR = [
                { firstName: { contains: options.search, mode: 'insensitive' } },
                { lastName: { contains: options.search, mode: 'insensitive' } },
                { email: { contains: options.search, mode: 'insensitive' } },
                { username: { contains: options.search, mode: 'insensitive' } },
                { employeeId: { contains: options.search, mode: 'insensitive' } },
            ];
        }
        const [users, total] = await Promise.all([
            database_1.prisma.user.findMany({
                where,
                skip: options.skip,
                take: options.limit,
                orderBy: [
                    { isActive: 'desc' },
                    { lastName: 'asc' },
                    { firstName: 'asc' },
                ],
                select: {
                    id: true,
                    email: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    employeeId: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    password: false, // Exclude password from results
                },
            }),
            database_1.prisma.user.count({ where }),
        ]);
        return { users: users, total };
    }
    /**
     * Update user
     */
    async update(id, data) {
        return database_1.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                email: true,
                username: true,
                password: true, // Include password field
                firstName: true,
                lastName: true,
                employeeId: true,
                domainAccount: true, // Include domainAccount field
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
    /**
     * Find users by role
     */
    async findByRole(role) {
        return database_1.prisma.user.findMany({
            where: { role, isActive: true },
            orderBy: [
                { lastName: 'asc' },
                { firstName: 'asc' },
            ],
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                employeeId: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                password: false,
            },
        });
    }
    /**
     * Search users by query
     */
    async search(query, limit) {
        return database_1.prisma.user.findMany({
            where: {
                isActive: true,
                OR: [
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { username: { contains: query, mode: 'insensitive' } },
                ],
            },
            take: limit,
            orderBy: [
                { lastName: 'asc' },
                { firstName: 'asc' },
            ],
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                employeeId: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                password: false,
            },
        });
    }
    /**
     * Check if user has active work orders
     */
    async hasActiveWorkOrders(userId) {
        const activeWorkOrders = await database_1.prisma.workOrder.count({
            where: {
                OR: [
                    { createdById: userId },
                    { assignedToId: userId },
                ],
                status: {
                    in: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTS', 'WAITING_EXTERNAL'],
                },
            },
        });
        return activeWorkOrders > 0;
    }
}
exports.UserRepository = UserRepository;

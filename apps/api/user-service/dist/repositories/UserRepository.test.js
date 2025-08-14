"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UserRepository_1 = require("./UserRepository");
const database_1 = require("@emaintenance/database");
// Mock the database
jest.mock('@emaintenance/database', () => ({
    prisma: {
        user: {
            create: jest.fn(),
            findUnique: jest.fn(),
        },
    },
    UserRole: {
        EMPLOYEE: 'EMPLOYEE',
        TECHNICIAN: 'TECHNICIAN',
        SUPERVISOR: 'SUPERVISOR',
        ADMIN: 'ADMIN',
    },
}));
const database_2 = require("@emaintenance/database");
describe('UserRepository', () => {
    let userRepository;
    const mockPrismaUser = database_2.prisma.user;
    beforeEach(() => {
        userRepository = new UserRepository_1.UserRepository();
        jest.clearAllMocks();
    });
    const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        employeeId: 'EMP001',
        domainAccount: null,
        role: database_1.UserRole.EMPLOYEE,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    describe('create', () => {
        it('should create a new user', async () => {
            const userData = {
                email: 'test@example.com',
                username: 'testuser',
                password: 'hashedpassword',
                firstName: 'Test',
                lastName: 'User',
                employeeId: 'EMP001',
                role: database_1.UserRole.EMPLOYEE,
            };
            mockPrismaUser.create.mockResolvedValue(mockUser);
            const result = await userRepository.create(userData);
            expect(mockPrismaUser.create).toHaveBeenCalledWith({
                data: {
                    email: userData.email,
                    username: userData.username,
                    password: userData.password,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    employeeId: userData.employeeId,
                    role: userData.role,
                },
            });
            expect(result).toEqual(mockUser);
        });
        it('should create user with default role', async () => {
            const userData = {
                email: 'test@example.com',
                username: 'testuser',
                password: 'hashedpassword',
                firstName: 'Test',
                lastName: 'User',
            };
            mockPrismaUser.create.mockResolvedValue(mockUser);
            await userRepository.create(userData);
            expect(mockPrismaUser.create).toHaveBeenCalledWith({
                data: {
                    ...userData,
                    role: database_1.UserRole.EMPLOYEE,
                },
            });
        });
    });
    describe('findByEmail', () => {
        it('should find user by email', async () => {
            mockPrismaUser.findUnique.mockResolvedValue(mockUser);
            const result = await userRepository.findByEmail('test@example.com');
            expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
            });
            expect(result).toEqual(mockUser);
        });
        it('should return null if user not found', async () => {
            mockPrismaUser.findUnique.mockResolvedValue(null);
            const result = await userRepository.findByEmail('notfound@example.com');
            expect(result).toBeNull();
        });
    });
    describe('findByUsername', () => {
        it('should find user by username', async () => {
            mockPrismaUser.findUnique.mockResolvedValue(mockUser);
            const result = await userRepository.findByUsername('testuser');
            expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
                where: { username: 'testuser' },
            });
            expect(result).toEqual(mockUser);
        });
    });
    describe('findByIdentifier', () => {
        it('should find user by email when email is provided', async () => {
            mockPrismaUser.findUnique
                .mockResolvedValueOnce(mockUser) // email lookup
                .mockResolvedValueOnce(null); // username lookup (not called)
            const result = await userRepository.findByIdentifier('test@example.com');
            expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
            });
            expect(result).toEqual(mockUser);
        });
        it('should find user by username when email lookup fails', async () => {
            mockPrismaUser.findUnique
                .mockResolvedValueOnce(null) // email lookup
                .mockResolvedValueOnce(mockUser); // username lookup
            const result = await userRepository.findByIdentifier('testuser');
            expect(mockPrismaUser.findUnique).toHaveBeenCalledTimes(2);
            expect(result).toEqual(mockUser);
        });
        it('should return null when neither email nor username found', async () => {
            mockPrismaUser.findUnique.mockResolvedValue(null);
            const result = await userRepository.findByIdentifier('notfound');
            expect(mockPrismaUser.findUnique).toHaveBeenCalledTimes(2);
            expect(result).toBeNull();
        });
    });
    describe('existence checks', () => {
        it('should check if email exists', async () => {
            mockPrismaUser.findUnique.mockResolvedValue({ id: 'user123' });
            const result = await userRepository.emailExists('test@example.com');
            expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
                select: { id: true },
            });
            expect(result).toBe(true);
        });
        it('should return false if email does not exist', async () => {
            mockPrismaUser.findUnique.mockResolvedValue(null);
            const result = await userRepository.emailExists('notfound@example.com');
            expect(result).toBe(false);
        });
        it('should check if username exists', async () => {
            mockPrismaUser.findUnique.mockResolvedValue({ id: 'user123' });
            const result = await userRepository.usernameExists('testuser');
            expect(result).toBe(true);
        });
        it('should check if employee ID exists', async () => {
            mockPrismaUser.findUnique.mockResolvedValue({ id: 'user123' });
            const result = await userRepository.employeeIdExists('EMP001');
            expect(result).toBe(true);
        });
    });
});

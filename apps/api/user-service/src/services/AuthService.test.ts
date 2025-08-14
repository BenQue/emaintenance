import { AuthService } from './AuthService';
import { UserRepository } from '../repositories/UserRepository';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { generateToken, getExpirationTime } from '../utils/jwt';
import { UserRole } from '@emaintenance/database';

// Mock dependencies
jest.mock('../repositories/UserRepository');
jest.mock('../utils/crypto');
jest.mock('../utils/jwt');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;
  const mockVerifyPassword = verifyPassword as jest.MockedFunction<typeof verifyPassword>;
  const mockGenerateToken = generateToken as jest.MockedFunction<typeof generateToken>;
  const mockGetExpirationTime = getExpirationTime as jest.MockedFunction<typeof getExpirationTime>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the UserRepository constructor
    mockUserRepository = {
      emailExists: jest.fn(),
      usernameExists: jest.fn(),
      employeeIdExists: jest.fn(),
      create: jest.fn(),
      findByIdentifier: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
    };
    
    (UserRepository as jest.MockedClass<typeof UserRepository>).mockImplementation(() => mockUserRepository);
    
    authService = new AuthService();
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
    role: UserRole.EMPLOYEE,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('register', () => {
    const registerData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      employeeId: 'EMP001',
    };

    it('should successfully register a new user', async () => {
      mockUserRepository.emailExists.mockResolvedValue(false);
      mockUserRepository.usernameExists.mockResolvedValue(false);
      mockUserRepository.employeeIdExists.mockResolvedValue(false);
      mockHashPassword.mockResolvedValue('hashedpassword');
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockGenerateToken.mockReturnValue('jwt-token');
      mockGetExpirationTime.mockReturnValue(3600);

      const result = await authService.register(registerData);

      expect(mockUserRepository.emailExists).toHaveBeenCalledWith(registerData.email);
      expect(mockUserRepository.usernameExists).toHaveBeenCalledWith(registerData.username);
      expect(mockUserRepository.employeeIdExists).toHaveBeenCalledWith(registerData.employeeId);
      expect(mockHashPassword).toHaveBeenCalledWith(registerData.password);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...registerData,
        password: 'hashedpassword',
      });
      expect(mockGenerateToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        role: mockUser.role,
      });

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
          employeeId: mockUser.employeeId,
        },
        token: 'jwt-token',
        expiresIn: 3600,
      });
    });

    it('should throw error if email already exists', async () => {
      mockUserRepository.emailExists.mockResolvedValue(true);

      await expect(authService.register(registerData)).rejects.toThrow('Email already exists');
    });

    it('should throw error if username already exists', async () => {
      mockUserRepository.emailExists.mockResolvedValue(false);
      mockUserRepository.usernameExists.mockResolvedValue(true);

      await expect(authService.register(registerData)).rejects.toThrow('Username already exists');
    });

    it('should throw error if employee ID already exists', async () => {
      mockUserRepository.emailExists.mockResolvedValue(false);
      mockUserRepository.usernameExists.mockResolvedValue(false);
      mockUserRepository.employeeIdExists.mockResolvedValue(true);

      await expect(authService.register(registerData)).rejects.toThrow('Employee ID already exists');
    });

    it('should handle registration without employee ID', async () => {
      const dataWithoutEmployeeId = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      mockUserRepository.emailExists.mockResolvedValue(false);
      mockUserRepository.usernameExists.mockResolvedValue(false);
      mockHashPassword.mockResolvedValue('hashedpassword');
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockGenerateToken.mockReturnValue('jwt-token');
      mockGetExpirationTime.mockReturnValue(3600);

      await authService.register(dataWithoutEmployeeId);

      expect(mockUserRepository.employeeIdExists).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginData = {
      identifier: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login with valid credentials', async () => {
      mockUserRepository.findByIdentifier.mockResolvedValue(mockUser);
      mockVerifyPassword.mockResolvedValue(true);
      mockGenerateToken.mockReturnValue('jwt-token');
      mockGetExpirationTime.mockReturnValue(3600);

      const result = await authService.login(loginData);

      expect(mockUserRepository.findByIdentifier).toHaveBeenCalledWith(loginData.identifier);
      expect(mockVerifyPassword).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(mockGenerateToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        role: mockUser.role,
      });

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
          employeeId: mockUser.employeeId,
        },
        token: 'jwt-token',
        expiresIn: 3600,
      });
    });

    it('should throw error if user not found', async () => {
      mockUserRepository.findByIdentifier.mockResolvedValue(null);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error if user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findByIdentifier.mockResolvedValue(inactiveUser);

      await expect(authService.login(loginData)).rejects.toThrow('Account is disabled');
    });

    it('should throw error if password is invalid', async () => {
      mockUserRepository.findByIdentifier.mockResolvedValue(mockUser);
      mockVerifyPassword.mockResolvedValue(false);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.getUserById('user123');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user123');
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await authService.getUserById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
import { Request, Response } from 'express';
import { AuthController } from './AuthController';
import { AuthService } from '../services/AuthService';
import { UserRole } from '@emaintenance/database';

// Mock dependencies
jest.mock('../services/AuthService');

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      getUserById: jest.fn(),
    } as jest.Mocked<AuthService>;

    (AuthService as jest.MockedClass<typeof AuthService>).mockImplementation(() => mockAuthService);

    authController = new AuthController();

    mockRequest = {
      body: {},
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  const mockAuthResponse = {
    user: {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.EMPLOYEE,
      employeeId: 'EMP001',
    },
    token: 'jwt-token',
    expiresIn: 3600,
  };

  describe('register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should successfully register a user', async () => {
      mockRequest.body = validRegisterData;
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.register).toHaveBeenCalledWith(validRegisterData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAuthResponse,
        timestamp: expect.any(String),
      });
    });

    it('should return validation error for invalid data', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        username: 'ab', // too short
        password: '123', // too short
      };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Validation failed'),
        timestamp: expect.any(String),
      });
    });

    it('should return 409 for duplicate email', async () => {
      mockRequest.body = validRegisterData;
      mockAuthService.register.mockRejectedValue(new Error('Email already exists'));

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email already exists',
        timestamp: expect.any(String),
      });
    });

    it('should return 500 for other errors', async () => {
      mockRequest.body = validRegisterData;
      mockAuthService.register.mockRejectedValue(new Error('Database error'));

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error',
        timestamp: expect.any(String),
      });
    });
  });

  describe('login', () => {
    const validLoginData = {
      identifier: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login a user', async () => {
      mockRequest.body = validLoginData;
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.login).toHaveBeenCalledWith(validLoginData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAuthResponse,
        timestamp: expect.any(String),
      });
    });

    it('should return validation error for invalid data', async () => {
      mockRequest.body = {
        identifier: '', // empty
        password: '', // empty
      };

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Validation failed'),
        timestamp: expect.any(String),
      });
    });

    it('should return 401 for invalid credentials', async () => {
      mockRequest.body = validLoginData;
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid credentials',
        timestamp: expect.any(String),
      });
    });

    it('should return 401 for disabled account', async () => {
      mockRequest.body = validLoginData;
      mockAuthService.login.mockRejectedValue(new Error('Account is disabled'));

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Account is disabled',
        timestamp: expect.any(String),
      });
    });
  });

  describe('profile', () => {
    const mockUserData = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.EMPLOYEE,
      employeeId: 'EMP001',
      domainAccount: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      password: 'hashedpassword',
    };

    it('should return user profile for authenticated user', async () => {
      mockRequest.user = {
        userId: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.EMPLOYEE,
        isActive: true,
      };
      mockAuthService.getUserById.mockResolvedValue(mockUserData);

      await authController.profile(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.getUserById).toHaveBeenCalledWith('user123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: mockUserData.id,
          email: mockUserData.email,
          username: mockUserData.username,
          firstName: mockUserData.firstName,
          lastName: mockUserData.lastName,
          role: mockUserData.role,
          employeeId: mockUserData.employeeId,
          isActive: mockUserData.isActive,
          createdAt: mockUserData.createdAt,
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await authController.profile(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.getUserById).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        timestamp: expect.any(String),
      });
    });

    it('should return 404 if user not found', async () => {
      mockRequest.user = {
        userId: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.EMPLOYEE,
        isActive: true,
      };
      mockAuthService.getUserById.mockResolvedValue(null);

      await authController.profile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
        timestamp: expect.any(String),
      });
    });

    it('should handle service errors', async () => {
      mockRequest.user = {
        userId: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.EMPLOYEE,
        isActive: true,
      };
      mockAuthService.getUserById.mockRejectedValue(new Error('Database error'));

      await authController.profile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get user profile',
        timestamp: expect.any(String),
      });
    });
  });
});
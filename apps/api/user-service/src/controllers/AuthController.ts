import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { registerSchema, loginSchema } from '../utils/validation';
import { ApiResponse } from '../types/auth';
import { formatValidationErrors, createErrorResponse, createSuccessResponse, getErrorStatusCode } from '../utils/errorHandler';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Register a new user
   */
  register = async (req: Request, res: Response) => {
    try {
      // Validate input
      const validationResult = registerSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const userData = validationResult.data;

      // Register user
      const result = await this.authService.register(userData);

      res.status(201).json(createSuccessResponse(result));

    } catch (error) {
      console.error('Registration error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  /**
   * Login user
   */
  login = async (req: Request, res: Response) => {
    try {
      // Validate input
      const validationResult = loginSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const loginData = validationResult.data;

      // Login user
      const result = await this.authService.login(loginData);

      res.status(200).json(createSuccessResponse(result));

    } catch (error) {
      console.error('Login error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  /**
   * Get current user profile
   */
  profile = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }

      // Get full user data
      const user = await this.authService.getUserById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
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
      } as ApiResponse);

    } catch (error) {
      console.error('Profile error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get user profile',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  };

  validateToken = async (req: Request, res: Response): Promise<void> => {
    try {
      // If we reach here, the authenticate middleware has already validated the token
      // and set req.user, so the token is valid
      res.status(200).json({
        success: true,
        data: {
          valid: true,
          user: {
            id: req.user?.id,
            email: req.user?.email,
            role: req.user?.role,
          }
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      res.status(401).json({
        success: false,
        data: { valid: false },
        error: 'Invalid token',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  };
}
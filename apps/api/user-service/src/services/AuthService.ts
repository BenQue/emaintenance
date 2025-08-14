import { User, UserRole } from '@emaintenance/database';
import { UserRepository } from '../repositories/UserRepository';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { generateToken, getExpirationTime } from '../utils/jwt';
import { RegisterInput, LoginInput } from '../utils/validation';
import { AuthResponse } from '../types/auth';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Register a new user
   */
  async register(data: RegisterInput): Promise<AuthResponse> {
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
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const user = await this.userRepository.create({
      ...data,
      password: hashedPassword,
    });

    // Generate token
    const token = generateToken({
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
        employeeId: user.employeeId || undefined,
      },
      token,
      expiresIn: getExpirationTime(),
    };
  }

  /**
   * Login user
   */
  async login(data: LoginInput): Promise<AuthResponse> {
    // Find user by email or username
    const user = await this.userRepository.findByIdentifier(data.identifier);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('Account is disabled');
    }

    // Verify password
    const isValidPassword = await verifyPassword(data.password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = generateToken({
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
        employeeId: user.employeeId || undefined,
      },
      token,
      expiresIn: getExpirationTime(),
    };
  }

  /**
   * Get user by ID (for middleware use)
   */
  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
}
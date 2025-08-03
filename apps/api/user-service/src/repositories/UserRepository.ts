import { prisma, User, UserRole } from '@emaintanance/database';
import { RegisterInput } from '../utils/validation';

export class UserRepository {
  /**
   * Create a new user
   */
  async create(userData: RegisterInput & { password: string }): Promise<User> {
    return prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        employeeId: userData.employeeId,
        role: userData.role || UserRole.EMPLOYEE,
      },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  /**
   * Find user by email or username (optimized single query)
   */
  async findByIdentifier(identifier: string): Promise<User | null> {
    // Use a single query with OR condition for better performance
    return prisma.user.findFirst({
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
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Check if email already exists
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return !!user;
  }

  /**
   * Check if username already exists
   */
  async usernameExists(username: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    return !!user;
  }

  /**
   * Check if employee ID already exists
   */
  async employeeIdExists(employeeId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { employeeId },
      select: { id: true },
    });
    return !!user;
  }
}
import { prisma, User, UserRole } from '@emaintenance/database';
import { RegisterInput } from '../utils/validation';

export interface FindManyOptions {
  skip: number;
  limit: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface FindManyResult {
  users: User[];
  total: number;
}

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

  /**
   * Find many users with filtering and pagination
   */
  async findMany(options: FindManyOptions): Promise<FindManyResult> {
    const where: any = {};

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
      prisma.user.findMany({
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
      prisma.user.count({ where }),
    ]);

    return { users: users as User[], total };
  }

  /**
   * Update user
   */
  async update(id: string, data: Partial<User>): Promise<User> {
    return prisma.user.update({
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
    }) as Promise<User>;
  }

  /**
   * Find users by role
   */
  async findByRole(role: UserRole): Promise<User[]> {
    return prisma.user.findMany({
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
    }) as Promise<User[]>;
  }

  /**
   * Search users by query
   */
  async search(query: string, limit: number): Promise<User[]> {
    return prisma.user.findMany({
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
    }) as Promise<User[]>;
  }

  /**
   * Check if user has active work orders
   */
  async hasActiveWorkOrders(userId: string): Promise<boolean> {
    const activeWorkOrders = await prisma.workOrder.count({
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
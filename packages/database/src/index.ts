import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Export Prisma client types
export * from '@prisma/client';

// Manual type definitions for build-time compatibility
export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  employeeId?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  assetCode: string;
  name: string;
  description?: string;
  location: string;
  locationId: string;
  categoryId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FaultCodeMaster {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reason {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriorityLevel {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  TECHNICIAN = 'TECHNICIAN',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN'
}

export enum WorkOrderStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_PARTS = 'WAITING_PARTS',
  WAITING_EXTERNAL = 'WAITING_EXTERNAL',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum FaultCode {
  MECHANICAL_FAILURE = 'MECHANICAL_FAILURE',
  ELECTRICAL_FAILURE = 'ELECTRICAL_FAILURE',
  SOFTWARE_ISSUE = 'SOFTWARE_ISSUE',
  WEAR_AND_TEAR = 'WEAR_AND_TEAR',
  USER_ERROR = 'USER_ERROR',
  PREVENTIVE_MAINTENANCE = 'PREVENTIVE_MAINTENANCE',
  EXTERNAL_FACTOR = 'EXTERNAL_FACTOR',
  OTHER = 'OTHER'
}

export enum NotificationType {
  WORK_ORDER_ASSIGNED = 'WORK_ORDER_ASSIGNED',
  WORK_ORDER_UPDATED = 'WORK_ORDER_UPDATED',
  SYSTEM_ALERT = 'SYSTEM_ALERT'
}

export interface MasterDataCreateInput {
  name: string;
  description?: string;
  isActive?: boolean;
  categoryId?: string;
}

export interface MasterDataListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface WorkOrder {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignedTo?: string;
  createdBy: string;
  assetId?: string;
  location: string;
  categoryId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentRule {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  locationId?: string;
  priority: Priority;
  assignedRole: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  workOrderId?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhotoRecord {
  id: string;
  workOrderId: string;
  photoUrl: string;
  description?: string;
  uploadedBy: string;
  createdAt: Date;
}

export default prisma;
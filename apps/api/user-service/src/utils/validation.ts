import { z } from 'zod';
import { UserRole } from '@emaintanance/database';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be less than 50 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(100, 'First name must be less than 100 characters'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name must be less than 100 characters'),
  employeeId: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

// Asset validation schemas
export const createAssetSchema = z.object({
  assetCode: z.string().min(1, 'Asset code is required').max(50, 'Asset code must be less than 50 characters'),
  name: z.string().min(1, 'Asset name is required').max(200, 'Asset name must be less than 200 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  model: z.string().max(100, 'Model must be less than 100 characters').optional(),
  manufacturer: z.string().max(100, 'Manufacturer must be less than 100 characters').optional(),
  serialNumber: z.string().max(100, 'Serial number must be less than 100 characters').optional(),
  location: z.string().min(1, 'Location is required').max(200, 'Location must be less than 200 characters'),
  installDate: z.string().datetime('Invalid datetime format').optional().or(z.date().optional()),
  ownerId: z.string().cuid().optional(),
  administratorId: z.string().cuid().optional(),
});

export const updateAssetSchema = z.object({
  assetCode: z.string().min(1, 'Asset code is required').max(50, 'Asset code must be less than 50 characters').optional(),
  name: z.string().min(1, 'Asset name is required').max(200, 'Asset name must be less than 200 characters').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  model: z.string().max(100, 'Model must be less than 100 characters').optional(),
  manufacturer: z.string().max(100, 'Manufacturer must be less than 100 characters').optional(),
  serialNumber: z.string().max(100, 'Serial number must be less than 100 characters').optional(),
  location: z.string().min(1, 'Location is required').max(200, 'Location must be less than 200 characters').optional(),
  installDate: z.string().datetime('Invalid datetime format').optional().or(z.date().optional()),
  ownerId: z.string().cuid().optional(),
  administratorId: z.string().cuid().optional(),
  isActive: z.boolean().optional(),
});

export const assetListQuerySchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').transform(Number).optional(),
  location: z.string().optional(),
  isActive: z.string().transform((val) => val === 'true').optional(),
  ownerId: z.string().cuid().optional(),
  administratorId: z.string().cuid().optional(),
});

export const bulkCreateAssetsSchema = z.object({
  assets: z.array(createAssetSchema).min(1, 'At least one asset is required').max(100, 'Cannot create more than 100 assets at once'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type AssetListQuery = z.infer<typeof assetListQuerySchema>;
export type BulkCreateAssetsInput = z.infer<typeof bulkCreateAssetsSchema>;
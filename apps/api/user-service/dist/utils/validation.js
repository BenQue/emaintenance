"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkAssetOperationSchema = exports.updateAssetStatusSchema = exports.updateAssetOwnershipSchema = exports.bulkUserOperationSchema = exports.updateUserStatusSchema = exports.updateUserRoleSchema = exports.userListQuerySchema = exports.updateUserSchema = exports.createUserSchema = exports.bulkCreateAssetsSchema = exports.assetListQuerySchema = exports.updateAssetSchema = exports.createAssetSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const database_1 = require("@emaintenance/database");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    username: zod_1.z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be less than 50 characters'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    firstName: zod_1.z.string().min(1, 'First name is required').max(100, 'First name must be less than 100 characters'),
    lastName: zod_1.z.string().min(1, 'Last name is required').max(100, 'Last name must be less than 100 characters'),
    employeeId: zod_1.z.string().optional(),
    role: zod_1.z.nativeEnum(database_1.UserRole).optional(),
});
exports.loginSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(1, 'Email or username is required'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// Asset validation schemas
exports.createAssetSchema = zod_1.z.object({
    assetCode: zod_1.z.string().min(1, 'Asset code is required').max(50, 'Asset code must be less than 50 characters'),
    name: zod_1.z.string().min(1, 'Asset name is required').max(200, 'Asset name must be less than 200 characters'),
    description: zod_1.z.string().max(500, 'Description must be less than 500 characters').optional(),
    model: zod_1.z.string().max(100, 'Model must be less than 100 characters').optional(),
    manufacturer: zod_1.z.string().max(100, 'Manufacturer must be less than 100 characters').optional(),
    serialNumber: zod_1.z.string().max(100, 'Serial number must be less than 100 characters').optional(),
    location: zod_1.z.string().min(1, 'Location is required').max(200, 'Location must be less than 200 characters'),
    installDate: zod_1.z.string().datetime('Invalid datetime format').optional().or(zod_1.z.date().optional()),
    ownerId: zod_1.z.string().cuid().optional(),
    administratorId: zod_1.z.string().cuid().optional(),
});
exports.updateAssetSchema = zod_1.z.object({
    assetCode: zod_1.z.string().min(1, 'Asset code is required').max(50, 'Asset code must be less than 50 characters').optional(),
    name: zod_1.z.string().min(1, 'Asset name is required').max(200, 'Asset name must be less than 200 characters').optional(),
    description: zod_1.z.string().max(500, 'Description must be less than 500 characters').optional(),
    model: zod_1.z.string().max(100, 'Model must be less than 100 characters').optional(),
    manufacturer: zod_1.z.string().max(100, 'Manufacturer must be less than 100 characters').optional(),
    serialNumber: zod_1.z.string().max(100, 'Serial number must be less than 100 characters').optional(),
    location: zod_1.z.string().min(1, 'Location is required').max(200, 'Location must be less than 200 characters').optional(),
    installDate: zod_1.z.string().datetime('Invalid datetime format').optional().or(zod_1.z.date().optional()),
    ownerId: zod_1.z.string().cuid().optional(),
    administratorId: zod_1.z.string().cuid().optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.assetListQuerySchema = zod_1.z.object({
    page: zod_1.z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
    limit: zod_1.z.string().regex(/^\d+$/, 'Limit must be a positive integer').transform(Number).optional(),
    location: zod_1.z.string().optional(),
    isActive: zod_1.z.string().transform((val) => val === 'true').optional(),
    ownerId: zod_1.z.string().cuid().optional(),
    administratorId: zod_1.z.string().cuid().optional(),
});
exports.bulkCreateAssetsSchema = zod_1.z.object({
    assets: zod_1.z.array(exports.createAssetSchema).min(1, 'At least one asset is required').max(100, 'Cannot create more than 100 assets at once'),
});
// User management validation schemas
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    username: zod_1.z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be less than 50 characters'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    firstName: zod_1.z.string().min(1, 'First name is required').max(100, 'First name must be less than 100 characters'),
    lastName: zod_1.z.string().min(1, 'Last name is required').max(100, 'Last name must be less than 100 characters'),
    employeeId: zod_1.z.string().max(50, 'Employee ID must be less than 50 characters').optional(),
    role: zod_1.z.nativeEnum(database_1.UserRole).optional(),
});
exports.updateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format').optional(),
    username: zod_1.z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be less than 50 characters').optional(),
    firstName: zod_1.z.string().min(1, 'First name is required').max(100, 'First name must be less than 100 characters').optional(),
    lastName: zod_1.z.string().min(1, 'Last name is required').max(100, 'Last name must be less than 100 characters').optional(),
    employeeId: zod_1.z.string().max(50, 'Employee ID must be less than 50 characters').optional(),
    role: zod_1.z.nativeEnum(database_1.UserRole).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.userListQuerySchema = zod_1.z.object({
    page: zod_1.z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
    limit: zod_1.z.string().regex(/^\d+$/, 'Limit must be a positive integer').transform(Number).optional(),
    search: zod_1.z.string().optional(),
    role: zod_1.z.nativeEnum(database_1.UserRole).optional(),
    isActive: zod_1.z.string().transform((val) => val === 'true').optional(),
});
exports.updateUserRoleSchema = zod_1.z.object({
    role: zod_1.z.nativeEnum(database_1.UserRole),
});
exports.updateUserStatusSchema = zod_1.z.object({
    isActive: zod_1.z.boolean(),
});
exports.bulkUserOperationSchema = zod_1.z.object({
    userIds: zod_1.z.array(zod_1.z.string().cuid()).min(1, 'At least one user ID is required').max(50, 'Cannot perform bulk operation on more than 50 users at once'),
    operation: zod_1.z.enum(['activate', 'deactivate', 'delete']),
});
// Asset management validation schemas
exports.updateAssetOwnershipSchema = zod_1.z.object({
    ownerId: zod_1.z.string().cuid().optional(),
    administratorId: zod_1.z.string().cuid().optional(),
});
exports.updateAssetStatusSchema = zod_1.z.object({
    isActive: zod_1.z.boolean(),
});
exports.bulkAssetOperationSchema = zod_1.z.object({
    assetIds: zod_1.z.array(zod_1.z.string().cuid()).min(1, 'At least one asset ID is required').max(50, 'Cannot perform bulk operation on more than 50 assets at once'),
    operation: zod_1.z.enum(['activate', 'deactivate', 'delete']),
});

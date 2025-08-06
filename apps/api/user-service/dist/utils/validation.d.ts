import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    username: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    employeeId: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<{
        EMPLOYEE: "EMPLOYEE";
        TECHNICIAN: "TECHNICIAN";
        SUPERVISOR: "SUPERVISOR";
        ADMIN: "ADMIN";
    }>>;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    identifier: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const createAssetSchema: z.ZodObject<{
    assetCode: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    manufacturer: z.ZodOptional<z.ZodString>;
    serialNumber: z.ZodOptional<z.ZodString>;
    location: z.ZodString;
    installDate: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodOptional<z.ZodDate>]>;
    ownerId: z.ZodOptional<z.ZodString>;
    administratorId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateAssetSchema: z.ZodObject<{
    assetCode: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    manufacturer: z.ZodOptional<z.ZodString>;
    serialNumber: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    installDate: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodOptional<z.ZodDate>]>;
    ownerId: z.ZodOptional<z.ZodString>;
    administratorId: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const assetListQuerySchema: z.ZodObject<{
    page: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
    limit: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
    location: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
    ownerId: z.ZodOptional<z.ZodString>;
    administratorId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const bulkCreateAssetsSchema: z.ZodObject<{
    assets: z.ZodArray<z.ZodObject<{
        assetCode: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
        manufacturer: z.ZodOptional<z.ZodString>;
        serialNumber: z.ZodOptional<z.ZodString>;
        location: z.ZodString;
        installDate: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodOptional<z.ZodDate>]>;
        ownerId: z.ZodOptional<z.ZodString>;
        administratorId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const createUserSchema: z.ZodObject<{
    email: z.ZodString;
    username: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    employeeId: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<{
        EMPLOYEE: "EMPLOYEE";
        TECHNICIAN: "TECHNICIAN";
        SUPERVISOR: "SUPERVISOR";
        ADMIN: "ADMIN";
    }>>;
}, z.core.$strip>;
export declare const updateUserSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodString>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    employeeId: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<{
        EMPLOYEE: "EMPLOYEE";
        TECHNICIAN: "TECHNICIAN";
        SUPERVISOR: "SUPERVISOR";
        ADMIN: "ADMIN";
    }>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const userListQuerySchema: z.ZodObject<{
    page: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
    limit: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
    search: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<{
        EMPLOYEE: "EMPLOYEE";
        TECHNICIAN: "TECHNICIAN";
        SUPERVISOR: "SUPERVISOR";
        ADMIN: "ADMIN";
    }>>;
    isActive: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
}, z.core.$strip>;
export declare const updateUserRoleSchema: z.ZodObject<{
    role: z.ZodEnum<{
        EMPLOYEE: "EMPLOYEE";
        TECHNICIAN: "TECHNICIAN";
        SUPERVISOR: "SUPERVISOR";
        ADMIN: "ADMIN";
    }>;
}, z.core.$strip>;
export declare const updateUserStatusSchema: z.ZodObject<{
    isActive: z.ZodBoolean;
}, z.core.$strip>;
export declare const bulkUserOperationSchema: z.ZodObject<{
    userIds: z.ZodArray<z.ZodString>;
    operation: z.ZodEnum<{
        delete: "delete";
        activate: "activate";
        deactivate: "deactivate";
    }>;
}, z.core.$strip>;
export declare const updateAssetOwnershipSchema: z.ZodObject<{
    ownerId: z.ZodOptional<z.ZodString>;
    administratorId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateAssetStatusSchema: z.ZodObject<{
    isActive: z.ZodBoolean;
}, z.core.$strip>;
export declare const bulkAssetOperationSchema: z.ZodObject<{
    assetIds: z.ZodArray<z.ZodString>;
    operation: z.ZodEnum<{
        delete: "delete";
        activate: "activate";
        deactivate: "deactivate";
    }>;
}, z.core.$strip>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type AssetListQuery = z.infer<typeof assetListQuerySchema>;
export type BulkCreateAssetsInput = z.infer<typeof bulkCreateAssetsSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type BulkUserOperationInput = z.infer<typeof bulkUserOperationSchema>;
export type UpdateAssetOwnershipInput = z.infer<typeof updateAssetOwnershipSchema>;
export type UpdateAssetStatusInput = z.infer<typeof updateAssetStatusSchema>;
export type BulkAssetOperationInput = z.infer<typeof bulkAssetOperationSchema>;
//# sourceMappingURL=validation.d.ts.map
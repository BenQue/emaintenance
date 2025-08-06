import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
/**
 * Generic validation middleware factory
 */
export declare const validate: (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const assetSchemas: {
    create: z.ZodObject<{
        body: z.ZodObject<{
            assetCode: z.ZodString;
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            location: z.ZodString;
            model: z.ZodOptional<z.ZodString>;
            manufacturer: z.ZodOptional<z.ZodString>;
            serialNumber: z.ZodOptional<z.ZodString>;
            installDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            assetCode: string;
            location: string;
            description?: string | undefined;
            model?: string | undefined;
            manufacturer?: string | undefined;
            serialNumber?: string | undefined;
            installDate?: string | undefined;
        }, {
            name: string;
            assetCode: string;
            location: string;
            description?: string | undefined;
            model?: string | undefined;
            manufacturer?: string | undefined;
            serialNumber?: string | undefined;
            installDate?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            name: string;
            assetCode: string;
            location: string;
            description?: string | undefined;
            model?: string | undefined;
            manufacturer?: string | undefined;
            serialNumber?: string | undefined;
            installDate?: string | undefined;
        };
    }, {
        body: {
            name: string;
            assetCode: string;
            location: string;
            description?: string | undefined;
            model?: string | undefined;
            manufacturer?: string | undefined;
            serialNumber?: string | undefined;
            installDate?: string | undefined;
        };
    }>;
    update: z.ZodObject<{
        params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        body: z.ZodObject<{
            assetCode: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            location: z.ZodOptional<z.ZodString>;
            model: z.ZodOptional<z.ZodString>;
            manufacturer: z.ZodOptional<z.ZodString>;
            serialNumber: z.ZodOptional<z.ZodString>;
            installDate: z.ZodOptional<z.ZodString>;
            isActive: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            name?: string | undefined;
            assetCode?: string | undefined;
            description?: string | undefined;
            model?: string | undefined;
            manufacturer?: string | undefined;
            serialNumber?: string | undefined;
            location?: string | undefined;
            installDate?: string | undefined;
            isActive?: boolean | undefined;
        }, {
            name?: string | undefined;
            assetCode?: string | undefined;
            description?: string | undefined;
            model?: string | undefined;
            manufacturer?: string | undefined;
            serialNumber?: string | undefined;
            location?: string | undefined;
            installDate?: string | undefined;
            isActive?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            id: string;
        };
        body: {
            name?: string | undefined;
            assetCode?: string | undefined;
            description?: string | undefined;
            model?: string | undefined;
            manufacturer?: string | undefined;
            serialNumber?: string | undefined;
            location?: string | undefined;
            installDate?: string | undefined;
            isActive?: boolean | undefined;
        };
    }, {
        params: {
            id: string;
        };
        body: {
            name?: string | undefined;
            assetCode?: string | undefined;
            description?: string | undefined;
            model?: string | undefined;
            manufacturer?: string | undefined;
            serialNumber?: string | undefined;
            location?: string | undefined;
            installDate?: string | undefined;
            isActive?: boolean | undefined;
        };
    }>;
    getById: z.ZodObject<{
        params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            id: string;
        };
    }, {
        params: {
            id: string;
        };
    }>;
    list: z.ZodObject<{
        query: z.ZodObject<{
            page: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
            limit: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
            search: z.ZodOptional<z.ZodString>;
            location: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE"]>>;
            sortBy: z.ZodOptional<z.ZodEnum<["name", "assetCode", "createdAt", "updatedAt"]>>;
            sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
        }, "strip", z.ZodTypeAny, {
            location?: string | undefined;
            page?: number | undefined;
            limit?: number | undefined;
            search?: string | undefined;
            sortBy?: "name" | "assetCode" | "createdAt" | "updatedAt" | undefined;
            sortOrder?: "asc" | "desc" | undefined;
            status?: "ACTIVE" | "INACTIVE" | undefined;
        }, {
            location?: string | undefined;
            page?: string | undefined;
            limit?: string | undefined;
            search?: string | undefined;
            sortBy?: "name" | "assetCode" | "createdAt" | "updatedAt" | undefined;
            sortOrder?: "asc" | "desc" | undefined;
            status?: "ACTIVE" | "INACTIVE" | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        query: {
            location?: string | undefined;
            page?: number | undefined;
            limit?: number | undefined;
            search?: string | undefined;
            sortBy?: "name" | "assetCode" | "createdAt" | "updatedAt" | undefined;
            sortOrder?: "asc" | "desc" | undefined;
            status?: "ACTIVE" | "INACTIVE" | undefined;
        };
    }, {
        query: {
            location?: string | undefined;
            page?: string | undefined;
            limit?: string | undefined;
            search?: string | undefined;
            sortBy?: "name" | "assetCode" | "createdAt" | "updatedAt" | undefined;
            sortOrder?: "asc" | "desc" | undefined;
            status?: "ACTIVE" | "INACTIVE" | undefined;
        };
    }>;
    search: z.ZodObject<{
        query: z.ZodObject<{
            q: z.ZodString;
            location: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE"]>>;
            limit: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            q: string;
            location?: string | undefined;
            limit?: number | undefined;
            status?: "ACTIVE" | "INACTIVE" | undefined;
        }, {
            q: string;
            location?: string | undefined;
            limit?: string | undefined;
            status?: "ACTIVE" | "INACTIVE" | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        query: {
            q: string;
            location?: string | undefined;
            limit?: number | undefined;
            status?: "ACTIVE" | "INACTIVE" | undefined;
        };
    }, {
        query: {
            q: string;
            location?: string | undefined;
            limit?: string | undefined;
            status?: "ACTIVE" | "INACTIVE" | undefined;
        };
    }>;
};
export declare const validateCreateAsset: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateUpdateAsset: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateGetAssetById: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateListAssets: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateSearchAssets: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=validation.middleware.d.ts.map
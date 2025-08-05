import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
/**
 * Generic validation middleware factory
 */
export declare const validate: (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const assetSchemas: {
    create: any;
    update: any;
    getById: any;
    list: any;
    search: any;
};
export declare const validateCreateAsset: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateUpdateAsset: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateGetAssetById: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateListAssets: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateSearchAssets: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=validation.middleware.d.ts.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSearchAssets = exports.validateListAssets = exports.validateGetAssetById = exports.validateUpdateAsset = exports.validateCreateAsset = exports.assetSchemas = exports.validate = void 0;
const zod_1 = require("zod");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Generic validation middleware factory
 */
const validate = (schema) => {
    return (req, res, next) => {
        const correlationId = req.headers['x-correlation-id'] || `asset-${Date.now()}`;
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            logger_1.default.debug('Request validation passed', {
                correlationId,
                path: req.path,
                method: req.method
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const validationErrors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code
                }));
                logger_1.default.warn('Request validation failed', {
                    correlationId,
                    path: req.path,
                    method: req.method,
                    errors: validationErrors
                });
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validationErrors,
                    timestamp: new Date().toISOString(),
                });
            }
            logger_1.default.error('Validation middleware error', {
                correlationId,
                error: error instanceof Error ? error.message : 'Unknown validation error'
            });
            return res.status(500).json({
                success: false,
                error: 'Internal validation error',
                timestamp: new Date().toISOString(),
            });
        }
    };
};
exports.validate = validate;
// Asset validation schemas
exports.assetSchemas = {
    // Create asset validation
    create: zod_1.z.object({
        body: zod_1.z.object({
            assetCode: zod_1.z.string().min(1, 'Asset code is required').max(50, 'Asset code too long'),
            name: zod_1.z.string().min(1, 'Asset name is required').max(200, 'Asset name too long'),
            description: zod_1.z.string().optional(),
            location: zod_1.z.string().min(1, 'Location is required').max(200, 'Location too long'),
            model: zod_1.z.string().optional(),
            manufacturer: zod_1.z.string().optional(),
            serialNumber: zod_1.z.string().optional(),
            installDate: zod_1.z.string().datetime().optional()
        })
    }),
    // Update asset validation
    update: zod_1.z.object({
        params: zod_1.z.object({
            id: zod_1.z.string().min(1, 'Asset ID is required')
        }),
        body: zod_1.z.object({
            assetCode: zod_1.z.string().min(1).max(50).optional(),
            name: zod_1.z.string().min(1).max(200).optional(),
            description: zod_1.z.string().optional(),
            location: zod_1.z.string().min(1).max(200).optional(),
            model: zod_1.z.string().optional(),
            manufacturer: zod_1.z.string().optional(),
            serialNumber: zod_1.z.string().optional(),
            installDate: zod_1.z.string().datetime().optional(),
            isActive: zod_1.z.boolean().optional()
        })
    }),
    // Get asset by ID validation
    getById: zod_1.z.object({
        params: zod_1.z.object({
            id: zod_1.z.string().min(1, 'Asset ID is required')
        })
    }),
    // List assets validation
    list: zod_1.z.object({
        query: zod_1.z.object({
            page: zod_1.z.string().transform(val => parseInt(val, 10)).pipe(zod_1.z.number().min(1)).optional(),
            limit: zod_1.z.string().transform(val => parseInt(val, 10)).pipe(zod_1.z.number().min(1).max(100)).optional(),
            search: zod_1.z.string().optional(),
            location: zod_1.z.string().optional(),
            status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).optional(),
            sortBy: zod_1.z.enum(['name', 'assetCode', 'createdAt', 'updatedAt']).optional(),
            sortOrder: zod_1.z.enum(['asc', 'desc']).optional()
        })
    }),
    // Search assets validation
    search: zod_1.z.object({
        query: zod_1.z.object({
            q: zod_1.z.string().min(1, 'Search query is required'),
            location: zod_1.z.string().optional(),
            status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).optional(),
            limit: zod_1.z.string().transform(val => parseInt(val, 10)).pipe(zod_1.z.number().min(1).max(50)).optional()
        })
    })
};
// Validation middleware for asset operations
exports.validateCreateAsset = (0, exports.validate)(exports.assetSchemas.create);
exports.validateUpdateAsset = (0, exports.validate)(exports.assetSchemas.update);
exports.validateGetAssetById = (0, exports.validate)(exports.assetSchemas.getById);
exports.validateListAssets = (0, exports.validate)(exports.assetSchemas.list);
exports.validateSearchAssets = (0, exports.validate)(exports.assetSchemas.search);

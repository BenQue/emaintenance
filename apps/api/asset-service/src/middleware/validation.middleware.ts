import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import logger from '../utils/logger';

/**
 * Generic validation middleware factory
 */
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const correlationId = req.headers['x-correlation-id'] || `asset-${Date.now()}`;
    
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      logger.debug('Request validation passed', {
        correlationId,
        path: req.path,
        method: req.method
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        logger.warn('Request validation failed', {
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
      
      logger.error('Validation middleware error', {
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

// Asset validation schemas
export const assetSchemas = {
  // Create asset validation
  create: z.object({
    body: z.object({
      assetCode: z.string().min(1, 'Asset code is required').max(50, 'Asset code too long'),
      name: z.string().min(1, 'Asset name is required').max(200, 'Asset name too long'),
      description: z.string().optional(),
      location: z.string().min(1, 'Location is required').max(200, 'Location too long'),
      model: z.string().optional(),
      manufacturer: z.string().optional(),
      serialNumber: z.string().optional(),
      installDate: z.string().datetime().optional()
    })
  }),

  // Update asset validation
  update: z.object({
    params: z.object({
      id: z.string().min(1, 'Asset ID is required')
    }),
    body: z.object({
      assetCode: z.string().min(1).max(50).optional(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().optional(),
      location: z.string().min(1).max(200).optional(),
      model: z.string().optional(),
      manufacturer: z.string().optional(),
      serialNumber: z.string().optional(),
      installDate: z.string().datetime().optional(),
      isActive: z.boolean().optional()
    })
  }),

  // Get asset by ID validation
  getById: z.object({
    params: z.object({
      id: z.string().min(1, 'Asset ID is required')
    })
  }),

  // List assets validation
  list: z.object({
    query: z.object({
      page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
      limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
      search: z.string().optional(),
      location: z.string().optional(),
      status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
      sortBy: z.enum(['name', 'assetCode', 'createdAt', 'updatedAt']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional()
    })
  }),

  // Search assets validation
  search: z.object({
    query: z.object({
      q: z.string().min(1, 'Search query is required'),
      location: z.string().optional(),
      status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
      limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(50)).optional()
    })
  })
};

// Validation middleware for asset operations
export const validateCreateAsset = validate(assetSchemas.create);
export const validateUpdateAsset = validate(assetSchemas.update);
export const validateGetAssetById = validate(assetSchemas.getById);
export const validateListAssets = validate(assetSchemas.list);
export const validateSearchAssets = validate(assetSchemas.search);
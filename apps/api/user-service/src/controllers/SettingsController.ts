import { Request, Response } from 'express';
import { SettingsService } from '../services/SettingsService';
import { 
  masterDataCreateSchema, 
  masterDataUpdateSchema, 
  masterDataListQuerySchema
} from '../utils/validation';
import { formatValidationErrors, createErrorResponse, createSuccessResponse, getErrorStatusCode } from '../utils/errorHandler';

export class SettingsController {
  private settingsService: SettingsService;

  constructor() {
    this.settingsService = new SettingsService();
  }

  // Categories endpoints
  getCategories = async (req: Request, res: Response) => {
    try {
      const validationResult = masterDataListQuerySchema.safeParse(req.query);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const query = validationResult.data;
      const result = await this.settingsService.getCategories(query);

      res.status(200).json(createSuccessResponse(result));

    } catch (error) {
      console.error('Get categories error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get categories';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  createCategory = async (req: Request, res: Response) => {
    try {
      const validationResult = masterDataCreateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const categoryData = validationResult.data;
      const category = await this.settingsService.createCategory(categoryData);

      res.status(201).json(createSuccessResponse(category));

    } catch (error) {
      console.error('Create category error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create category';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  updateCategory = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Category ID is required', 400));
      }

      const validationResult = masterDataUpdateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const updateData = validationResult.data;
      const category = await this.settingsService.updateCategory(id, updateData);

      res.status(200).json(createSuccessResponse(category));

    } catch (error) {
      console.error('Update category error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update category';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  deleteCategory = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Category ID is required', 400));
      }

      const category = await this.settingsService.deleteCategory(id);

      res.status(200).json(createSuccessResponse(category));

    } catch (error) {
      console.error('Delete category error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete category';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  getCategoryUsage = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Category ID is required', 400));
      }

      const usage = await this.settingsService.getCategoryUsage(id);

      res.status(200).json(createSuccessResponse(usage));

    } catch (error) {
      console.error('Get category usage error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get category usage';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  // Locations endpoints
  getLocations = async (req: Request, res: Response) => {
    try {
      const validationResult = masterDataListQuerySchema.safeParse(req.query);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const query = validationResult.data;
      const result = await this.settingsService.getLocations(query);

      res.status(200).json(createSuccessResponse(result));

    } catch (error) {
      console.error('Get locations error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get locations';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  createLocation = async (req: Request, res: Response) => {
    try {
      const validationResult = masterDataCreateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const locationData = validationResult.data;
      const location = await this.settingsService.createLocation(locationData);

      res.status(201).json(createSuccessResponse(location));

    } catch (error) {
      console.error('Create location error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create location';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  updateLocation = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Location ID is required', 400));
      }

      const validationResult = masterDataUpdateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const updateData = validationResult.data;
      const location = await this.settingsService.updateLocation(id, updateData);

      res.status(200).json(createSuccessResponse(location));

    } catch (error) {
      console.error('Update location error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update location';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  deleteLocation = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Location ID is required', 400));
      }

      const location = await this.settingsService.deleteLocation(id);

      res.status(200).json(createSuccessResponse(location));

    } catch (error) {
      console.error('Delete location error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete location';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  getLocationUsage = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Location ID is required', 400));
      }

      const usage = await this.settingsService.getLocationUsage(id);

      res.status(200).json(createSuccessResponse(usage));

    } catch (error) {
      console.error('Get location usage error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location usage';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  // Fault Codes endpoints
  getFaultCodes = async (req: Request, res: Response) => {
    try {
      const validationResult = masterDataListQuerySchema.safeParse(req.query);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const query = validationResult.data;
      const result = await this.settingsService.getFaultCodes(query);

      res.status(200).json(createSuccessResponse(result));

    } catch (error) {
      console.error('Get fault codes error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get fault codes';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  createFaultCode = async (req: Request, res: Response) => {
    try {
      const validationResult = masterDataCreateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const faultCodeData = validationResult.data;
      const faultCode = await this.settingsService.createFaultCode(faultCodeData);

      res.status(201).json(createSuccessResponse(faultCode));

    } catch (error) {
      console.error('Create fault code error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create fault code';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  updateFaultCode = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Fault code ID is required', 400));
      }

      const validationResult = masterDataUpdateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const updateData = validationResult.data;
      const faultCode = await this.settingsService.updateFaultCode(id, updateData);

      res.status(200).json(createSuccessResponse(faultCode));

    } catch (error) {
      console.error('Update fault code error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update fault code';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  deleteFaultCode = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Fault code ID is required', 400));
      }

      const faultCode = await this.settingsService.deleteFaultCode(id);

      res.status(200).json(createSuccessResponse(faultCode));

    } catch (error) {
      console.error('Delete fault code error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete fault code';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  getFaultCodeUsage = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Fault code ID is required', 400));
      }

      const usage = await this.settingsService.getFaultCodeUsage(id);

      res.status(200).json(createSuccessResponse(usage));

    } catch (error) {
      console.error('Get fault code usage error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get fault code usage';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  // Reasons endpoints
  getReasons = async (req: Request, res: Response) => {
    try {
      const validationResult = masterDataListQuerySchema.safeParse(req.query);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const query = validationResult.data;
      const result = await this.settingsService.getReasons(query);

      res.status(200).json(createSuccessResponse(result));

    } catch (error) {
      console.error('Get reasons error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get reasons';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  createReason = async (req: Request, res: Response) => {
    try {
      const validationResult = masterDataCreateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const reasonData = validationResult.data;
      const reason = await this.settingsService.createReason(reasonData);

      res.status(201).json(createSuccessResponse(reason));

    } catch (error) {
      console.error('Create reason error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create reason';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  updateReason = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Reason ID is required', 400));
      }

      const validationResult = masterDataUpdateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const updateData = validationResult.data;
      const reason = await this.settingsService.updateReason(id, updateData);

      res.status(200).json(createSuccessResponse(reason));

    } catch (error) {
      console.error('Update reason error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update reason';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  deleteReason = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Reason ID is required', 400));
      }

      const reason = await this.settingsService.deleteReason(id);

      res.status(200).json(createSuccessResponse(reason));

    } catch (error) {
      console.error('Delete reason error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete reason';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  getReasonUsage = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Reason ID is required', 400));
      }

      const usage = await this.settingsService.getReasonUsage(id);

      res.status(200).json(createSuccessResponse(usage));

    } catch (error) {
      console.error('Get reason usage error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get reason usage';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  // Priority Levels endpoints
  getPriorityLevels = async (req: Request, res: Response) => {
    try {
      const validationResult = masterDataListQuerySchema.safeParse(req.query);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const query = validationResult.data;
      const result = await this.settingsService.getPriorityLevels(query);

      res.status(200).json(createSuccessResponse(result));

    } catch (error) {
      console.error('Get priority levels error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get priority levels';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  createPriorityLevel = async (req: Request, res: Response) => {
    try {
      const validationResult = masterDataCreateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const priorityData = validationResult.data;
      const priority = await this.settingsService.createPriorityLevel(priorityData);

      res.status(201).json(createSuccessResponse(priority));

    } catch (error) {
      console.error('Create priority level error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create priority level';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  updatePriorityLevel = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Priority level ID is required', 400));
      }

      const validationResult = masterDataUpdateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const updateData = validationResult.data;
      const priority = await this.settingsService.updatePriorityLevel(id, updateData);

      res.status(200).json(createSuccessResponse(priority));

    } catch (error) {
      console.error('Update priority level error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update priority level';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  deletePriorityLevel = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Priority level ID is required', 400));
      }

      const priority = await this.settingsService.deletePriorityLevel(id);

      res.status(200).json(createSuccessResponse(priority));

    } catch (error) {
      console.error('Delete priority level error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete priority level';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  getPriorityLevelUsage = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Priority level ID is required', 400));
      }

      const usage = await this.settingsService.getPriorityLevelUsage(id);

      res.status(200).json(createSuccessResponse(usage));

    } catch (error) {
      console.error('Get priority level usage error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get priority level usage';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  // Integrated Categories with Reasons endpoints
  getCategoriesWithReasons = async (req: Request, res: Response) => {
    try {
      const validationResult = masterDataListQuerySchema.safeParse(req.query);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const query = validationResult.data;
      const result = await this.settingsService.getCategoriesWithReasons(query);

      res.status(200).json(createSuccessResponse(result));

    } catch (error) {
      console.error('Get categories with reasons error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get categories with reasons';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  getReasonsByCategory = async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      const validationResult = masterDataListQuerySchema.safeParse(req.query);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      if (!categoryId) {
        return res.status(400).json(createErrorResponse('Category ID is required', 400));
      }

      const query = validationResult.data;
      const result = await this.settingsService.getReasonsByCategory(categoryId, query);

      res.status(200).json(createSuccessResponse(result));

    } catch (error) {
      console.error('Get reasons by category error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get reasons by category';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  createReasonForCategory = async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      const validationResult = masterDataCreateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      if (!categoryId) {
        return res.status(400).json(createErrorResponse('Category ID is required', 400));
      }

      const data = validationResult.data;
      const result = await this.settingsService.createReasonForCategory(categoryId, data);

      res.status(201).json(createSuccessResponse(result));

    } catch (error) {
      console.error('Create reason for category error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create reason for category';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };
}
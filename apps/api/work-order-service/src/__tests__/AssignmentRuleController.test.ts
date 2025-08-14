import { Request, Response } from 'express';
import { PrismaClient } from '@emaintenance/database';
import { AssignmentRuleController } from '../controllers/AssignmentRuleController';

// Mock dependencies
jest.mock('../services/AssignmentRuleService');

const mockPrisma = {} as PrismaClient;

const mockAssignmentRuleService = {
  createRule: jest.fn(),
  getRuleById: jest.fn(),
  getRules: jest.fn(),
  updateRule: jest.fn(),
  deleteRule: jest.fn(),
};

// Mock the service constructor
jest.doMock('../services/AssignmentRuleService', () => ({
  AssignmentRuleService: jest.fn().mockImplementation(() => mockAssignmentRuleService),
}));

describe('AssignmentRuleController', () => {
  let controller: AssignmentRuleController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const userId = 'user-id';

  beforeEach(() => {
    controller = new AssignmentRuleController(mockPrisma);
    
    mockRequest = {
      user: { id: userId },
      body: {},
      params: {},
      query: {},
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    jest.clearAllMocks();
  });

  describe('createRule', () => {
    const validRuleData = {
      name: 'Test Rule',
      priority: 5,
      isActive: true,
      assetTypes: [],
      categories: ['电气'],
      locations: [],
      priorities: ['HIGH'],
      assignToId: 'technician-id',
    };

    it('should create rule successfully', async () => {
      const mockCreatedRule = { id: 'rule-id', ...validRuleData };
      mockAssignmentRuleService.createRule.mockResolvedValue(mockCreatedRule);
      mockRequest.body = validRuleData;

      await controller.createRule(mockRequest as Request, mockResponse as Response);

      expect(mockAssignmentRuleService.createRule).toHaveBeenCalledWith(validRuleData, userId);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedRule,
        message: 'Assignment rule created successfully',
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.createRule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not authenticated',
      });
    });

    it('should return 400 for validation errors', async () => {
      mockRequest.body = { name: '' }; // Invalid data

      await controller.createRule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array),
      });
    });

    it('should return 500 for service errors', async () => {
      mockAssignmentRuleService.createRule.mockRejectedValue(new Error('Service error'));
      mockRequest.body = validRuleData;

      await controller.createRule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Service error',
      });
    });
  });

  describe('getRuleById', () => {
    const ruleId = 'rule-id';
    const mockRule = {
      id: ruleId,
      name: 'Test Rule',
      priority: 5,
      isActive: true,
      assetTypes: [],
      categories: ['电气'],
      locations: [],
      priorities: ['HIGH'],
      assignToId: 'technician-id',
      assignTo: {
        id: 'technician-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should get rule by id successfully', async () => {
      mockAssignmentRuleService.getRuleById.mockResolvedValue(mockRule);
      mockRequest.params = { id: ruleId };

      await controller.getRuleById(mockRequest as Request, mockResponse as Response);

      expect(mockAssignmentRuleService.getRuleById).toHaveBeenCalledWith(ruleId, userId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockRule,
      });
    });

    it('should return 404 if rule not found', async () => {
      mockAssignmentRuleService.getRuleById.mockResolvedValue(null);
      mockRequest.params = { id: ruleId };

      await controller.getRuleById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Assignment rule not found',
      });
    });
  });

  describe('getRules', () => {
    const mockRulesResult = {
      rules: [
        {
          id: 'rule-1',
          name: 'Rule 1',
          priority: 5,
          isActive: true,
          assetTypes: [],
          categories: ['电气'],
          locations: [],
          priorities: ['HIGH'],
          assignToId: 'tech-1',
          assignTo: {
            id: 'tech-1',
            firstName: 'Tech',
            lastName: 'One',
            email: 'tech1@example.com',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    };

    it('should get rules with pagination', async () => {
      mockAssignmentRuleService.getRules.mockResolvedValue(mockRulesResult);
      mockRequest.query = { page: '1', limit: '10' };

      await controller.getRules(mockRequest as Request, mockResponse as Response);

      expect(mockAssignmentRuleService.getRules).toHaveBeenCalledWith(
        { page: 1, limit: 10 },
        userId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockRulesResult.rules,
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it('should handle query parameter validation', async () => {
      mockRequest.query = { isActive: 'invalid' };

      await controller.getRules(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array),
      });
    });
  });

  describe('updateRule', () => {
    const ruleId = 'rule-id';
    const updateData = { name: 'Updated Rule', priority: 8 };
    const mockUpdatedRule = { id: ruleId, ...updateData };

    it('should update rule successfully', async () => {
      mockAssignmentRuleService.updateRule.mockResolvedValue(mockUpdatedRule);
      mockRequest.params = { id: ruleId };
      mockRequest.body = updateData;

      await controller.updateRule(mockRequest as Request, mockResponse as Response);

      expect(mockAssignmentRuleService.updateRule).toHaveBeenCalledWith(
        ruleId,
        updateData,
        userId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedRule,
        message: 'Assignment rule updated successfully',
      });
    });

    it('should return 404 if rule not found for update', async () => {
      mockAssignmentRuleService.updateRule.mockResolvedValue(null);
      mockRequest.params = { id: ruleId };
      mockRequest.body = updateData;

      await controller.updateRule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Assignment rule not found',
      });
    });
  });

  describe('deleteRule', () => {
    const ruleId = 'rule-id';

    it('should delete rule successfully', async () => {
      mockAssignmentRuleService.deleteRule.mockResolvedValue(true);
      mockRequest.params = { id: ruleId };

      await controller.deleteRule(mockRequest as Request, mockResponse as Response);

      expect(mockAssignmentRuleService.deleteRule).toHaveBeenCalledWith(ruleId, userId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Assignment rule deleted successfully',
      });
    });

    it('should return 404 if rule not found for deletion', async () => {
      mockAssignmentRuleService.deleteRule.mockResolvedValue(false);
      mockRequest.params = { id: ruleId };

      await controller.deleteRule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Assignment rule not found',
      });
    });
  });
});
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AssetController_1 = require("./AssetController");
const AssetService_1 = require("../services/AssetService");
// Mock dependencies
jest.mock('../services/AssetService');
describe('AssetController', () => {
    let assetController;
    let mockAssetService;
    let mockRequest;
    let mockResponse;
    beforeEach(() => {
        jest.clearAllMocks();
        mockAssetService = {
            createAsset: jest.fn(),
            getAssetById: jest.fn(),
            listAssets: jest.fn(),
            updateAsset: jest.fn(),
            deleteAsset: jest.fn(),
            bulkCreateAssets: jest.fn(),
            getAssetStats: jest.fn(),
        };
        AssetService_1.AssetService.mockImplementation(() => mockAssetService);
        assetController = new AssetController_1.AssetController();
        mockRequest = {
            body: {},
            params: {},
            query: {},
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });
    const mockAsset = {
        id: 'asset123',
        assetCode: 'AC001',
        name: 'Test Asset',
        description: 'Test Description',
        location: 'Test Location',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: null,
        administrator: null,
        ownerId: null,
        administratorId: null,
        model: null,
        manufacturer: null,
        serialNumber: null,
        installDate: null,
        workOrders: [],
    };
    describe('createAsset', () => {
        it('should create asset successfully', async () => {
            const assetData = {
                assetCode: 'AC001',
                name: 'Test Asset',
                location: 'Test Location',
            };
            mockRequest.body = assetData;
            mockAssetService.createAsset.mockResolvedValue(mockAsset);
            await assetController.createAsset(mockRequest, mockResponse);
            expect(mockAssetService.createAsset).toHaveBeenCalledWith(assetData);
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockAsset,
                timestamp: expect.any(String),
            });
        });
        it('should return validation error for invalid input', async () => {
            mockRequest.body = { name: 'Test Asset' }; // Missing required fields
            await assetController.createAsset(mockRequest, mockResponse);
            expect(mockAssetService.createAsset).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: expect.stringContaining('Validation failed'),
                timestamp: expect.any(String),
            });
        });
        it('should handle service errors', async () => {
            const assetData = {
                assetCode: 'AC001',
                name: 'Test Asset',
                location: 'Test Location',
            };
            mockRequest.body = assetData;
            mockAssetService.createAsset.mockRejectedValue(new Error('Asset code already exists'));
            await assetController.createAsset(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(409);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Asset code already exists',
                timestamp: expect.any(String),
            });
        });
    });
    describe('getAssetById', () => {
        it('should get asset by ID successfully', async () => {
            mockRequest.params = { id: 'asset123' };
            mockAssetService.getAssetById.mockResolvedValue(mockAsset);
            await assetController.getAssetById(mockRequest, mockResponse);
            expect(mockAssetService.getAssetById).toHaveBeenCalledWith('asset123');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockAsset,
                timestamp: expect.any(String),
            });
        });
        it('should return 404 for non-existent asset', async () => {
            mockRequest.params = { id: 'nonexistent' };
            mockAssetService.getAssetById.mockResolvedValue(null);
            await assetController.getAssetById(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Asset not found',
                timestamp: expect.any(String),
            });
        });
        it('should return 400 for missing ID', async () => {
            mockRequest.params = {};
            await assetController.getAssetById(mockRequest, mockResponse);
            expect(mockAssetService.getAssetById).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });
    });
    describe('listAssets', () => {
        it('should list assets successfully', async () => {
            const mockListResult = {
                assets: [mockAsset],
                total: 1,
                totalPages: 1,
                currentPage: 1,
            };
            mockRequest.query = { page: '1', limit: '20' };
            mockAssetService.listAssets.mockResolvedValue(mockListResult);
            await assetController.listAssets(mockRequest, mockResponse);
            expect(mockAssetService.listAssets).toHaveBeenCalledWith({ page: 1, limit: 20 });
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    assets: [mockAsset],
                    pagination: {
                        currentPage: 1,
                        totalPages: 1,
                        total: 1,
                        limit: 20,
                    },
                },
                timestamp: expect.any(String),
            });
        });
        it('should handle validation errors for query parameters', async () => {
            mockRequest.query = { page: 'invalid' };
            await assetController.listAssets(mockRequest, mockResponse);
            expect(mockAssetService.listAssets).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });
    });
    describe('updateAsset', () => {
        it('should update asset successfully', async () => {
            const updateData = { name: 'Updated Asset' };
            const updatedAsset = { ...mockAsset, name: 'Updated Asset' };
            mockRequest.params = { id: 'asset123' };
            mockRequest.body = updateData;
            mockAssetService.updateAsset.mockResolvedValue(updatedAsset);
            await assetController.updateAsset(mockRequest, mockResponse);
            expect(mockAssetService.updateAsset).toHaveBeenCalledWith('asset123', updateData);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: updatedAsset,
                timestamp: expect.any(String),
            });
        });
        it('should handle asset not found error', async () => {
            mockRequest.params = { id: 'nonexistent' };
            mockRequest.body = { name: 'Updated Asset' };
            mockAssetService.updateAsset.mockRejectedValue(new Error('Asset not found'));
            await assetController.updateAsset(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });
    });
    describe('deleteAsset', () => {
        it('should delete asset successfully', async () => {
            const deletedAsset = { ...mockAsset, isActive: false };
            mockRequest.params = { id: 'asset123' };
            mockAssetService.deleteAsset.mockResolvedValue(deletedAsset);
            await assetController.deleteAsset(mockRequest, mockResponse);
            expect(mockAssetService.deleteAsset).toHaveBeenCalledWith('asset123');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    message: 'Asset deleted successfully',
                    asset: deletedAsset,
                },
                timestamp: expect.any(String),
            });
        });
        it('should handle asset not found error', async () => {
            mockRequest.params = { id: 'nonexistent' };
            mockAssetService.deleteAsset.mockRejectedValue(new Error('Asset not found'));
            await assetController.deleteAsset(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });
    });
    describe('bulkCreateAssets', () => {
        it('should bulk create assets successfully', async () => {
            const bulkData = {
                assets: [
                    { assetCode: 'AC001', name: 'Asset 1', location: 'Location 1' },
                    { assetCode: 'AC002', name: 'Asset 2', location: 'Location 2' },
                ],
            };
            const mockResult = {
                created: [mockAsset, { ...mockAsset, id: 'asset124', assetCode: 'AC002' }],
                errors: [],
            };
            mockRequest.body = bulkData;
            mockAssetService.bulkCreateAssets.mockResolvedValue(mockResult);
            await assetController.bulkCreateAssets(mockRequest, mockResponse);
            expect(mockAssetService.bulkCreateAssets).toHaveBeenCalledWith(bulkData);
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    message: 'All assets created successfully',
                    created: mockResult.created,
                    summary: {
                        totalRequested: 2,
                        successfullyCreated: 2,
                        errors: 0,
                    },
                },
                timestamp: expect.any(String),
            });
        });
        it('should handle partial success with errors', async () => {
            const bulkData = {
                assets: [
                    { assetCode: 'AC001', name: 'Asset 1', location: 'Location 1' },
                    { assetCode: 'AC002', name: 'Asset 2', location: 'Location 2' },
                ],
            };
            const mockResult = {
                created: [mockAsset],
                errors: [{ index: 1, assetCode: 'AC002', error: 'Asset code already exists' }],
            };
            mockRequest.body = bulkData;
            mockAssetService.bulkCreateAssets.mockResolvedValue(mockResult);
            await assetController.bulkCreateAssets(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(207);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    message: 'Bulk creation completed with errors',
                    created: mockResult.created,
                    errors: mockResult.errors,
                    summary: {
                        totalRequested: 2,
                        successfullyCreated: 1,
                        errors: 1,
                    },
                },
                timestamp: expect.any(String),
            });
        });
    });
    describe('getAssetStats', () => {
        it('should get asset statistics successfully', async () => {
            const mockStats = {
                total: 10,
                active: 8,
                inactive: 2,
                byLocation: { 'Location 1': 5, 'Location 2': 5 },
            };
            mockAssetService.getAssetStats.mockResolvedValue(mockStats);
            await assetController.getAssetStats(mockRequest, mockResponse);
            expect(mockAssetService.getAssetStats).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockStats,
                timestamp: expect.any(String),
            });
        });
        it('should handle service errors', async () => {
            mockAssetService.getAssetStats.mockRejectedValue(new Error('Database error'));
            await assetController.getAssetStats(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Database error',
                timestamp: expect.any(String),
            });
        });
    });
});

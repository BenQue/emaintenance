"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AssetService_1 = require("./AssetService");
// Mock the AssetRepository
jest.mock('../repositories/AssetRepository');
describe('AssetService - Manual Asset Code Input Features', () => {
    let service;
    let mockPrisma;
    let mockAssetRepository;
    beforeEach(() => {
        mockPrisma = {
            asset: {
                findUnique: jest.fn(),
                findMany: jest.fn(),
            }
        };
        service = new AssetService_1.AssetService(mockPrisma);
        mockAssetRepository = service.assetRepository;
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('searchAssetsByCode', () => {
        const mockAssets = [
            {
                id: '123e4567-e89b-12d3-a456-426614174000',
                assetCode: 'EQ-001',
                name: 'Equipment 001',
                description: null,
                location: 'Building A',
                model: null,
                manufacturer: null,
                serialNumber: null,
                installDate: null,
                isActive: true,
                ownerId: null,
                administratorId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: '123e4567-e89b-12d3-a456-426614174001',
                assetCode: 'EQ-002',
                name: 'Equipment 002',
                description: null,
                location: 'Building A',
                model: null,
                manufacturer: null,
                serialNumber: null,
                installDate: null,
                isActive: true,
                ownerId: null,
                administratorId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        it('should search assets by partial code successfully', async () => {
            mockAssetRepository.searchAssetsByCode.mockResolvedValue(mockAssets);
            const result = await service.searchAssetsByCode('EQ');
            expect(mockAssetRepository.searchAssetsByCode).toHaveBeenCalledWith('EQ', {});
            expect(result).toEqual(mockAssets);
        });
        it('should search assets by partial code with filters', async () => {
            const filters = { location: 'Building A', isActive: true, limit: 5 };
            mockAssetRepository.searchAssetsByCode.mockResolvedValue(mockAssets);
            const result = await service.searchAssetsByCode('EQ-00', filters);
            expect(mockAssetRepository.searchAssetsByCode).toHaveBeenCalledWith('EQ-00', filters);
            expect(result).toEqual(mockAssets);
        });
        it('should return empty array for empty partial code', async () => {
            const result = await service.searchAssetsByCode('');
            expect(mockAssetRepository.searchAssetsByCode).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });
        it('should return empty array for whitespace-only partial code', async () => {
            const result = await service.searchAssetsByCode('   ');
            expect(mockAssetRepository.searchAssetsByCode).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });
        it('should handle repository errors', async () => {
            const error = new Error('Database connection failed');
            mockAssetRepository.searchAssetsByCode.mockRejectedValue(error);
            await expect(service.searchAssetsByCode('EQ')).rejects.toThrow(error);
        });
    });
    describe('validateAssetCode', () => {
        const mockAsset = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            assetCode: 'EQ-001',
            name: 'Equipment 001',
            description: null,
            location: 'Building A',
            model: null,
            manufacturer: null,
            serialNumber: null,
            installDate: null,
            isActive: true,
            ownerId: null,
            administratorId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        it('should validate existing asset code successfully', async () => {
            mockAssetRepository.validateAssetCode.mockResolvedValue({
                exists: true,
                asset: mockAsset,
            });
            const result = await service.validateAssetCode('EQ-001');
            expect(mockAssetRepository.validateAssetCode).toHaveBeenCalledWith('EQ-001');
            expect(result).toEqual({
                exists: true,
                asset: mockAsset,
            });
        });
        it('should validate non-existing asset code', async () => {
            mockAssetRepository.validateAssetCode.mockResolvedValue({
                exists: false,
            });
            const result = await service.validateAssetCode('NONEXISTENT');
            expect(mockAssetRepository.validateAssetCode).toHaveBeenCalledWith('NONEXISTENT');
            expect(result).toEqual({
                exists: false,
            });
        });
        it('should throw error for empty asset code', async () => {
            await expect(service.validateAssetCode('')).rejects.toThrow('Asset code is required');
            expect(mockAssetRepository.validateAssetCode).not.toHaveBeenCalled();
        });
        it('should throw error for whitespace-only asset code', async () => {
            await expect(service.validateAssetCode('   ')).rejects.toThrow('Asset code is required');
            expect(mockAssetRepository.validateAssetCode).not.toHaveBeenCalled();
        });
        it('should handle repository errors', async () => {
            const error = new Error('Database connection failed');
            mockAssetRepository.validateAssetCode.mockRejectedValue(error);
            await expect(service.validateAssetCode('EQ-001')).rejects.toThrow(error);
        });
    });
    describe('getAssetSuggestions', () => {
        const mockSuggestions = [
            {
                id: '123e4567-e89b-12d3-a456-426614174000',
                assetCode: 'EQ-001',
                name: 'Equipment 001',
                description: null,
                location: 'Building A',
                model: null,
                manufacturer: null,
                serialNumber: null,
                installDate: null,
                isActive: true,
                ownerId: null,
                administratorId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        it('should get asset suggestions successfully', async () => {
            mockAssetRepository.getAssetSuggestions.mockResolvedValue(mockSuggestions);
            const result = await service.getAssetSuggestions('EQ');
            expect(mockAssetRepository.getAssetSuggestions).toHaveBeenCalledWith('EQ', {});
            expect(result).toEqual(mockSuggestions);
        });
        it('should get asset suggestions with filters', async () => {
            const filters = { location: 'Building A', isActive: true, limit: 10 };
            mockAssetRepository.getAssetSuggestions.mockResolvedValue(mockSuggestions);
            const result = await service.getAssetSuggestions('Equipment', filters);
            expect(mockAssetRepository.getAssetSuggestions).toHaveBeenCalledWith('Equipment', filters);
            expect(result).toEqual(mockSuggestions);
        });
        it('should return empty array for empty input', async () => {
            const result = await service.getAssetSuggestions('');
            expect(mockAssetRepository.getAssetSuggestions).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });
        it('should return empty array for whitespace-only input', async () => {
            const result = await service.getAssetSuggestions('   ');
            expect(mockAssetRepository.getAssetSuggestions).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });
        it('should handle repository errors', async () => {
            const error = new Error('Database connection failed');
            mockAssetRepository.getAssetSuggestions.mockRejectedValue(error);
            await expect(service.getAssetSuggestions('EQ')).rejects.toThrow(error);
        });
        it('should trim input before processing', async () => {
            mockAssetRepository.getAssetSuggestions.mockResolvedValue(mockSuggestions);
            const result = await service.getAssetSuggestions('  EQ-001  ');
            expect(mockAssetRepository.getAssetSuggestions).toHaveBeenCalledWith('EQ-001', {});
            expect(result).toEqual(mockSuggestions);
        });
    });
    describe('Integration with existing search functionality', () => {
        it('should maintain existing searchAssets functionality', async () => {
            const mockAssets = [
                {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    assetCode: 'EQ-001',
                    name: 'Equipment 001',
                    description: null,
                    location: 'Building A',
                    model: null,
                    manufacturer: null,
                    serialNumber: null,
                    installDate: null,
                    isActive: true,
                    ownerId: null,
                    administratorId: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            mockAssetRepository.searchAssets.mockResolvedValue(mockAssets);
            const result = await service.searchAssets('Equipment');
            expect(mockAssetRepository.searchAssets).toHaveBeenCalledWith('Equipment', {});
            expect(result).toEqual(mockAssets);
        });
    });
});

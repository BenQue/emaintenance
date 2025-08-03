import { AssetService } from './AssetService';
import { AssetRepository } from '../repositories/AssetRepository';

// Mock dependencies
jest.mock('../repositories/AssetRepository');

describe('AssetService', () => {
  let assetService: AssetService;
  let mockAssetRepository: jest.Mocked<AssetRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the AssetRepository
    mockAssetRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByAssetCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      assetCodeExists: jest.fn(),
      bulkCreate: jest.fn(),
    };
    
    (AssetRepository as jest.MockedClass<typeof AssetRepository>).mockImplementation(() => mockAssetRepository);
    
    assetService = new AssetService();
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

      mockAssetRepository.assetCodeExists.mockResolvedValue(false);
      mockAssetRepository.create.mockResolvedValue(mockAsset);

      const result = await assetService.createAsset(assetData);

      expect(mockAssetRepository.assetCodeExists).toHaveBeenCalledWith('AC001');
      expect(mockAssetRepository.create).toHaveBeenCalledWith({
        ...assetData,
        installDate: undefined,
      });
      expect(result).toEqual(mockAsset);
    });

    it('should throw error if asset code already exists', async () => {
      const assetData = {
        assetCode: 'AC001',
        name: 'Test Asset',
        location: 'Test Location',
      };

      mockAssetRepository.assetCodeExists.mockResolvedValue(true);

      await expect(assetService.createAsset(assetData)).rejects.toThrow('Asset code already exists');
      expect(mockAssetRepository.create).not.toHaveBeenCalled();
    });

    it('should handle install date conversion', async () => {
      const assetData = {
        assetCode: 'AC001',
        name: 'Test Asset',
        location: 'Test Location',
        installDate: '2023-01-01T00:00:00.000Z',
      };

      mockAssetRepository.assetCodeExists.mockResolvedValue(false);
      mockAssetRepository.create.mockResolvedValue(mockAsset);

      await assetService.createAsset(assetData);

      expect(mockAssetRepository.create).toHaveBeenCalledWith({
        ...assetData,
        installDate: new Date('2023-01-01T00:00:00.000Z'),
      });
    });
  });

  describe('getAssetById', () => {
    it('should return asset when found', async () => {
      mockAssetRepository.findById.mockResolvedValue(mockAsset);

      const result = await assetService.getAssetById('asset123');

      expect(mockAssetRepository.findById).toHaveBeenCalledWith('asset123');
      expect(result).toEqual(mockAsset);
    });

    it('should return null when asset not found', async () => {
      mockAssetRepository.findById.mockResolvedValue(null);

      const result = await assetService.getAssetById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAssetByCode', () => {
    it('should return asset when found', async () => {
      mockAssetRepository.findByAssetCode.mockResolvedValue(mockAsset);

      const result = await assetService.getAssetByCode('AC001');

      expect(mockAssetRepository.findByAssetCode).toHaveBeenCalledWith('AC001');
      expect(result).toEqual(mockAsset);
    });
  });

  describe('listAssets', () => {
    it('should list assets with default pagination', async () => {
      const mockResult = {
        assets: [mockAsset],
        total: 1,
        totalPages: 1,
      };

      mockAssetRepository.findMany.mockResolvedValue(mockResult);

      const result = await assetService.listAssets();

      expect(mockAssetRepository.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
      expect(result).toEqual({
        ...mockResult,
        currentPage: 1,
      });
    });

    it('should validate page parameter', async () => {
      await expect(assetService.listAssets({ page: 0 })).rejects.toThrow('Page must be greater than 0');
    });

    it('should validate limit parameter', async () => {
      await expect(assetService.listAssets({ limit: 0 })).rejects.toThrow('Limit must be between 1 and 100');
      await expect(assetService.listAssets({ limit: 101 })).rejects.toThrow('Limit must be between 1 and 100');
    });

    it('should pass filter options to repository', async () => {
      const options = {
        page: 2,
        limit: 10,
        location: 'Test Location',
        isActive: true,
      };

      const mockResult = {
        assets: [mockAsset],
        total: 1,
        totalPages: 1,
      };

      mockAssetRepository.findMany.mockResolvedValue(mockResult);

      await assetService.listAssets(options);

      expect(mockAssetRepository.findMany).toHaveBeenCalledWith(options);
    });
  });

  describe('updateAsset', () => {
    it('should update asset successfully', async () => {
      const updateData = { name: 'Updated Asset' };
      const updatedAsset = { ...mockAsset, name: 'Updated Asset' };

      mockAssetRepository.findById.mockResolvedValue(mockAsset);
      mockAssetRepository.update.mockResolvedValue(updatedAsset);

      const result = await assetService.updateAsset('asset123', updateData);

      expect(mockAssetRepository.findById).toHaveBeenCalledWith('asset123');
      expect(mockAssetRepository.update).toHaveBeenCalledWith('asset123', {
        ...updateData,
        installDate: undefined,
      });
      expect(result).toEqual(updatedAsset);
    });

    it('should throw error if asset not found', async () => {
      mockAssetRepository.findById.mockResolvedValue(null);

      await expect(assetService.updateAsset('nonexistent', { name: 'Updated' }))
        .rejects.toThrow('Asset not found');
    });

    it('should check for duplicate asset code', async () => {
      const updateData = { assetCode: 'AC002' };

      mockAssetRepository.findById.mockResolvedValue(mockAsset);
      mockAssetRepository.assetCodeExists.mockResolvedValue(true);

      await expect(assetService.updateAsset('asset123', updateData))
        .rejects.toThrow('Asset code already exists');
    });

    it('should handle update failure', async () => {
      mockAssetRepository.findById.mockResolvedValue(mockAsset);
      mockAssetRepository.update.mockResolvedValue(null);

      await expect(assetService.updateAsset('asset123', { name: 'Updated' }))
        .rejects.toThrow('Failed to update asset');
    });
  });

  describe('deleteAsset', () => {
    it('should delete asset successfully', async () => {
      const deletedAsset = { ...mockAsset, isActive: false };

      mockAssetRepository.findById.mockResolvedValue(mockAsset);
      mockAssetRepository.delete.mockResolvedValue(deletedAsset);

      const result = await assetService.deleteAsset('asset123');

      expect(mockAssetRepository.findById).toHaveBeenCalledWith('asset123');
      expect(mockAssetRepository.delete).toHaveBeenCalledWith('asset123');
      expect(result).toEqual(deletedAsset);
    });

    it('should throw error if asset not found', async () => {
      mockAssetRepository.findById.mockResolvedValue(null);

      await expect(assetService.deleteAsset('nonexistent'))
        .rejects.toThrow('Asset not found');
    });

    it('should throw error if asset already deleted', async () => {
      const deletedAsset = { ...mockAsset, isActive: false };
      mockAssetRepository.findById.mockResolvedValue(deletedAsset);

      await expect(assetService.deleteAsset('asset123'))
        .rejects.toThrow('Asset is already deleted');
    });

    it('should handle delete failure', async () => {
      mockAssetRepository.findById.mockResolvedValue(mockAsset);
      mockAssetRepository.delete.mockResolvedValue(null);

      await expect(assetService.deleteAsset('asset123'))
        .rejects.toThrow('Failed to delete asset');
    });
  });

  describe('bulkCreateAssets', () => {
    const bulkData = {
      assets: [
        { assetCode: 'AC001', name: 'Asset 1', location: 'Location 1' },
        { assetCode: 'AC002', name: 'Asset 2', location: 'Location 2' },
      ],
    };

    it('should create all assets successfully', async () => {
      const createdAssets = [
        mockAsset,
        { ...mockAsset, id: 'asset124', assetCode: 'AC002' },
      ];

      mockAssetRepository.assetCodeExists.mockResolvedValue(false);
      mockAssetRepository.bulkCreate.mockResolvedValue(createdAssets);

      const result = await assetService.bulkCreateAssets(bulkData);

      expect(result.created).toEqual(createdAssets);
      expect(result.errors).toEqual([]);
    });

    it('should detect duplicate asset codes in batch', async () => {
      const duplicateData = {
        assets: [
          { assetCode: 'AC001', name: 'Asset 1', location: 'Location 1' },
          { assetCode: 'AC001', name: 'Asset 2', location: 'Location 2' },
        ],
      };

      await expect(assetService.bulkCreateAssets(duplicateData))
        .rejects.toThrow('Duplicate asset codes in batch: AC001');
    });

    it('should detect existing asset codes in database', async () => {
      mockAssetRepository.assetCodeExists
        .mockResolvedValueOnce(false) // AC001 doesn't exist
        .mockResolvedValueOnce(true);  // AC002 exists

      const result = await assetService.bulkCreateAssets(bulkData);

      expect(result.created).toEqual([]);
      expect(result.errors).toEqual([
        { index: 1, assetCode: 'AC002', error: 'Asset code already exists' },
      ]);
    });

    it('should handle repository errors', async () => {
      mockAssetRepository.assetCodeExists.mockResolvedValue(false);
      mockAssetRepository.bulkCreate.mockRejectedValue(new Error('Database error'));

      await expect(assetService.bulkCreateAssets(bulkData))
        .rejects.toThrow('Failed to create assets: Database error');
    });
  });

  describe('getAssetStats', () => {
    it('should return asset statistics', async () => {
      const totalResult = { assets: [], total: 10, totalPages: 1 };
      const activeResult = { assets: [], total: 8, totalPages: 1 };
      const inactiveResult = { assets: [], total: 2, totalPages: 1 };
      const allAssetsResult = {
        assets: [
          { ...mockAsset, location: 'Location A' },
          { ...mockAsset, location: 'Location A' },
          { ...mockAsset, location: 'Location B' },
        ],
        total: 3,
        totalPages: 1,
      };

      mockAssetRepository.findMany
        .mockResolvedValueOnce(totalResult)
        .mockResolvedValueOnce(activeResult)
        .mockResolvedValueOnce(inactiveResult)
        .mockResolvedValueOnce(allAssetsResult);

      const result = await assetService.getAssetStats();

      expect(result).toEqual({
        total: 10,
        active: 8,
        inactive: 2,
        byLocation: {
          'Location A': 2,
          'Location B': 1,
        },
      });
    });
  });
});
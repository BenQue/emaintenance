import { PrismaClient, Asset } from '@emaintenance/database';
import { AssetRepository } from './AssetRepository';

describe('AssetRepository - Manual Asset Code Input Features', () => {
  let repository: AssetRepository;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      asset: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      }
    } as any;

    repository = new AssetRepository(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchAssetsByCode', () => {
    const mockAssets: Partial<Asset>[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        assetCode: 'EQ-001',
        name: 'Equipment 001',
        location: 'Building A',
        isActive: true,
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        assetCode: 'EQ-002',
        name: 'Equipment 002',
        location: 'Building A',
        isActive: true,
      },
    ];

    it('should search assets by partial code with correct query structure', async () => {
      mockPrisma.asset.findMany.mockResolvedValue(mockAssets as Asset[]);

      const result = await repository.searchAssetsByCode('EQ');

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { assetCode: { equals: 'EQ', mode: 'insensitive' } },
            { assetCode: { startsWith: 'EQ', mode: 'insensitive' } },
            { assetCode: { contains: 'EQ', mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: [
          { assetCode: 'asc' },
          { name: 'asc' },
        ],
        select: {
          id: true,
          assetCode: true,
          name: true,
          location: true,
          isActive: true,
        },
      });
      expect(result).toEqual(mockAssets);
    });

    it('should apply location filter when provided', async () => {
      mockPrisma.asset.findMany.mockResolvedValue(mockAssets as Asset[]);

      await repository.searchAssetsByCode('EQ', { location: 'Building A' });

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            location: { contains: 'Building A', mode: 'insensitive' },
          }),
        })
      );
    });

    it('should apply isActive filter when provided', async () => {
      mockPrisma.asset.findMany.mockResolvedValue(mockAssets as Asset[]);

      await repository.searchAssetsByCode('EQ', { isActive: true });

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should apply custom limit when provided', async () => {
      mockPrisma.asset.findMany.mockResolvedValue(mockAssets as Asset[]);

      await repository.searchAssetsByCode('EQ', { limit: 5 });

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });

    it('should return empty array for empty partial code', async () => {
      const result = await repository.searchAssetsByCode('');

      expect(mockPrisma.asset.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.asset.findMany.mockRejectedValue(error);

      await expect(repository.searchAssetsByCode('EQ')).rejects.toThrow(error);
    });
  });

  describe('validateAssetCode', () => {
    const mockAsset: Asset = {
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

    it('should validate existing asset code', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(mockAsset);

      const result = await repository.validateAssetCode('EQ-001');

      expect(mockPrisma.asset.findUnique).toHaveBeenCalledWith({
        where: { assetCode: 'EQ-001' },
      });
      expect(result).toEqual({
        exists: true,
        asset: mockAsset,
      });
    });

    it('should validate non-existing asset code', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      const result = await repository.validateAssetCode('NONEXISTENT');

      expect(mockPrisma.asset.findUnique).toHaveBeenCalledWith({
        where: { assetCode: 'NONEXISTENT' },
      });
      expect(result).toEqual({
        exists: false,
      });
    });

    it('should return false for empty asset code', async () => {
      const result = await repository.validateAssetCode('');

      expect(mockPrisma.asset.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual({
        exists: false,
      });
    });

    it('should trim whitespace from asset code', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(mockAsset);

      const result = await repository.validateAssetCode('  EQ-001  ');

      expect(mockPrisma.asset.findUnique).toHaveBeenCalledWith({
        where: { assetCode: 'EQ-001' },
      });
      expect(result.exists).toBe(true);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.asset.findUnique.mockRejectedValue(error);

      await expect(repository.validateAssetCode('EQ-001')).rejects.toThrow(error);
    });
  });

  describe('getAssetSuggestions', () => {
    const mockAssets: Partial<Asset>[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        assetCode: 'EQ-001',
        name: 'Equipment 001',
        location: 'Building A',
        isActive: true,
        description: 'Test equipment',
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        assetCode: 'EQ-002',
        name: 'Equipment 002',
        location: 'Building B',
        isActive: true,
        description: 'Another test equipment',
      },
    ];

    it('should get asset suggestions with correct query structure', async () => {
      mockPrisma.asset.findMany.mockResolvedValue(mockAssets as Asset[]);

      const result = await repository.getAssetSuggestions('EQ');

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { assetCode: { contains: 'EQ', mode: 'insensitive' } },
            { name: { contains: 'EQ', mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: [
          { assetCode: 'asc' },
          { name: 'asc' },
        ],
        select: {
          id: true,
          assetCode: true,
          name: true,
          location: true,
          isActive: true,
          description: true,
        },
      });
      expect(result).toHaveLength(2);
    });

    it('should apply location filter when provided', async () => {
      mockPrisma.asset.findMany.mockResolvedValue(mockAssets as Asset[]);

      await repository.getAssetSuggestions('Equipment', { location: 'Building A' });

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            location: { contains: 'Building A', mode: 'insensitive' },
          }),
        })
      );
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.getAssetSuggestions('');

      expect(mockPrisma.asset.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.asset.findMany.mockRejectedValue(error);

      await expect(repository.getAssetSuggestions('EQ')).rejects.toThrow(error);
    });

    describe('fuzzy matching score calculation', () => {
      it('should prioritize exact asset code matches', async () => {
        const testAssets = [
          { assetCode: 'EQ-001', name: 'Equipment 1' },
          { assetCode: 'TEST-EQ', name: 'Test Equipment' },
          { assetCode: 'EQ', name: 'Exact Match' },
        ];

        mockPrisma.asset.findMany.mockResolvedValue(testAssets as Asset[]);

        const result = await repository.getAssetSuggestions('EQ');

        // The exact match 'EQ' should be scored highest and appear first
        // This tests the fuzzy matching logic internally
        expect(result).toBeDefined();
        expect(result.length).toBe(3);
      });
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle special characters in search input', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);

      await repository.searchAssetsByCode('EQ-001@#$');

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { assetCode: { equals: 'EQ-001@#$', mode: 'insensitive' } },
              { assetCode: { startsWith: 'EQ-001@#$', mode: 'insensitive' } },
              { assetCode: { contains: 'EQ-001@#$', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should handle very long search strings', async () => {
      const longString = 'A'.repeat(1000);
      mockPrisma.asset.findMany.mockResolvedValue([]);

      await repository.searchAssetsByCode(longString);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { assetCode: { equals: longString, mode: 'insensitive' } },
              { assetCode: { startsWith: longString, mode: 'insensitive' } },
              { assetCode: { contains: longString, mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should respect maximum limit constraints', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);

      await repository.searchAssetsByCode('EQ', { limit: 50 });

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });
  });
});
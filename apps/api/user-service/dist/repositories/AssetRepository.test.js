"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AssetRepository_1 = require("./AssetRepository");
// Mock the database
jest.mock('@emaintenance/database', () => ({
    prisma: {
        asset: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));
const database_1 = require("@emaintenance/database");
describe('AssetRepository', () => {
    let assetRepository;
    const mockPrismaAsset = database_1.prisma.asset;
    const mockPrismaTransaction = database_1.prisma.$transaction;
    beforeEach(() => {
        assetRepository = new AssetRepository_1.AssetRepository();
        jest.clearAllMocks();
    });
    const mockAsset = {
        id: 'asset123',
        assetCode: 'AC001',
        name: 'Test Asset',
        description: 'Test Description',
        model: 'Model X',
        manufacturer: 'ACME Corp',
        serialNumber: 'SN001',
        location: 'Test Location',
        installDate: new Date('2023-01-01'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: null,
        administratorId: null,
        owner: null,
        administrator: null,
        workOrders: [],
    };
    const mockCreateData = {
        assetCode: 'AC001',
        name: 'Test Asset',
        description: 'Test Description',
        location: 'Test Location',
        installDate: new Date('2023-01-01'),
    };
    describe('create', () => {
        it('should create a new asset', async () => {
            mockPrismaAsset.create.mockResolvedValue(mockAsset);
            const result = await assetRepository.create(mockCreateData);
            expect(mockPrismaAsset.create).toHaveBeenCalledWith({
                data: {
                    assetCode: 'AC001',
                    name: 'Test Asset',
                    description: 'Test Description',
                    model: undefined,
                    manufacturer: undefined,
                    serialNumber: undefined,
                    location: 'Test Location',
                    installDate: new Date('2023-01-01'),
                    ownerId: undefined,
                    administratorId: undefined,
                },
                include: {
                    owner: true,
                    administrator: true,
                },
            });
            expect(result).toEqual(mockAsset);
        });
    });
    describe('findById', () => {
        it('should find asset by ID', async () => {
            mockPrismaAsset.findUnique.mockResolvedValue(mockAsset);
            const result = await assetRepository.findById('asset123');
            expect(mockPrismaAsset.findUnique).toHaveBeenCalledWith({
                where: { id: 'asset123' },
                include: {
                    owner: true,
                    administrator: true,
                },
            });
            expect(result).toEqual(mockAsset);
        });
        it('should return null if asset not found', async () => {
            mockPrismaAsset.findUnique.mockResolvedValue(null);
            const result = await assetRepository.findById('nonexistent');
            expect(result).toBeNull();
        });
    });
    describe('findByAssetCode', () => {
        it('should find asset by asset code', async () => {
            mockPrismaAsset.findUnique.mockResolvedValue(mockAsset);
            const result = await assetRepository.findByAssetCode('AC001');
            expect(mockPrismaAsset.findUnique).toHaveBeenCalledWith({
                where: { assetCode: 'AC001' },
                include: {
                    owner: true,
                    administrator: true,
                },
            });
            expect(result).toEqual(mockAsset);
        });
    });
    describe('findMany', () => {
        it('should find assets with default pagination', async () => {
            const mockAssets = [mockAsset];
            const mockCount = 1;
            mockPrismaAsset.findMany.mockResolvedValue(mockAssets);
            mockPrismaAsset.count.mockResolvedValue(mockCount);
            const result = await assetRepository.findMany();
            expect(mockPrismaAsset.findMany).toHaveBeenCalledWith({
                where: {},
                include: {
                    owner: true,
                    administrator: true,
                },
                orderBy: [{ createdAt: 'desc' }],
                skip: 0,
                take: 20,
            });
            expect(mockPrismaAsset.count).toHaveBeenCalledWith({ where: {} });
            expect(result).toEqual({
                assets: mockAssets,
                total: mockCount,
                totalPages: 1,
            });
        });
        it('should apply filters correctly', async () => {
            const options = {
                page: 2,
                limit: 10,
                location: 'Test',
                isActive: true,
                ownerId: 'owner123',
                administratorId: 'admin123',
            };
            mockPrismaAsset.findMany.mockResolvedValue([mockAsset]);
            mockPrismaAsset.count.mockResolvedValue(1);
            await assetRepository.findMany(options);
            expect(mockPrismaAsset.findMany).toHaveBeenCalledWith({
                where: {
                    location: {
                        contains: 'Test',
                        mode: 'insensitive',
                    },
                    isActive: true,
                    ownerId: 'owner123',
                    administratorId: 'admin123',
                },
                include: {
                    owner: true,
                    administrator: true,
                },
                orderBy: [{ createdAt: 'desc' }],
                skip: 10,
                take: 10,
            });
        });
        it('should calculate pagination correctly', async () => {
            mockPrismaAsset.findMany.mockResolvedValue([mockAsset]);
            mockPrismaAsset.count.mockResolvedValue(25);
            const result = await assetRepository.findMany({ page: 2, limit: 10 });
            expect(result.totalPages).toBe(3);
            expect(result.total).toBe(25);
        });
    });
    describe('update', () => {
        it('should update asset', async () => {
            const updateData = { name: 'Updated Asset' };
            const updatedAsset = { ...mockAsset, name: 'Updated Asset' };
            mockPrismaAsset.update.mockResolvedValue(updatedAsset);
            const result = await assetRepository.update('asset123', updateData);
            expect(mockPrismaAsset.update).toHaveBeenCalledWith({
                where: { id: 'asset123' },
                data: updateData,
                include: {
                    owner: true,
                    administrator: true,
                },
            });
            expect(result).toEqual(updatedAsset);
        });
    });
    describe('delete', () => {
        it('should soft delete asset', async () => {
            const deletedAsset = { ...mockAsset, isActive: false };
            mockPrismaAsset.update.mockResolvedValue(deletedAsset);
            const result = await assetRepository.delete('asset123');
            expect(mockPrismaAsset.update).toHaveBeenCalledWith({
                where: { id: 'asset123' },
                data: { isActive: false },
                include: {
                    owner: true,
                    administrator: true,
                },
            });
            expect(result).toEqual(deletedAsset);
        });
    });
    describe('assetCodeExists', () => {
        it('should return true if asset code exists', async () => {
            mockPrismaAsset.findFirst.mockResolvedValue({ id: 'asset123' });
            const result = await assetRepository.assetCodeExists('AC001');
            expect(mockPrismaAsset.findFirst).toHaveBeenCalledWith({
                where: { assetCode: 'AC001' },
                select: { id: true },
            });
            expect(result).toBe(true);
        });
        it('should return false if asset code does not exist', async () => {
            mockPrismaAsset.findFirst.mockResolvedValue(null);
            const result = await assetRepository.assetCodeExists('AC999');
            expect(result).toBe(false);
        });
        it('should exclude specific ID when checking', async () => {
            mockPrismaAsset.findFirst.mockResolvedValue(null);
            await assetRepository.assetCodeExists('AC001', 'asset123');
            expect(mockPrismaAsset.findFirst).toHaveBeenCalledWith({
                where: {
                    assetCode: 'AC001',
                    id: { not: 'asset123' },
                },
                select: { id: true },
            });
        });
    });
    describe('bulkCreate', () => {
        it('should bulk create assets in transaction', async () => {
            const assetsData = [
                mockCreateData,
                { ...mockCreateData, assetCode: 'AC002' },
            ];
            const createdAssets = [
                mockAsset,
                { ...mockAsset, id: 'asset124', assetCode: 'AC002' },
            ];
            // Mock transaction function
            mockPrismaTransaction.mockImplementation(async (callback) => {
                const mockTx = {
                    asset: {
                        create: jest.fn()
                            .mockResolvedValueOnce(createdAssets[0])
                            .mockResolvedValueOnce(createdAssets[1]),
                    },
                };
                return callback(mockTx);
            });
            const result = await assetRepository.bulkCreate(assetsData);
            expect(mockPrismaTransaction).toHaveBeenCalled();
            expect(result).toEqual(createdAssets);
        });
        it('should rollback transaction on error', async () => {
            const assetsData = [mockCreateData];
            mockPrismaTransaction.mockImplementation(async (callback) => {
                const mockTx = {
                    asset: {
                        create: jest.fn().mockRejectedValue(new Error('Database error')),
                    },
                };
                return callback(mockTx);
            });
            await expect(assetRepository.bulkCreate(assetsData)).rejects.toThrow('Database error');
        });
    });
});

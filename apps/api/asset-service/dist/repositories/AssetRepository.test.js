"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@emaintenance/database");
const AssetRepository_1 = require("./AssetRepository");
describe('AssetRepository', () => {
    let prisma;
    let repository;
    let mockAsset;
    beforeEach(() => {
        prisma = new database_1.PrismaClient();
        repository = new AssetRepository_1.AssetRepository(prisma);
        mockAsset = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            assetCode: 'TEST-001',
            name: 'Test Asset',
            description: 'Test Description',
            location: 'Test Location',
            model: null,
            manufacturer: null,
            serialNumber: 'SN-123',
            installDate: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            ownerId: null,
            administratorId: null,
        };
    });
    describe('createAsset', () => {
        it('should create a new asset successfully', async () => {
            const createData = {
                assetCode: 'TEST-001',
                name: 'Test Asset',
                description: 'Test Description',
                location: 'Test Location',
                model: 'Test Model',
                manufacturer: 'Test Manufacturer',
                serialNumber: 'SN-123',
                isActive: true,
            };
            prisma.asset.create.mockResolvedValue(mockAsset);
            const result = await repository.createAsset(createData);
            expect(prisma.asset.create).toHaveBeenCalledWith({
                data: {
                    ...createData,
                    isActive: true,
                },
            });
            expect(result).toEqual(mockAsset);
        });
        it('should use ACTIVE as default status when not provided', async () => {
            const createData = {
                assetCode: 'TEST-001',
                name: 'Test Asset',
                location: 'Test Location',
                category: 'Test Category',
            };
            prisma.asset.create.mockResolvedValue(mockAsset);
            await repository.createAsset(createData);
            expect(prisma.asset.create).toHaveBeenCalledWith({
                data: {
                    ...createData,
                    isActive: true,
                },
            });
        });
        it('should handle database errors', async () => {
            const createData = {
                assetCode: 'TEST-001',
                name: 'Test Asset',
                location: 'Test Location',
                category: 'Test Category',
            };
            const dbError = new Error('Database constraint violation');
            prisma.asset.create.mockRejectedValue(dbError);
            await expect(repository.createAsset(createData)).rejects.toThrow(dbError);
        });
    });
    describe('getAssetById', () => {
        it('should return asset when found', async () => {
            prisma.asset.findUnique.mockResolvedValue(mockAsset);
            const result = await repository.getAssetById(mockAsset.id);
            expect(prisma.asset.findUnique).toHaveBeenCalledWith({
                where: { id: mockAsset.id },
            });
            expect(result).toEqual(mockAsset);
        });
        it('should return null when asset not found', async () => {
            prisma.asset.findUnique.mockResolvedValue(null);
            const result = await repository.getAssetById('non-existent-id');
            expect(result).toBeNull();
        });
        it('should handle database errors', async () => {
            const dbError = new Error('Database connection error');
            prisma.asset.findUnique.mockRejectedValue(dbError);
            await expect(repository.getAssetById(mockAsset.id)).rejects.toThrow(dbError);
        });
    });
    describe('getAssetByCode', () => {
        it('should return asset when found by code', async () => {
            prisma.asset.findUnique.mockResolvedValue(mockAsset);
            const result = await repository.getAssetByCode(mockAsset.assetCode);
            expect(prisma.asset.findUnique).toHaveBeenCalledWith({
                where: { assetCode: mockAsset.assetCode },
            });
            expect(result).toEqual(mockAsset);
        });
        it('should return null when asset not found by code', async () => {
            prisma.asset.findUnique.mockResolvedValue(null);
            const result = await repository.getAssetByCode('NON-EXISTENT');
            expect(result).toBeNull();
        });
    });
    describe('updateAsset', () => {
        it('should update asset successfully', async () => {
            const updateData = {
                name: 'Updated Asset Name',
                isActive: false,
            };
            const updatedAsset = { ...mockAsset, ...updateData };
            prisma.asset.update.mockResolvedValue(updatedAsset);
            const result = await repository.updateAsset(mockAsset.id, updateData);
            expect(prisma.asset.update).toHaveBeenCalledWith({
                where: { id: mockAsset.id },
                data: {
                    ...updateData,
                    updatedAt: expect.any(Date),
                },
            });
            expect(result).toEqual(updatedAsset);
        });
        it('should handle update errors', async () => {
            const updateData = { name: 'Updated Name' };
            const dbError = new Error('Record not found');
            prisma.asset.update.mockRejectedValue(dbError);
            await expect(repository.updateAsset(mockAsset.id, updateData)).rejects.toThrow(dbError);
        });
    });
    describe('deleteAsset', () => {
        it('should delete asset successfully', async () => {
            prisma.asset.delete.mockResolvedValue(mockAsset);
            await repository.deleteAsset(mockAsset.id);
            expect(prisma.asset.delete).toHaveBeenCalledWith({
                where: { id: mockAsset.id },
            });
        });
        it('should handle delete errors', async () => {
            const dbError = new Error('Record not found');
            prisma.asset.delete.mockRejectedValue(dbError);
            await expect(repository.deleteAsset(mockAsset.id)).rejects.toThrow(dbError);
        });
    });
    describe('listAssets', () => {
        it('should list assets with pagination', async () => {
            const assets = [mockAsset];
            const totalCount = 1;
            prisma.asset.count.mockResolvedValue(totalCount);
            prisma.asset.findMany.mockResolvedValue(assets);
            const result = await repository.listAssets({
                page: 1,
                limit: 10,
            });
            expect(prisma.asset.count).toHaveBeenCalled();
            expect(prisma.asset.findMany).toHaveBeenCalledWith({
                where: {},
                skip: 0,
                take: 10,
                orderBy: { name: 'asc' },
            });
            expect(result).toEqual({
                assets,
                total: totalCount,
                page: 1,
                limit: 10,
                totalPages: 1,
            });
        });
        it('should apply search filters', async () => {
            const assets = [mockAsset];
            const totalCount = 1;
            prisma.asset.count.mockResolvedValue(totalCount);
            prisma.asset.findMany.mockResolvedValue(assets);
            await repository.listAssets({
                search: 'test',
                location: 'Test Location',
                isActive: true,
            });
            expect(prisma.asset.count).toHaveBeenCalledWith({
                where: {
                    OR: [
                        { name: { contains: 'test', mode: 'insensitive' } },
                        { assetCode: { contains: 'test', mode: 'insensitive' } },
                        { description: { contains: 'test', mode: 'insensitive' } },
                    ],
                    location: {
                        contains: 'Test Location',
                        mode: 'insensitive',
                    },
                    isActive: true,
                },
            });
        });
    });
    describe('searchAssets', () => {
        it('should search assets by query', async () => {
            const assets = [mockAsset];
            prisma.asset.findMany.mockResolvedValue(assets);
            const result = await repository.searchAssets('test query');
            expect(prisma.asset.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [
                        { name: { contains: 'test query', mode: 'insensitive' } },
                        { assetCode: { contains: 'test query', mode: 'insensitive' } },
                        { description: { contains: 'test query', mode: 'insensitive' } },
                        { serialNumber: { contains: 'test query', mode: 'insensitive' } },
                    ],
                },
                take: 20,
                orderBy: { name: 'asc' },
            });
            expect(result).toEqual(assets);
        });
        it('should apply search filters', async () => {
            const assets = [mockAsset];
            prisma.asset.findMany.mockResolvedValue(assets);
            await repository.searchAssets('test', {
                location: 'Electronics',
                isActive: true,
                limit: 5,
            });
            expect(prisma.asset.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [
                        { name: { contains: 'test', mode: 'insensitive' } },
                        { assetCode: { contains: 'test', mode: 'insensitive' } },
                        { description: { contains: 'test', mode: 'insensitive' } },
                        { serialNumber: { contains: 'test', mode: 'insensitive' } },
                    ],
                    location: {
                        contains: 'Electronics',
                        mode: 'insensitive',
                    },
                    isActive: true,
                },
                take: 5,
                orderBy: { name: 'asc' },
            });
        });
    });
    describe('getAssetMaintenanceHistory', () => {
        it('should return maintenance history for asset', async () => {
            const mockHistory = [
                {
                    id: 'history-1',
                    assetId: mockAsset.id,
                    completedAt: new Date(),
                    technician: {
                        id: 'tech-1',
                        firstName: 'John',
                        lastName: 'Doe',
                    },
                },
            ];
            prisma.maintenanceHistory.findMany.mockResolvedValue(mockHistory);
            const result = await repository.getAssetMaintenanceHistory(mockAsset.id);
            expect(prisma.maintenanceHistory.findMany).toHaveBeenCalledWith({
                where: { assetId: mockAsset.id },
                orderBy: { completedAt: 'desc' },
                include: {
                    workOrder: {
                        include: {
                            assignedTo: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    },
                },
            });
            expect(result).toEqual(mockHistory);
        });
    });
});

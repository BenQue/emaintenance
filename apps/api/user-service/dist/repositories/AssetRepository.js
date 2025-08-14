"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetRepository = void 0;
const database_1 = require("@emaintenance/database");
class AssetRepository {
    /**
     * Create a new asset
     */
    async create(assetData) {
        return database_1.prisma.asset.create({
            data: {
                assetCode: assetData.assetCode,
                name: assetData.name,
                description: assetData.description,
                model: assetData.model,
                manufacturer: assetData.manufacturer,
                serialNumber: assetData.serialNumber,
                location: assetData.location,
                installDate: assetData.installDate,
                ownerId: assetData.ownerId,
                administratorId: assetData.administratorId,
            },
            include: {
                owner: true,
                administrator: true,
            },
        });
    }
    /**
     * Find asset by ID
     */
    async findById(id) {
        return database_1.prisma.asset.findUnique({
            where: { id },
            include: {
                owner: true,
                administrator: true,
            },
        });
    }
    /**
     * Find asset by asset code
     */
    async findByAssetCode(assetCode) {
        return database_1.prisma.asset.findUnique({
            where: { assetCode },
            include: {
                owner: true,
                administrator: true,
            },
        });
    }
    /**
     * List assets with pagination and filtering
     */
    async findMany(options = {}) {
        const { page = 1, limit = 20, location, isActive, ownerId, administratorId, } = options;
        const skip = (page - 1) * limit;
        // Build type-safe where clause
        const where = {};
        if (location) {
            where.location = {
                contains: location,
                mode: 'insensitive',
            };
        }
        if (isActive !== undefined) {
            where.isActive = isActive;
        }
        if (ownerId) {
            where.ownerId = ownerId;
        }
        if (administratorId) {
            where.administratorId = administratorId;
        }
        const [assets, total] = await Promise.all([
            database_1.prisma.asset.findMany({
                where,
                include: {
                    owner: true,
                    administrator: true,
                },
                orderBy: [
                    { createdAt: 'desc' },
                ],
                skip,
                take: limit,
            }),
            database_1.prisma.asset.count({ where }),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            assets,
            total,
            totalPages,
        };
    }
    /**
     * Update asset
     */
    async update(id, assetData) {
        return database_1.prisma.asset.update({
            where: { id },
            data: assetData,
            include: {
                owner: true,
                administrator: true,
            },
        });
    }
    /**
     * Delete asset (soft delete by setting isActive to false)
     */
    async delete(id) {
        return database_1.prisma.asset.update({
            where: { id },
            data: { isActive: false },
            include: {
                owner: true,
                administrator: true,
            },
        });
    }
    /**
     * Check if asset code already exists
     */
    async assetCodeExists(assetCode, excludeId) {
        const where = { assetCode };
        if (excludeId) {
            where.id = { not: excludeId };
        }
        const asset = await database_1.prisma.asset.findFirst({
            where,
            select: { id: true },
        });
        return !!asset;
    }
    /**
     * Bulk create assets
     */
    async bulkCreate(assetsData) {
        const createdAssets = [];
        // Use transaction to ensure all assets are created or none
        await database_1.prisma.$transaction(async (tx) => {
            for (const assetData of assetsData) {
                const asset = await tx.asset.create({
                    data: {
                        assetCode: assetData.assetCode,
                        name: assetData.name,
                        description: assetData.description,
                        model: assetData.model,
                        manufacturer: assetData.manufacturer,
                        serialNumber: assetData.serialNumber,
                        location: assetData.location,
                        installDate: assetData.installDate,
                        ownerId: assetData.ownerId,
                        administratorId: assetData.administratorId,
                    },
                    include: {
                        owner: true,
                        administrator: true,
                    },
                });
                createdAssets.push(asset);
            }
        });
        return createdAssets;
    }
    /**
     * Check if user exists (for ownership validation)
     */
    async userExists(userId) {
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        return !!user;
    }
    /**
     * Check if asset has active work orders
     */
    async hasActiveWorkOrders(assetId) {
        const activeWorkOrders = await database_1.prisma.workOrder.count({
            where: {
                assetId: assetId,
                status: {
                    in: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTS', 'WAITING_EXTERNAL'],
                },
            },
        });
        return activeWorkOrders > 0;
    }
    /**
     * Search assets by query
     */
    async search(query, limit) {
        return database_1.prisma.asset.findMany({
            where: {
                isActive: true,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { assetCode: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { model: { contains: query, mode: 'insensitive' } },
                    { manufacturer: { contains: query, mode: 'insensitive' } },
                    { serialNumber: { contains: query, mode: 'insensitive' } },
                    { location: { contains: query, mode: 'insensitive' } },
                ],
            },
            take: limit,
            orderBy: [
                { name: 'asc' },
                { assetCode: 'asc' },
            ],
            include: {
                owner: true,
                administrator: true,
            },
        });
    }
    /**
     * Find assets by location
     */
    async findByLocation(location) {
        return database_1.prisma.asset.findMany({
            where: {
                location: { contains: location, mode: 'insensitive' },
                isActive: true,
            },
            orderBy: [
                { name: 'asc' },
                { assetCode: 'asc' },
            ],
            include: {
                owner: true,
                administrator: true,
            },
        });
    }
    /**
     * Get distinct locations
     */
    async getDistinctLocations() {
        const result = await database_1.prisma.asset.findMany({
            where: { isActive: true },
            select: { location: true },
            distinct: ['location'],
            orderBy: { location: 'asc' },
        });
        return result.map(asset => asset.location);
    }
}
exports.AssetRepository = AssetRepository;

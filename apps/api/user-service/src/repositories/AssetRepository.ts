import { prisma, Asset } from '@emaintenance/database';

export interface CreateAssetData {
  assetCode: string;
  name: string;
  description?: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  location: string;
  installDate?: Date;
  ownerId?: string;
  administratorId?: string;
}

export interface UpdateAssetData {
  assetCode?: string;
  name?: string;
  description?: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  location?: string;
  installDate?: Date;
  ownerId?: string;
  administratorId?: string;
  isActive?: boolean;
}

export interface AssetListOptions {
  page?: number;
  limit?: number;
  location?: string;
  isActive?: boolean;
  ownerId?: string;
  administratorId?: string;
}

export class AssetRepository {
  /**
   * Create a new asset
   */
  async create(assetData: CreateAssetData): Promise<Asset> {
    return prisma.asset.create({
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
  async findById(id: string): Promise<Asset | null> {
    return prisma.asset.findUnique({
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
  async findByAssetCode(assetCode: string): Promise<Asset | null> {
    return prisma.asset.findUnique({
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
  async findMany(options: AssetListOptions = {}): Promise<{ assets: Asset[]; total: number; totalPages: number }> {
    const {
      page = 1,
      limit = 20,
      location,
      isActive,
      ownerId,
      administratorId,
    } = options;

    const skip = (page - 1) * limit;

    // Build type-safe where clause
    const where: {
      location?: { contains: string; mode: 'insensitive' };
      isActive?: boolean;
      ownerId?: string;
      administratorId?: string;
    } = {};

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
      prisma.asset.findMany({
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
      prisma.asset.count({ where }),
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
  async update(id: string, assetData: UpdateAssetData): Promise<Asset | null> {
    return prisma.asset.update({
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
  async delete(id: string): Promise<Asset | null> {
    return prisma.asset.update({
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
  async assetCodeExists(assetCode: string, excludeId?: string): Promise<boolean> {
    const where: {
      assetCode: string;
      id?: { not: string };
    } = { assetCode };
    
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const asset = await prisma.asset.findFirst({
      where,
      select: { id: true },
    });
    return !!asset;
  }

  /**
   * Bulk create assets
   */
  async bulkCreate(assetsData: CreateAssetData[]): Promise<Asset[]> {
    const createdAssets: Asset[] = [];

    // Use transaction to ensure all assets are created or none
    await prisma.$transaction(async (tx) => {
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
  async userExists(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return !!user;
  }

  /**
   * Check if asset has active work orders
   */
  async hasActiveWorkOrders(assetId: string): Promise<boolean> {
    const activeWorkOrders = await prisma.workOrder.count({
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
  async search(query: string, limit: number): Promise<Asset[]> {
    return prisma.asset.findMany({
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
  async findByLocation(location: string): Promise<Asset[]> {
    return prisma.asset.findMany({
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
  async getDistinctLocations(): Promise<string[]> {
    const result = await prisma.asset.findMany({
      where: { isActive: true },
      select: { location: true },
      distinct: ['location'],
      orderBy: { location: 'asc' },
    });

    return result.map(asset => asset.location);
  }
}
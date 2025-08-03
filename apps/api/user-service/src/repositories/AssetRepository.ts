import { prisma, Asset } from '@emaintanance/database';

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
}
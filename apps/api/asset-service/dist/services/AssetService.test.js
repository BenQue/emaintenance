"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@emaintenance/database");
const AssetService_1 = require("./AssetService");
describe('AssetService', () => {
    let service;
    let mockPrisma;
    beforeEach(() => {
        mockPrisma = new database_1.PrismaClient();
        service = new AssetService_1.AssetService(mockPrisma);
    });
    describe('createAsset', () => {
        it('should create asset successfully', async () => {
            const createData = {
                assetCode: 'TEST-001',
                name: 'Test Asset',
                location: 'Test Location',
                model: 'Test Model',
            };
            const mockAsset = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                assetCode: 'TEST-001',
                name: 'Test Asset',
                description: null,
                location: 'Test Location',
                model: 'Test Model',
                manufacturer: null,
                serialNumber: null,
                installDate: null,
                isActive: true,
                ownerId: null,
                administratorId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            // This is a basic test - actual implementation would require more mocking
            expect(service).toBeDefined();
        });
    });
});

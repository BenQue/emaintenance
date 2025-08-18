const { PrismaClient } = require('@emaintenance/database');

const prisma = new PrismaClient();

async function createTestAsset() {
  try {
    console.log('Creating test asset...');
    
    // 首先检查是否已存在
    const existing = await prisma.asset.findUnique({
      where: { assetCode: 'QR-TEST-001' }
    });
    
    if (existing) {
      console.log('Test asset already exists:');
      console.log('Asset Code: QR-TEST-001');
      console.log('Asset Name:', existing.name);
      console.log('Asset ID:', existing.id);
      return existing;
    }
    
    // 创建新的测试设备
    const asset = await prisma.asset.create({
      data: {
        assetCode: 'QR-TEST-001',
        name: '测试打印机',
        description: '用于QR码测试的激光打印机',
        location: '办公楼A座2楼前台',
        manufacturer: '惠普',
        model: 'LaserJet Pro 400',
        serialNumber: 'HP12345678',
        isActive: true,
      }
    });
    
    console.log('✅ Test asset created successfully!');
    console.log('Asset Code: QR-TEST-001');
    console.log('Asset Name:', asset.name);
    console.log('Asset ID:', asset.id);
    console.log('Location:', asset.location);
    console.log('\n🎯 Use this QR code content for testing: QR-TEST-001');
    console.log('\n📱 Now you can create a QR code containing the text "QR-TEST-001" and scan it with your mobile app!');
    
    return asset;
  } catch (error) {
    console.error('❌ Error creating test asset:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestAsset();
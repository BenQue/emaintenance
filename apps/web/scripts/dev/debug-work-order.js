const { PrismaClient } = require('@emaintenance/database');

const prisma = new PrismaClient();

async function debugWorkOrderData() {
  console.log('🔍 Debugging Work Order Data Retrieval...\n');

  try {
    // 1. Check if there are any work orders in the database
    const workOrderCount = await prisma.workOrder.count();
    console.log(`📊 Total work orders in database: ${workOrderCount}\n`);

    if (workOrderCount === 0) {
      console.log('❌ No work orders found in database. Creating test data...');
      
      // Create a test asset first
      const testAsset = await prisma.asset.upsert({
        where: { assetCode: 'TEST-ASSET-001' },
        update: {},
        create: {
          assetCode: 'TEST-ASSET-001',
          name: '测试设备',
          description: '用于调试的测试设备',
          location: '测试车间A',
          isActive: true,
        }
      });

      console.log(`✅ Test asset created/found: ${testAsset.name} (${testAsset.assetCode})`);

      // Create a test user
      const testUser = await prisma.user.upsert({
        where: { email: 'test@emaintenance.com' },
        update: {},
        create: {
          email: 'test@emaintenance.com',
          username: 'testuser',
          password: 'hashedpassword',
          firstName: '测试',
          lastName: '用户',
          role: 'TECHNICIAN',
        }
      });

      console.log(`✅ Test user created/found: ${testUser.firstName} ${testUser.lastName}`);

      // Create a test work order
      const testWorkOrder = await prisma.workOrder.create({
        data: {
          title: '测试工单',
          description: '这是一个用于调试的测试工单',
          category: '机械维修',
          reason: '设备故障',
          location: '测试车间A',
          priority: 'MEDIUM',
          assetId: testAsset.id,
          createdById: testUser.id,
        }
      });

      console.log(`✅ Test work order created: ${testWorkOrder.title} (ID: ${testWorkOrder.id})\n`);
    }

    // 2. Get all work orders with their relationships
    console.log('📋 Retrieving work orders with relationships...');
    const workOrders = await prisma.workOrder.findMany({
      take: 5,
      include: {
        asset: {
          select: {
            id: true,
            assetCode: true,
            name: true,
            description: true,
            location: true,
            isActive: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    console.log(`\n🎯 Found ${workOrders.length} work orders:\n`);

    workOrders.forEach((wo, index) => {
      console.log(`${index + 1}. Work Order: "${wo.title}"`);
      console.log(`   ID: ${wo.id}`);
      console.log(`   Status: ${wo.status}`);
      console.log(`   Priority: ${wo.priority}`);
      console.log(`   Asset: ${wo.asset.name} (${wo.asset.assetCode})`);
      console.log(`   Asset Active: ${wo.asset.isActive}`);
      console.log(`   Created by: ${wo.createdBy.firstName} ${wo.createdBy.lastName}`);
      console.log(`   Assigned to: ${wo.assignedTo ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}` : 'None'}`);
      console.log(`   Location: ${wo.location || wo.asset.location}`);
      console.log(`   Created: ${wo.createdAt.toISOString()}`);
      console.log(`   Updated: ${wo.updatedAt.toISOString()}`);
      console.log('   ---');
    });

    // 3. Test specific work order retrieval
    if (workOrders.length > 0) {
      const firstWorkOrderId = workOrders[0].id;
      console.log(`\n🔍 Testing specific work order retrieval for ID: ${firstWorkOrderId}`);
      
      const specificWorkOrder = await prisma.workOrder.findUnique({
        where: { id: firstWorkOrderId },
        include: {
          asset: {
            select: {
              id: true,
              assetCode: true,
              name: true,
              description: true,
              location: true,
              model: true,
              manufacturer: true,
              serialNumber: true,
              isActive: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          statusHistory: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 5,
          },
        },
      });

      if (specificWorkOrder) {
        console.log(`✅ Successfully retrieved work order: "${specificWorkOrder.title}"`);
        console.log(`   Asset data complete: ${JSON.stringify(specificWorkOrder.asset, null, 2)}`);
        console.log(`   Status history entries: ${specificWorkOrder.statusHistory.length}`);
      } else {
        console.log(`❌ Failed to retrieve work order with ID: ${firstWorkOrderId}`);
      }
    }

    // 4. Check asset data integrity
    console.log(`\n🏭 Checking asset data integrity...`);
    const assetCount = await prisma.asset.count();
    const activeAssetCount = await prisma.asset.count({ where: { isActive: true } });
    
    console.log(`   Total assets: ${assetCount}`);
    console.log(`   Active assets: ${activeAssetCount}`);

    const assetsWithoutWorkOrders = await prisma.asset.findMany({
      where: {
        workOrders: {
          none: {}
        }
      },
      take: 3,
    });

    console.log(`   Assets without work orders: ${assetsWithoutWorkOrders.length}`);
    assetsWithoutWorkOrders.forEach(asset => {
      console.log(`     - ${asset.name} (${asset.assetCode})`);
    });

  } catch (error) {
    console.error('❌ Database query error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔚 Database connection closed.');
  }
}

if (require.main === module) {
  debugWorkOrderData();
}

module.exports = { debugWorkOrderData };
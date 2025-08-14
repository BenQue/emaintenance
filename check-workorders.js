const { PrismaClient } = require('@prisma/client');

async function checkWorkOrders() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || "postgresql://postgres:123456@localhost:5432/emaintenance"
      }
    }
  });

  try {
    console.log('Checking work orders in database...');
    
    // Check total count
    const totalCount = await prisma.workOrder.count();
    console.log('Total work orders:', totalCount);
    
    // Check by status
    const statusCounts = await prisma.workOrder.groupBy({
      by: ['status'],
      _count: true,
    });
    
    console.log('Work orders by status:');
    statusCounts.forEach(item => {
      console.log(`  ${item.status}: ${item._count}`);
    });
    
    // Check NOT_COMPLETED (non-completed) count
    const notCompletedCount = await prisma.workOrder.count({
      where: {
        status: {
          not: 'COMPLETED'
        }
      }
    });
    
    console.log('NOT_COMPLETED (non-completed) work orders:', notCompletedCount);
    
    // Show some sample work orders
    const sampleOrders = await prisma.workOrder.findMany({
      take: 3,
      select: {
        id: true,
        title: true,
        status: true,
        reportedAt: true
      },
      orderBy: {
        reportedAt: 'desc'
      }
    });
    
    console.log('Sample work orders:');
    sampleOrders.forEach(order => {
      console.log(`  ${order.id}: ${order.title} [${order.status}] - ${order.reportedAt}`);
    });
    
  } catch (error) {
    console.error('Error checking work orders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWorkOrders();
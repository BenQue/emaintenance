// Create a new work order for testing ResolutionPhoto functionality
const { PrismaClient } = require('@emaintenance/database');

const prisma = new PrismaClient();

async function createTestWorkOrder() {
  try {
    console.log('🔨 创建测试工单...');
    
    // Get a test asset and users
    const asset = await prisma.asset.findFirst();
    if (!asset) {
      console.log('❌ 没有找到测试资产');
      return;
    }
    
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true }
    });
    
    const technician = users.find(u => u.role === 'TECHNICIAN');
    const employee = users.find(u => u.role === 'EMPLOYEE');
    
    if (!technician || !employee) {
      console.log('❌ 没有找到技术员或员工用户');
      return;
    }
    
    // Create work order
    const workOrder = await prisma.workOrder.create({
      data: {
        id: `wo_${Date.now()}`,
        title: '测试ResolutionPhoto上传功能',
        description: '这是一个用于测试解决方案照片上传功能的工单',
        category: '测试类别',
        reason: '功能测试',
        location: '测试区域',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        assetId: asset.id,
        createdById: employee.id,
        assignedToId: technician.id,
        reportedAt: new Date(),
        startedAt: new Date(),
      },
      include: {
        asset: true,
        createdBy: true,
        assignedTo: true,
      }
    });
    
    console.log('✅ 成功创建测试工单:');
    console.log(`工单ID: ${workOrder.id}`);
    console.log(`标题: ${workOrder.title}`);
    console.log(`资产: ${workOrder.asset.name} (${workOrder.asset.assetCode})`);
    console.log(`创建者: ${workOrder.createdBy.email}`);
    console.log(`分配给: ${workOrder.assignedTo.email}`);
    console.log(`状态: ${workOrder.status}`);
    
    console.log('\n💡 使用说明:');
    console.log('1. 使用技术员账户登录Web界面');
    console.log(`2. 找到工单 "${workOrder.title}"`);
    console.log('3. 点击完成工单并上传照片');
    console.log('4. 检查右侧栏是否显示解决方案照片');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestWorkOrder();
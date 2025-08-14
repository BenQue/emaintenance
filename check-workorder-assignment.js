// Check work order assignment to understand permission issues
const { PrismaClient } = require('@emaintenance/database');

const prisma = new PrismaClient();

async function checkWorkOrderAssignment() {
  try {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: 'cme79ikia000d5oy9b8thigvh' },
      include: {
        createdBy: true,
        assignedTo: true,
      }
    });

    if (!workOrder) {
      console.log('❌ Work order not found');
      return;
    }

    console.log('🔍 工单分配情况:');
    console.log('==============');
    console.log(`工单ID: ${workOrder.id}`);
    console.log(`标题: ${workOrder.title}`);
    console.log(`状态: ${workOrder.status}`);
    
    console.log('\n👤 创建者:');
    if (workOrder.createdBy) {
      console.log(`用户名: ${workOrder.createdBy.username || '未知'}`);
      console.log(`邮箱: ${workOrder.createdBy.email}`);
      console.log(`角色: ${workOrder.createdBy.role}`);
    }
    
    console.log('\n👨‍🔧 分配技术员:');
    if (workOrder.assignedTo) {
      console.log(`用户名: ${workOrder.assignedTo.username || '未知'}`);
      console.log(`邮箱: ${workOrder.assignedTo.email}`);
      console.log(`角色: ${workOrder.assignedTo.role}`);
    } else {
      console.log('❌ 工单未分配给任何技术员');
    }

    // Check all users to find suitable ones for testing
    console.log('\n📋 系统中的所有用户:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      }
    });
    
    users.forEach(user => {
      console.log(`- ${user.username || '未知'} (${user.email}) - ${user.role}`);
    });

    console.log('\n💡 建议:');
    if (!workOrder.assignedTo) {
      console.log('1. 需要将工单分配给一个技术员才能完成工单');
    } else {
      console.log(`1. 使用 "${workOrder.assignedTo.username || workOrder.assignedTo.email}" 用户登录来完成工单`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWorkOrderAssignment();
const { PrismaClient } = require('@emaintenance/database');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('查询所有用户...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        firstName: true,
        lastName: true
      }
    });
    
    console.log('找到用户:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.email}) - ${user.role} - ${user.isActive ? '激活' : '禁用'}`);
    });
    
    // 创建一个测试员工用户（如果不存在）
    const testEmployee = await prisma.user.findUnique({
      where: { username: 'employee' }
    });
    
    if (!testEmployee) {
      console.log('\n创建测试员工用户...');
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      await prisma.user.create({
        data: {
          username: 'employee',
          email: 'employee@test.com',
          password: hashedPassword,
          firstName: 'Test',
          lastName: 'Employee',
          role: 'EMPLOYEE',
          isActive: true
        }
      });
      console.log('✅ 测试员工用户创建成功: employee / password123');
    } else {
      console.log(`\n✅ 测试员工用户已存在: ${testEmployee.username} - ${testEmployee.role}`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
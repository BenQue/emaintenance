import { PrismaClient, UserRole, Priority, WorkOrderStatus } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create users
  const hashedPassword = await bcryptjs.hash('password123', 10);
  const adminPassword = await bcryptjs.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@emaintenance.com' },
    update: {
      firstName: 'System',
      lastName: 'Administrator',
      password: adminPassword,
    },
    create: {
      email: 'admin@emaintenance.com',
      username: 'admin',
      password: adminPassword,
      employeeId: 'EMP001',
      firstName: 'System',
      lastName: 'Administrator',
      role: UserRole.ADMIN,
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@emaintenance.com' },
    update: {},
    create: {
      email: 'supervisor@emaintenance.com',
      username: 'supervisor',
      password: hashedPassword,
      employeeId: 'EMP002',
      firstName: '主管',
      lastName: '设备',
      role: UserRole.SUPERVISOR,
    },
  });

  const technician = await prisma.user.upsert({
    where: { email: 'technician@emaintenance.com' },
    update: {},
    create: {
      email: 'technician@emaintenance.com',
      username: 'technician',
      password: hashedPassword,
      employeeId: 'EMP003',
      firstName: '技术员',
      lastName: '维修',
      role: UserRole.TECHNICIAN,
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: 'employee@emaintenance.com' },
    update: {},
    create: {
      email: 'employee@emaintenance.com',
      username: 'employee',
      password: hashedPassword,
      employeeId: 'EMP004',
      firstName: '员工',
      lastName: '一线',
      role: UserRole.EMPLOYEE,
    },
  });

  // Additional technician test accounts
  const technician2 = await prisma.user.upsert({
    where: { email: 'tech2@emaintenance.com' },
    update: {},
    create: {
      email: 'tech2@emaintenance.com',
      username: 'tech2',
      password: hashedPassword,
      employeeId: 'EMP005',
      firstName: '李明',
      lastName: '技术员',
      role: UserRole.TECHNICIAN,
    },
  });

  const technician3 = await prisma.user.upsert({
    where: { email: 'tech3@emaintenance.com' },
    update: {},
    create: {
      email: 'tech3@emaintenance.com',
      username: 'tech3',
      password: hashedPassword,
      employeeId: 'EMP006',
      firstName: '王强',
      lastName: '技术员',
      role: UserRole.TECHNICIAN,
    },
  });

  // Additional employee test accounts
  const employee2 = await prisma.user.upsert({
    where: { email: 'emp2@emaintenance.com' },
    update: {},
    create: {
      email: 'emp2@emaintenance.com',
      username: 'emp2',
      password: hashedPassword,
      employeeId: 'EMP007',
      firstName: '张三',
      lastName: '员工',
      role: UserRole.EMPLOYEE,
    },
  });

  const employee3 = await prisma.user.upsert({
    where: { email: 'emp3@emaintenance.com' },
    update: {},
    create: {
      email: 'emp3@emaintenance.com',
      username: 'emp3',
      password: hashedPassword,
      employeeId: 'EMP008',
      firstName: '刘佳',
      lastName: '员工',
      role: UserRole.EMPLOYEE,
    },
  });

  const employee4 = await prisma.user.upsert({
    where: { email: 'emp4@emaintenance.com' },
    update: {},
    create: {
      email: 'emp4@emaintenance.com',
      username: 'emp4',
      password: hashedPassword,
      employeeId: 'EMP009',
      firstName: '陈伟',
      lastName: '员工',
      role: UserRole.EMPLOYEE,
    },
  });

  // Create assets
  const asset1 = await prisma.asset.upsert({
    where: { assetCode: 'EQ001' },
    update: {},
    create: {
      assetCode: 'EQ001',
      name: '生产线设备A',
      description: '主要生产线设备',
      model: 'Model-A1',
      manufacturer: '设备制造商A',
      serialNumber: 'SN001',
      location: '车间一',
      ownerId: supervisor.id,
      administratorId: technician.id,
    },
  });

  const asset2 = await prisma.asset.upsert({
    where: { assetCode: 'EQ002' },
    update: {},
    create: {
      assetCode: 'EQ002',
      name: '包装机器B',
      description: '自动包装设备',
      model: 'Model-B1',
      manufacturer: '设备制造商B',
      serialNumber: 'SN002',
      location: '车间二',
      ownerId: supervisor.id,
      administratorId: technician.id,
    },
  });

  // Create work orders
  await prisma.workOrder.upsert({
    where: { id: 'wo001' },
    update: {},
    create: {
      id: 'wo001',
      title: '设备异响问题',
      description: '设备运行时发出异常声音',
      category: '机械故障',
      reason: '异常噪音',
      location: '车间一',
      priority: Priority.HIGH,
      status: WorkOrderStatus.PENDING,
      assetId: asset1.id,
      createdById: employee.id,
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
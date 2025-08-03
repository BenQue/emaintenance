import { PrismaClient, UserRole, Priority, WorkOrderStatus } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create users
  const hashedPassword = await bcryptjs.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@emaintanance.com' },
    update: {},
    create: {
      email: 'admin@emaintanance.com',
      username: 'admin',
      password: hashedPassword,
      employeeId: 'EMP001',
      firstName: '管理员',
      lastName: '系统',
      role: UserRole.ADMIN,
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@emaintanance.com' },
    update: {},
    create: {
      email: 'supervisor@emaintanance.com',
      username: 'supervisor',
      password: hashedPassword,
      employeeId: 'EMP002',
      firstName: '主管',
      lastName: '设备',
      role: UserRole.SUPERVISOR,
    },
  });

  const technician = await prisma.user.upsert({
    where: { email: 'technician@emaintanance.com' },
    update: {},
    create: {
      email: 'technician@emaintanance.com',
      username: 'technician',
      password: hashedPassword,
      employeeId: 'EMP003',
      firstName: '技术员',
      lastName: '维修',
      role: UserRole.TECHNICIAN,
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: 'employee@emaintanance.com' },
    update: {},
    create: {
      email: 'employee@emaintanance.com',
      username: 'employee',
      password: hashedPassword,
      employeeId: 'EMP004',
      firstName: '员工',
      lastName: '一线',
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
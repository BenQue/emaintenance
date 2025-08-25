import { PrismaClient, UserRole, Priority, WorkOrderStatus, NotificationType } from '@prisma/client';
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

  // Create more assets
  const asset3 = await prisma.asset.upsert({
    where: { assetCode: 'EQ003' },
    update: {},
    create: {
      assetCode: 'EQ003',
      name: '空压机C',
      description: '工厂空气压缩机',
      model: 'Model-C1',
      manufacturer: '设备制造商C',
      serialNumber: 'SN003',
      location: '动力车间',
      ownerId: supervisor.id,
      administratorId: technician2.id,
    },
  });

  const asset4 = await prisma.asset.upsert({
    where: { assetCode: 'EQ004' },
    update: {},
    create: {
      assetCode: 'EQ004',
      name: '输送带D',
      description: '产品运输输送带',
      model: 'Model-D1',
      manufacturer: '设备制造商D',
      serialNumber: 'SN004',
      location: '车间三',
      ownerId: supervisor.id,
      administratorId: technician3.id,
    },
  });

  const asset5 = await prisma.asset.upsert({
    where: { assetCode: 'EQ005' },
    update: {},
    create: {
      assetCode: 'EQ005',
      name: '质检设备E',
      description: '产品质量检测设备',
      model: 'Model-E1',
      manufacturer: '设备制造商E',
      serialNumber: 'SN005',
      location: '质检车间',
      ownerId: supervisor.id,
      administratorId: technician.id,
    },
  });

  // Create work orders with different statuses
  const workOrder1 = await prisma.workOrder.upsert({
    where: { id: 'wo001' },
    update: {},
    create: {
      id: 'wo001',
      title: '设备异响问题',
      description: '设备运行时发出异常声音，需要立即检查',
      category: '机械故障',
      reason: '异常噪音',
      location: '车间一',
      priority: Priority.HIGH,
      status: WorkOrderStatus.PENDING,
      assetId: asset1.id,
      createdById: employee.id,
    },
  });

  const workOrder2 = await prisma.workOrder.upsert({
    where: { id: 'wo002' },
    update: {},
    create: {
      id: 'wo002',
      title: '包装机传送带故障',
      description: '包装机传送带运转不流畅，影响生产效率',
      category: '机械故障',
      reason: '传送带卡顿',
      location: '车间二',
      priority: Priority.MEDIUM,
      status: WorkOrderStatus.IN_PROGRESS,
      assetId: asset2.id,
      createdById: employee2.id,
      assignedToId: technician.id,
    },
  });

  const workOrder3 = await prisma.workOrder.upsert({
    where: { id: 'wo003' },
    update: {},
    create: {
      id: 'wo003',
      title: '空压机压力不足',
      description: '空压机输出压力低于标准值，影响其他设备正常运行',
      category: '设备故障',
      reason: '压力异常',
      location: '动力车间',
      priority: Priority.HIGH,
      status: WorkOrderStatus.IN_PROGRESS,
      assetId: asset3.id,
      createdById: employee3.id,
      assignedToId: technician2.id,
    },
  });

  const workOrder4 = await prisma.workOrder.upsert({
    where: { id: 'wo004' },
    update: {},
    create: {
      id: 'wo004',
      title: '输送带皮带更换',
      description: '输送带皮带磨损严重，需要更换新皮带',
      category: '预防性维护',
      reason: '定期维护',
      location: '车间三',
      priority: Priority.LOW,
      status: WorkOrderStatus.COMPLETED,
      assetId: asset4.id,
      createdById: employee4.id,
      assignedToId: technician3.id,
    },
  });

  const workOrder5 = await prisma.workOrder.upsert({
    where: { id: 'wo005' },
    update: {},
    create: {
      id: 'wo005',
      title: '质检设备校准',
      description: '质检设备需要进行精度校准，确保检测结果准确',
      category: '校准维护',
      reason: '精度校准',
      location: '质检车间',
      priority: Priority.MEDIUM,
      status: WorkOrderStatus.WAITING_PARTS,
      assetId: asset5.id,
      createdById: employee.id,
      assignedToId: technician.id,
    },
  });

  // Create assignment rules
  await prisma.assignmentRule.upsert({
    where: { id: 'ar001' },
    update: {},
    create: {
      id: 'ar001',
      name: '机械故障自动分配规则',
      priority: 1,
      isActive: true,
      assetTypes: ['生产线设备', '包装机器'],
      categories: ['机械故障', '设备故障'],
      locations: ['车间一', '车间二'],
      priorities: ['高', '中'],
      assignToId: technician.id,
    },
  });

  await prisma.assignmentRule.upsert({
    where: { id: 'ar002' },
    update: {},
    create: {
      id: 'ar002',
      name: '动力设备专项分配',
      priority: 2,
      isActive: true,
      assetTypes: ['空压机'],
      categories: ['设备故障', '压力异常'],
      locations: ['动力车间'],
      priorities: ['高', '中', '低'],
      assignToId: technician2.id,
    },
  });

  await prisma.assignmentRule.upsert({
    where: { id: 'ar003' },
    update: {},
    create: {
      id: 'ar003',
      name: '输送系统维护规则',
      priority: 3,
      isActive: true,
      assetTypes: ['输送带'],
      categories: ['预防性维护', '定期维护'],
      locations: ['车间三'],
      priorities: ['低', '中'],
      assignToId: technician3.id,
    },
  });

  // Create notifications
  await prisma.notification.create({
    data: {
      id: 'notif001',
      title: '新工单已分配',
      message: '您有一个新的工单已分配：空压机压力不足',
      type: NotificationType.WORK_ORDER_ASSIGNED,
      userId: technician2.id,
      workOrderId: workOrder3.id,
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      id: 'notif002',
      title: '工单状态更新',
      message: '工单"包装机传送带故障"状态已更新为进行中',
      type: NotificationType.WORK_ORDER_UPDATED,
      userId: employee2.id,
      workOrderId: workOrder2.id,
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      id: 'notif003',
      title: '工单已完成',
      message: '工单"输送带皮带更换"已完成',
      type: NotificationType.WORK_ORDER_UPDATED,
      userId: employee4.id,
      workOrderId: workOrder4.id,
      isRead: true,
    },
  });

  console.log('Database seeded successfully with comprehensive test data!');
  console.log('Test accounts created:');
  console.log('- admin@emaintenance.com / admin123');
  console.log('- supervisor@emaintenance.com / password123');
  console.log('- technician@emaintenance.com / password123');
  console.log('- tech2@emaintenance.com / password123');
  console.log('- tech3@emaintenance.com / password123');
  console.log('- employee@emaintenance.com / password123');
  console.log('- emp2@emaintenance.com / password123');
  console.log('- emp3@emaintenance.com / password123');
  console.log('- emp4@emaintenance.com / password123');
  console.log('Assets: 5 items created');
  console.log('Work Orders: 5 items with different statuses');
  console.log('Assignment Rules: 3 automatic assignment rules');
  console.log('Notifications: 3 sample notifications');
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
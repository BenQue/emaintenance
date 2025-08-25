import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateMasterData() {
  console.log('开始填充系统主数据...');

  // 创建报修分类 (Categories)
  const categories = [
    { name: '机械故障', description: '机械部件损坏、磨损、卡死等问题' },
    { name: '电气故障', description: '电路、电机、传感器等电气设备故障' },
    { name: '液压故障', description: '液压系统压力异常、泄漏等问题' },
    { name: '气动故障', description: '气压系统、气缸、阀门等故障' },
    { name: '控制系统故障', description: 'PLC、HMI、控制器等故障' },
    { name: '安全设备故障', description: '安全开关、护栏、急停按钮等安全设备故障' },
    { name: '预防性维护', description: '定期保养、检查、更换易损件' },
    { name: '校准维护', description: '设备精度校准、标定等' },
    { name: '清洁保养', description: '设备清洁、润滑、保养' },
    { name: '环境影响', description: '温度、湿度、振动等环境因素导致的问题' },
    { name: '操作问题', description: '操作不当、培训不足导致的设备问题' },
    { name: '软件问题', description: '程序错误、参数设置错误等软件相关问题' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { description: category.description },
      create: category,
    });
  }
  console.log(`✅ 已创建 ${categories.length} 个报修分类`);

  // 创建设备位置 (Locations)
  const locations = [
    { name: '车间一', description: '主生产线车间' },
    { name: '车间二', description: '包装生产车间' },
    { name: '车间三', description: '输送装配车间' },
    { name: '车间四', description: '精加工车间' },
    { name: '车间五', description: '表面处理车间' },
    { name: '动力车间', description: '空压机、冷却塔等动力设备' },
    { name: '质检车间', description: '产品质量检测区域' },
    { name: '仓储区', description: '原料和成品仓库' },
    { name: '维修车间', description: '设备维修工作区' },
    { name: '办公区', description: '办公室、会议室等' },
    { name: '实验室', description: '产品测试实验室' },
    { name: '污水处理站', description: '废水处理设施' },
    { name: '配电房', description: '供电配电设施' },
    { name: '锅炉房', description: '蒸汽供应设施' },
    { name: '化学品库', description: '化学原料储存区' },
    { name: '停车场', description: '员工和访客停车区' },
    { name: '食堂', description: '员工就餐区域' },
    { name: '宿舍区', description: '员工住宿区域' },
  ];

  for (const location of locations) {
    await prisma.location.upsert({
      where: { name: location.name },
      update: { description: location.description },
      create: location,
    });
  }
  console.log(`✅ 已创建 ${locations.length} 个设备位置`);

  // 创建故障代码 (Fault Codes)
  const faultCodes = [
    { name: 'M001', description: '轴承故障 - 轴承磨损、异响、发热' },
    { name: 'M002', description: '齿轮故障 - 齿轮磨损、断齿、异响' },
    { name: 'M003', description: '皮带故障 - 皮带断裂、打滑、张力不当' },
    { name: 'M004', description: '链条故障 - 链条断裂、伸长、跳齿' },
    { name: 'M005', description: '密封故障 - 密封圈老化、泄漏' },
    { name: 'E001', description: '电机故障 - 电机过热、异响、启动困难' },
    { name: 'E002', description: '传感器故障 - 传感器失效、信号异常' },
    { name: 'E003', description: '接触器故障 - 接触不良、触点烧蚀' },
    { name: 'E004', description: '变频器故障 - 变频器报警、输出异常' },
    { name: 'E005', description: '线缆故障 - 线缆断裂、老化、接触不良' },
    { name: 'H001', description: '液压泵故障 - 泵体磨损、压力不足' },
    { name: 'H002', description: '液压阀故障 - 阀门卡死、泄漏' },
    { name: 'H003', description: '液压缸故障 - 缸体泄漏、活塞杆弯曲' },
    { name: 'H004', description: '液压管路故障 - 管路破裂、接头泄漏' },
    { name: 'P001', description: '气压不足 - 压缩机故障、管路泄漏' },
    { name: 'P002', description: '气缸故障 - 气缸密封不良、动作缓慢' },
    { name: 'P003', description: '气动阀故障 - 阀门动作失效、泄漏' },
    { name: 'C001', description: 'PLC故障 - 程序错误、硬件故障' },
    { name: 'C002', description: 'HMI故障 - 触摸屏失效、显示异常' },
    { name: 'C003', description: '通讯故障 - 总线通讯中断、数据异常' },
    { name: 'S001', description: '安全门故障 - 安全开关失效、门无法开启' },
    { name: 'S002', description: '急停按钮故障 - 按钮失效、复位困难' },
    { name: 'S003', description: '光幕故障 - 光幕遮挡、误报警' },
    { name: 'T001', description: '温度异常 - 温度传感器故障、温度过高' },
    { name: 'T002', description: '振动异常 - 设备振动超标、共振' },
    { name: 'T003', description: '噪音异常 - 异常噪音、声级超标' },
    { name: 'O001', description: '操作错误 - 错误操作导致设备故障' },
    { name: 'O002', description: '参数设置错误 - 设备参数设置不当' },
    { name: 'PM01', description: '定期保养 - 定期润滑、清洁保养' },
    { name: 'PM02', description: '零件更换 - 易损件定期更换' },
    { name: 'CAL1', description: '精度校准 - 测量设备精度校准' },
    { name: 'CAL2', description: '压力校准 - 压力表、传感器校准' },
  ];

  for (const faultCode of faultCodes) {
    await prisma.faultCodeMaster.upsert({
      where: { name: faultCode.name },
      update: { description: faultCode.description },
      create: faultCode,
    });
  }
  console.log(`✅ 已创建 ${faultCodes.length} 个故障代码`);

  // 创建优先级 (Priority Levels)
  const priorityLevels = [
    { name: '低', description: '不影响生产，可在计划维护时处理', level: 1 },
    { name: '中', description: '影响部分生产效率，需在24小时内处理', level: 2 },
    { name: '高', description: '严重影响生产，需在4小时内处理', level: 3 },
    { name: '紧急', description: '停产状态，需立即处理', level: 4 },
  ];

  for (const priority of priorityLevels) {
    await prisma.priorityLevel.upsert({
      where: { name: priority.name },
      update: { description: priority.description, level: priority.level },
      create: priority,
    });
  }
  console.log(`✅ 已创建 ${priorityLevels.length} 个优先级`);

  // 创建故障原因 (Reasons) - 与分类关联
  const mechanicalCategory = await prisma.category.findUnique({ where: { name: '机械故障' } });
  const electricalCategory = await prisma.category.findUnique({ where: { name: '电气故障' } });
  const hydraulicCategory = await prisma.category.findUnique({ where: { name: '液压故障' } });
  const pneumaticCategory = await prisma.category.findUnique({ where: { name: '气动故障' } });
  const maintenanceCategory = await prisma.category.findUnique({ where: { name: '预防性维护' } });

  const reasons = [
    // 机械故障原因
    { name: '轴承磨损', description: '轴承正常磨损或润滑不良', categoryId: mechanicalCategory?.id },
    { name: '皮带断裂', description: '传动皮带断裂或严重磨损', categoryId: mechanicalCategory?.id },
    { name: '齿轮损坏', description: '齿轮断齿或磨损严重', categoryId: mechanicalCategory?.id },
    { name: '密封泄漏', description: '密封件老化导致泄漏', categoryId: mechanicalCategory?.id },
    { name: '异常振动', description: '设备运行时产生异常振动', categoryId: mechanicalCategory?.id },
    { name: '异常噪音', description: '设备运行时产生异常声响', categoryId: mechanicalCategory?.id },
    
    // 电气故障原因
    { name: '电机烧毁', description: '电机线圈烧毁或绝缘损坏', categoryId: electricalCategory?.id },
    { name: '传感器失效', description: '传感器损坏或信号异常', categoryId: electricalCategory?.id },
    { name: '线路故障', description: '电缆断线或接触不良', categoryId: electricalCategory?.id },
    { name: '保险丝熔断', description: '过载保护熔断器动作', categoryId: electricalCategory?.id },
    { name: '接触器故障', description: '接触器触点烧蚀或卡死', categoryId: electricalCategory?.id },
    
    // 液压故障原因
    { name: '液压泵故障', description: '液压泵磨损或效率下降', categoryId: hydraulicCategory?.id },
    { name: '液压油污染', description: '液压油污染导致系统故障', categoryId: hydraulicCategory?.id },
    { name: '液压阀卡死', description: '液压阀门卡死无法动作', categoryId: hydraulicCategory?.id },
    { name: '管路泄漏', description: '液压管路或接头泄漏', categoryId: hydraulicCategory?.id },
    
    // 气动故障原因
    { name: '气压不足', description: '系统气压低于工作要求', categoryId: pneumaticCategory?.id },
    { name: '气缸泄漏', description: '气缸密封不良导致泄漏', categoryId: pneumaticCategory?.id },
    { name: '气动阀故障', description: '气动阀门动作异常', categoryId: pneumaticCategory?.id },
    
    // 预防性维护原因
    { name: '定期保养', description: '按计划进行定期维护保养', categoryId: maintenanceCategory?.id },
    { name: '零件更换', description: '易损件到期更换', categoryId: maintenanceCategory?.id },
    { name: '润滑保养', description: '设备润滑系统保养', categoryId: maintenanceCategory?.id },
    { name: '清洁保养', description: '设备清洁和外观保养', categoryId: maintenanceCategory?.id },
  ];

  for (const reason of reasons) {
    if (reason.categoryId) {
      await prisma.reason.upsert({
        where: { 
          unique_reason_per_category: { 
            name: reason.name, 
            categoryId: reason.categoryId 
          } 
        },
        update: { description: reason.description },
        create: reason,
      });
    }
  }
  console.log(`✅ 已创建 ${reasons.length} 个故障原因`);

  console.log('\n🎉 系统主数据填充完成！');
  console.log('现在可以在系统设置中查看：');
  console.log('- 报修分类：12个分类');
  console.log('- 设备位置：18个位置');
  console.log('- 故障代码：32个代码');
  console.log('- 优先级：4个级别');
  console.log('- 故障原因：21个原因');
}

populateMasterData()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('填充主数据时发生错误:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
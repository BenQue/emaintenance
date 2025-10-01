import { prisma } from '../src';

const faultSymptoms = [
  {
    code: 'EQUIPMENT_SHUTDOWN',
    name: '设备停机',
    description: '设备完全停止运行',
    icon: 'power-off',
  },
  {
    code: 'POWER_OUTAGE',
    name: '断电',
    description: '设备失去电力供应',
    icon: 'flash-off',
  },
  {
    code: 'ABNORMAL_NOISE',
    name: '异常噪音',
    description: '设备运行时出现异常声音',
    icon: 'volume-high',
  },
  {
    code: 'LEAKAGE',
    name: '漏油/漏液',
    description: '设备出现油液泄漏',
    icon: 'water',
  },
  {
    code: 'OVERHEATING',
    name: '过热',
    description: '设备温度异常升高',
    icon: 'thermometer',
  },
  {
    code: 'ABNORMAL_VIBRATION',
    name: '振动异常',
    description: '设备震动幅度异常',
    icon: 'pulse',
  },
  {
    code: 'SPEED_ABNORMALITY',
    name: '速度异常',
    description: '设备运行速度不正常',
    icon: 'speedometer',
  },
  {
    code: 'DISPLAY_ERROR',
    name: '显示异常',
    description: '显示屏或指示灯异常',
    icon: 'desktop',
  },
  {
    code: 'CANNOT_START',
    name: '无法启动',
    description: '设备无法正常启动',
    icon: 'play-circle',
  },
  {
    code: 'FUNCTION_FAILURE',
    name: '功能失效',
    description: '某项功能无法正常使用',
    icon: 'construct',
  },
  {
    code: 'OTHER',
    name: '其他',
    description: '其他未列出的故障表现',
    icon: 'ellipsis-horizontal',
  },
];

async function seedFaultSymptoms() {
  console.log('开始初始化故障表现数据...');

  for (const symptom of faultSymptoms) {
    try {
      const existing = await prisma.faultSymptom.findUnique({
        where: { code: symptom.code },
      });

      if (existing) {
        console.log(`故障表现 "${symptom.name}" 已存在，跳过`);
        continue;
      }

      await prisma.faultSymptom.create({
        data: symptom,
      });

      console.log(`✅ 创建故障表现: ${symptom.name} (${symptom.code})`);
    } catch (error) {
      console.error(`❌ 创建故障表现失败 "${symptom.name}":`, error);
    }
  }

  console.log('\n故障表现数据初始化完成！');
}

seedFaultSymptoms()
  .catch((error) => {
    console.error('初始化失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

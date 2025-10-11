#!/usr/bin/env node
/**
 * Asset Import Script
 * 从CSV文件导入资产数据到数据库
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// CSV文件路径（使用标准10字段格式）
const CSV_FILE = path.join(__dirname, 'asset_PR_0930_standard.csv');

/**
 * 解析CSV文件
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // 跳过标题行
  const [header, ...dataLines] = lines;
  const headers = header.split(',').map(h => h.trim());

  return dataLines.map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || null;
    });
    return obj;
  });
}

/**
 * 获取Location ID by name
 */
async function getLocationId(locationName) {
  if (!locationName) return null;

  const location = await prisma.location.findFirst({
    where: { name: locationName, isActive: true }
  });

  return location?.id || null;
}

/**
 * 导入单个资产
 * 支持标准10字段CSV格式
 */
async function importAsset(csvRow) {
  const {
    assetCode,
    name,
    category,
    location,
    status,
    installDate,
    model,
    manufacturer,
    serialNumber,
    description,
  } = csvRow;

  // 基本数据验证
  if (!assetCode || !name) {
    console.warn(`⚠️  跳过无效记录: assetCode=${assetCode}, name=${name}`);
    return { success: false, reason: 'Missing required fields' };
  }

  // 转换status: ACTIVE -> true, 其他 -> false
  const isActive = status === 'ACTIVE' || status === 'true' || !status;

  // 获取Location外键
  const locationId = await getLocationId(location);

  // 构建描述字段（合并category和description）
  let finalDescription = '';
  if (category) {
    finalDescription = `类别: ${category}`;
  }
  if (description) {
    finalDescription = finalDescription
      ? `${finalDescription}\n${description}`
      : description;
  }

  // 解析安装日期
  let parsedInstallDate = null;
  if (installDate && installDate.trim()) {
    try {
      parsedInstallDate = new Date(installDate);
      if (isNaN(parsedInstallDate.getTime())) {
        parsedInstallDate = null;
      }
    } catch (e) {
      console.warn(`⚠️  无效的安装日期: ${installDate}`);
    }
  }

  try {
    // 检查是否已存在
    const existing = await prisma.asset.findUnique({
      where: { assetCode }
    });

    if (existing) {
      console.log(`ℹ️  资产已存在: ${assetCode} - ${name}`);
      return { success: true, action: 'skipped' };
    }

    // 创建资产记录（映射所有标准字段）
    await prisma.asset.create({
      data: {
        assetCode,
        name,
        description: finalDescription || null,
        model: model || null,
        manufacturer: manufacturer || null,
        serialNumber: serialNumber || null,
        location, // 存储原始location字符串（向后兼容）
        locationId, // 外键引用
        installDate: parsedInstallDate,
        isActive,
      }
    });

    console.log(`✅ 导入成功: ${assetCode} - ${name}`);
    return { success: true, action: 'created' };

  } catch (error) {
    console.error(`❌ 导入失败: ${assetCode} - ${error.message}`);
    return { success: false, reason: error.message };
  }
}

/**
 * 主执行函数
 */
async function main() {
  console.log('🚀 开始导入资产数据...\n');
  console.log(`📁 CSV文件: ${CSV_FILE}\n`);

  // 解析CSV
  const assets = parseCSV(CSV_FILE);
  console.log(`📊 总共 ${assets.length} 条资产记录\n`);

  // 统计
  const stats = {
    total: assets.length,
    created: 0,
    skipped: 0,
    failed: 0,
  };

  // 批量导入
  for (const asset of assets) {
    const result = await importAsset(asset);

    if (result.success) {
      if (result.action === 'created') {
        stats.created++;
      } else if (result.action === 'skipped') {
        stats.skipped++;
      }
    } else {
      stats.failed++;
    }
  }

  // 输出统计
  console.log('\n' + '='.repeat(50));
  console.log('📊 导入完成统计:');
  console.log(`  总记录数: ${stats.total}`);
  console.log(`  ✅ 成功创建: ${stats.created}`);
  console.log(`  ℹ️  已存在跳过: ${stats.skipped}`);
  console.log(`  ❌ 失败: ${stats.failed}`);
  console.log('='.repeat(50));

  // 验证数据
  const totalAssets = await prisma.asset.count();
  console.log(`\n🔍 数据库中当前资产总数: ${totalAssets}`);
}

// 执行并处理错误
main()
  .catch((e) => {
    console.error('💥 执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

-- 中文化系统设置数据脚本
-- Localize system settings data to Chinese

-- 1. 清理重复和英文的分类数据
DELETE FROM categories WHERE name IN (
  'Electrical Maintenance',
  'Emergency Repair', 
  'Inspection',
  'Mechanical Maintenance',
  'Preventive Maintenance',
  'Software Issues',
  'test'
);

-- 2. 替换位置数据为中文
DELETE FROM locations;
INSERT INTO locations (id, name, description, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), '生产车间', '主要生产设备所在区域', NOW(), NOW()),
(gen_random_uuid(), '仓储区域', '原材料和成品存储区域', NOW(), NOW()),
(gen_random_uuid(), '生产线A', '第一条自动化生产线', NOW(), NOW()),
(gen_random_uuid(), '生产线B', '第二条自动化生产线', NOW(), NOW()),
(gen_random_uuid(), '办公楼', '管理和技术人员办公区域', NOW(), NOW()),
(gen_random_uuid(), '室外设施', '户外设备和基础设施', NOW(), NOW()),
(gen_random_uuid(), '配电房', '电力设备和配电设施', NOW(), NOW()),
(gen_random_uuid(), '设备间', '机械设备和工具存放', NOW(), NOW());

-- 3. 替换故障代码为中文
DELETE FROM fault_codes;
INSERT INTO fault_codes (id, name, description, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), '机械故障', '机械部件损坏或失效', NOW(), NOW()),
(gen_random_uuid(), '电气故障', '电气系统或元件故障', NOW(), NOW()),
(gen_random_uuid(), '软件故障', '控制软件或程序错误', NOW(), NOW()),
(gen_random_uuid(), '磨损老化', '设备正常磨损或老化', NOW(), NOW()),
(gen_random_uuid(), '操作错误', '人为操作不当导致', NOW(), NOW()),
(gen_random_uuid(), '预防维护', '计划性预防维护项目', NOW(), NOW()),
(gen_random_uuid(), '环境因素', '外部环境条件影响', NOW(), NOW()),
(gen_random_uuid(), '其他原因', '无法归类的其他原因', NOW(), NOW());

-- 4. 替换优先级为中文
DELETE FROM priority_levels;
INSERT INTO priority_levels (id, name, description, level, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), '低优先级', '非紧急事项，可延后处理', 1, NOW(), NOW()),
(gen_random_uuid(), '中优先级', '需要及时处理的事项', 2, NOW(), NOW()),
(gen_random_uuid(), '高优先级', '重要且紧急的事项', 3, NOW(), NOW()),
(gen_random_uuid(), '紧急处理', '需要立即处理的紧急事项', 4, NOW(), NOW());

-- 5. 清理英文和重复的原因数据
DELETE FROM reasons WHERE name IN (
  'Equipment Breakdown',
  'Scheduled Maintenance', 
  'Safety Concern',
  'Performance Issue',
  'Upgrade/Modification',
  'Inspection Required',
  'test'
);

-- 6. 清理重复的中文原因数据（保留一个）
DELETE FROM reasons WHERE id IN (
  SELECT r1.id FROM reasons r1
  INNER JOIN reasons r2 ON r1.name = r2.name
  WHERE r1.id > r2.id
);

-- 验证数据
SELECT 'Locations Count:' as info, COUNT(*) as count FROM locations
UNION ALL
SELECT 'Categories Count:', COUNT(*) FROM categories  
UNION ALL
SELECT 'Fault Codes Count:', COUNT(*) FROM fault_codes
UNION ALL
SELECT 'Priority Levels Count:', COUNT(*) FROM priority_levels
UNION ALL
SELECT 'Reasons Count:', COUNT(*) FROM reasons;
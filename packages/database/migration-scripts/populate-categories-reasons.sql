-- 报修分类和原因初始化数据
-- 这个脚本会创建基础的报修分类和对应的原因

-- 清理现有数据（如果需要重新初始化）
-- DELETE FROM reasons WHERE "categoryId" IS NOT NULL;
-- DELETE FROM categories;

-- 插入报修分类
INSERT INTO categories (id, name, description, "isActive", "createdAt", "updatedAt") VALUES
  ('cat_mechanical', '机械故障', '设备机械部件相关故障', true, NOW(), NOW()),
  ('cat_electrical', '电气故障', '电气系统和电路相关故障', true, NOW(), NOW()),
  ('cat_software', '软件问题', '控制软件和程序相关问题', true, NOW(), NOW()),
  ('cat_maintenance', '预防维护', '定期保养和预防性维护', true, NOW(), NOW()),
  ('cat_operation', '操作问题', '设备操作和使用相关问题', true, NOW(), NOW()),
  ('cat_environment', '环境因素', '外部环境导致的设备问题', true, NOW(), NOW()),
  ('cat_wear', '磨损老化', '设备自然磨损和老化问题', true, NOW(), NOW()),
  ('cat_other', '其他', '其他未分类的问题', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "updatedAt" = NOW();

-- 插入机械故障相关原因
INSERT INTO reasons (id, name, description, "categoryId", "isActive", "createdAt", "updatedAt") VALUES
  ('reason_mech_bearing', '轴承损坏', '轴承磨损、卡死或损坏', 'cat_mechanical', true, NOW(), NOW()),
  ('reason_mech_gear', '齿轮故障', '齿轮磨损、断齿或传动异常', 'cat_mechanical', true, NOW(), NOW()),
  ('reason_mech_belt', '皮带问题', '皮带断裂、松动或磨损', 'cat_mechanical', true, NOW(), NOW()),
  ('reason_mech_vibration', '振动异常', '设备运行振动过大或异常', 'cat_mechanical', true, NOW(), NOW()),
  ('reason_mech_leakage', '泄漏问题', '液压油、润滑油等泄漏', 'cat_mechanical', true, NOW(), NOW()),
  ('reason_mech_alignment', '对中不良', '设备对中偏差或安装不当', 'cat_mechanical', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "updatedAt" = NOW();

-- 插入电气故障相关原因
INSERT INTO reasons (id, name, description, "categoryId", "isActive", "createdAt", "updatedAt") VALUES
  ('reason_elec_motor', '电机故障', '电机绕组、转子或定子故障', 'cat_electrical', true, NOW(), NOW()),
  ('reason_elec_circuit', '电路故障', '断路、短路或接触不良', 'cat_electrical', true, NOW(), NOW()),
  ('reason_elec_sensor', '传感器故障', '位置、温度、压力等传感器故障', 'cat_electrical', true, NOW(), NOW()),
  ('reason_elec_power', '电源问题', '电压不稳、停电或电源故障', 'cat_electrical', true, NOW(), NOW()),
  ('reason_elec_control', '控制系统故障', '控制器、继电器或开关故障', 'cat_electrical', true, NOW(), NOW()),
  ('reason_elec_cable', '电缆问题', '电缆破损、老化或接线松动', 'cat_electrical', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "updatedAt" = NOW();

-- 插入软件问题相关原因
INSERT INTO reasons (id, name, description, "categoryId", "isActive", "createdAt", "updatedAt") VALUES
  ('reason_soft_program', '程序错误', '控制程序逻辑错误或bug', 'cat_software', true, NOW(), NOW()),
  ('reason_soft_config', '配置错误', '参数设置或配置文件错误', 'cat_software', true, NOW(), NOW()),
  ('reason_soft_update', '升级问题', '软件升级后出现的问题', 'cat_software', true, NOW(), NOW()),
  ('reason_soft_interface', '接口故障', '通讯接口或数据交换问题', 'cat_software', true, NOW(), NOW()),
  ('reason_soft_database', '数据库问题', '数据库连接或数据错误', 'cat_software', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "updatedAt" = NOW();

-- 插入预防维护相关原因
INSERT INTO reasons (id, name, description, "categoryId", "isActive", "createdAt", "updatedAt") VALUES
  ('reason_maint_scheduled', '定期保养', '按计划进行的定期维护保养', 'cat_maintenance', true, NOW(), NOW()),
  ('reason_maint_lubrication', '润滑维护', '添加或更换润滑油、润滑脂', 'cat_maintenance', true, NOW(), NOW()),
  ('reason_maint_cleaning', '清洁维护', '设备清洁和除尘维护', 'cat_maintenance', true, NOW(), NOW()),
  ('reason_maint_calibration', '校准检验', '精度校准和检验测试', 'cat_maintenance', true, NOW(), NOW()),
  ('reason_maint_replacement', '预防性更换', '预防性更换易损件', 'cat_maintenance', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "updatedAt" = NOW();

-- 插入操作问题相关原因
INSERT INTO reasons (id, name, description, "categoryId", "isActive", "createdAt", "updatedAt") VALUES
  ('reason_oper_misuse', '操作不当', '不正确的操作方法或程序', 'cat_operation', true, NOW(), NOW()),
  ('reason_oper_overload', '超负荷运行', '超出设备额定负荷运行', 'cat_operation', true, NOW(), NOW()),
  ('reason_oper_procedure', '程序违规', '未按标准操作程序执行', 'cat_operation', true, NOW(), NOW()),
  ('reason_oper_training', '培训不足', '操作人员培训不足导致的问题', 'cat_operation', true, NOW(), NOW()),
  ('reason_oper_safety', '安全违规', '违反安全操作规程', 'cat_operation', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "updatedAt" = NOW();

-- 插入环境因素相关原因
INSERT INTO reasons (id, name, description, "categoryId", "isActive", "createdAt", "updatedAt") VALUES
  ('reason_env_temperature', '温度异常', '环境温度过高或过低', 'cat_environment', true, NOW(), NOW()),
  ('reason_env_humidity', '湿度影响', '环境湿度过高导致的问题', 'cat_environment', true, NOW(), NOW()),
  ('reason_env_dust', '粉尘污染', '环境粉尘导致设备污染', 'cat_environment', true, NOW(), NOW()),
  ('reason_env_vibration', '外部振动', '外部震动源对设备的影响', 'cat_environment', true, NOW(), NOW()),
  ('reason_env_corrosion', '腐蚀影响', '环境腐蚀性物质的影响', 'cat_environment', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "updatedAt" = NOW();

-- 插入磨损老化相关原因
INSERT INTO reasons (id, name, description, "categoryId", "isActive", "createdAt", "updatedAt") VALUES
  ('reason_wear_normal', '正常磨损', '设备正常使用产生的磨损', 'cat_wear', true, NOW(), NOW()),
  ('reason_wear_fatigue', '疲劳损坏', '长期使用导致的疲劳破坏', 'cat_wear', true, NOW(), NOW()),
  ('reason_wear_aging', '材料老化', '材料自然老化和性能下降', 'cat_wear', true, NOW(), NOW()),
  ('reason_wear_excessive', '过度磨损', '超出正常范围的过度磨损', 'cat_wear', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "updatedAt" = NOW();

-- 插入其他问题相关原因
INSERT INTO reasons (id, name, description, "categoryId", "isActive", "createdAt", "updatedAt") VALUES
  ('reason_other_unknown', '原因不明', '暂时无法确定具体原因', 'cat_other', true, NOW(), NOW()),
  ('reason_other_external', '外部因素', '外部供应商或第三方因素', 'cat_other', true, NOW(), NOW()),
  ('reason_other_design', '设计缺陷', '设备设计存在的问题', 'cat_other', true, NOW(), NOW()),
  ('reason_other_material', '材料问题', '原材料质量或规格问题', 'cat_other', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "updatedAt" = NOW();

-- 验证插入结果
SELECT 
  c.name as category_name,
  COUNT(r.id) as reason_count
FROM categories c
LEFT JOIN reasons r ON c.id = r."categoryId"
WHERE c."isActive" = true
GROUP BY c.id, c.name
ORDER BY c.name;
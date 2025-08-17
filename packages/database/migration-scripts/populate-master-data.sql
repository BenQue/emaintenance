-- Migration script to populate master data tables with existing enum values
-- This ensures backward compatibility when transitioning from enums to configurable tables

-- Populate Categories table (from hardcoded work order categories)
INSERT INTO categories (id, name, description, "isActive", "createdAt", "updatedAt") VALUES
  ('category_mechanical', 'Mechanical Maintenance', 'Mechanical equipment maintenance and repairs', true, NOW(), NOW()),
  ('category_electrical', 'Electrical Maintenance', 'Electrical system maintenance and repairs', true, NOW(), NOW()),
  ('category_software', 'Software Issues', 'Software-related maintenance and updates', true, NOW(), NOW()),
  ('category_preventive', 'Preventive Maintenance', 'Scheduled preventive maintenance tasks', true, NOW(), NOW()),
  ('category_emergency', 'Emergency Repair', 'Emergency breakdown repairs', true, NOW(), NOW()),
  ('category_inspection', 'Inspection', 'Equipment inspection and assessment', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Populate Locations table (from common asset locations)
INSERT INTO locations (id, name, description, "isActive", "createdAt", "updatedAt") VALUES
  ('location_workshop', 'Workshop', 'Main workshop area', true, NOW(), NOW()),
  ('location_warehouse', 'Warehouse', 'Storage and inventory area', true, NOW(), NOW()),
  ('location_production_a', 'Production Line A', 'Primary production line', true, NOW(), NOW()),
  ('location_production_b', 'Production Line B', 'Secondary production line', true, NOW(), NOW()),
  ('location_office', 'Office Building', 'Administrative office areas', true, NOW(), NOW()),
  ('location_outdoor', 'Outdoor Facilities', 'External facilities and equipment', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Populate FaultCodeMaster table (from existing FaultCode enum)
INSERT INTO fault_codes (id, name, description, "isActive", "createdAt", "updatedAt") VALUES
  ('fault_mechanical_failure', 'MECHANICAL_FAILURE', '机械故障', true, NOW(), NOW()),
  ('fault_electrical_failure', 'ELECTRICAL_FAILURE', '电气故障', true, NOW(), NOW()),
  ('fault_software_issue', 'SOFTWARE_ISSUE', '软件问题', true, NOW(), NOW()),
  ('fault_wear_and_tear', 'WEAR_AND_TEAR', '磨损老化', true, NOW(), NOW()),
  ('fault_user_error', 'USER_ERROR', '操作错误', true, NOW(), NOW()),
  ('fault_preventive_maintenance', 'PREVENTIVE_MAINTENANCE', '预防性维护', true, NOW(), NOW()),
  ('fault_external_factor', 'EXTERNAL_FACTOR', '外部因素', true, NOW(), NOW()),
  ('fault_other', 'OTHER', '其他', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Populate Reasons table (common work order reasons)
INSERT INTO reasons (id, name, description, "isActive", "createdAt", "updatedAt") VALUES
  ('reason_breakdown', 'Equipment Breakdown', 'Equipment has failed and requires repair', true, NOW(), NOW()),
  ('reason_scheduled', 'Scheduled Maintenance', 'Regular scheduled maintenance task', true, NOW(), NOW()),
  ('reason_safety', 'Safety Concern', 'Safety-related maintenance or repair', true, NOW(), NOW()),
  ('reason_performance', 'Performance Issue', 'Equipment not performing to specifications', true, NOW(), NOW()),
  ('reason_upgrade', 'Upgrade/Modification', 'Equipment upgrade or modification', true, NOW(), NOW()),
  ('reason_inspection', 'Inspection Required', 'Regulatory or routine inspection', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Populate PriorityLevel table (from existing Priority enum)
INSERT INTO priority_levels (id, name, description, level, "isActive", "createdAt", "updatedAt") VALUES
  ('priority_low', 'LOW', 'Low priority - can be scheduled normally', 1, true, NOW(), NOW()),
  ('priority_medium', 'MEDIUM', 'Medium priority - should be addressed soon', 2, true, NOW(), NOW()),
  ('priority_high', 'HIGH', 'High priority - requires prompt attention', 3, true, NOW(), NOW()),
  ('priority_urgent', 'URGENT', 'Urgent priority - immediate action required', 4, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
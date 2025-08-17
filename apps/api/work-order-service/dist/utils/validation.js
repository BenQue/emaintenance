"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSVExportQuerySchema = exports.CreateResolutionRecordSchema = exports.IdParamSchema = exports.FileUploadSchema = exports.UpdateWorkOrderStatusSchema = exports.AssignWorkOrderSchema = exports.WorkOrderQuerySchema = exports.UpdateWorkOrderSchema = exports.CreateWorkOrderSchema = exports.FaultCodeSchema = exports.WorkOrderStatusSchema = exports.PrioritySchema = void 0;
const zod_1 = require("zod");
const database_1 = require("@emaintenance/database");
// Enum validation schemas
exports.PrioritySchema = zod_1.z.nativeEnum(database_1.Priority);
exports.WorkOrderStatusSchema = zod_1.z.nativeEnum(database_1.WorkOrderStatus);
exports.FaultCodeSchema = zod_1.z.nativeEnum(database_1.FaultCode);
// Create work order request validation
exports.CreateWorkOrderSchema = zod_1.z.object({
    title: zod_1.z.string()
        .min(5, '工单标题至少需要5个字符')
        .max(200, '工单标题不能超过200个字符'),
    description: zod_1.z.string()
        .max(2000, '描述不能超过2000个字符')
        .optional(),
    category: zod_1.z.string()
        .min(1, '请选择报修类别')
        .max(100, '类别名称过长'),
    reason: zod_1.z.string()
        .min(1, '请选择报修原因')
        .max(100, '原因描述过长'),
    location: zod_1.z.string()
        .max(200, '位置描述过长')
        .optional(),
    priority: exports.PrioritySchema.default(database_1.Priority.MEDIUM),
    assetId: zod_1.z.string()
        .min(1, '设备ID不能为空')
        .optional(),
    attachments: zod_1.z.array(zod_1.z.string().min(1, '附件路径不能为空'))
        .max(10, '最多只能上传10个附件')
        .optional()
        .default([]),
});
// Update work order request validation
exports.UpdateWorkOrderSchema = zod_1.z.object({
    title: zod_1.z.string()
        .min(5, '工单标题至少需要5个字符')
        .max(200, '工单标题不能超过200个字符')
        .optional(),
    description: zod_1.z.string()
        .min(10, '描述至少需要10个字符')
        .max(2000, '描述不能超过2000个字符')
        .optional(),
    category: zod_1.z.string()
        .min(1, '请选择报修类别')
        .max(100, '类别名称过长')
        .optional(),
    reason: zod_1.z.string()
        .min(1, '请选择报修原因')
        .max(100, '原因描述过长')
        .optional(),
    location: zod_1.z.string()
        .max(200, '位置描述过长')
        .optional(),
    priority: exports.PrioritySchema.optional(),
    status: exports.WorkOrderStatusSchema.optional(),
    solution: zod_1.z.string()
        .max(2000, '解决方案描述过长')
        .optional(),
    faultCode: zod_1.z.string()
        .max(50, '故障代码过长')
        .optional(),
    assignedToId: zod_1.z.string()
        .min(1, '分配用户ID不能为空')
        .optional(),
    attachments: zod_1.z.array(zod_1.z.string().min(1, '附件路径不能为空'))
        .max(10, '最多只能上传10个附件')
        .optional(),
});
// Query parameters validation
exports.WorkOrderQuerySchema = zod_1.z.object({
    page: zod_1.z.string()
        .transform(val => parseInt(val, 10))
        .refine(val => val > 0, '页码必须大于0')
        .optional()
        .default('1'),
    limit: zod_1.z.string()
        .transform(val => parseInt(val, 10))
        .refine(val => val > 0 && val <= 100, '每页条数必须在1-100之间')
        .optional()
        .default('20'),
    status: zod_1.z.union([
        exports.WorkOrderStatusSchema,
        zod_1.z.enum(['NOT_COMPLETED', 'ACTIVE']) // Support special filter statuses (ACTIVE for backward compatibility)
    ]).optional(),
    priority: exports.PrioritySchema.optional(),
    assetId: zod_1.z.string().optional(),
    createdById: zod_1.z.string().optional(),
    assignedToId: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    startDate: zod_1.z.string()
        .datetime('开始日期格式无效')
        .transform(val => new Date(val))
        .optional(),
    endDate: zod_1.z.string()
        .datetime('结束日期格式无效')
        .transform(val => new Date(val))
        .optional(),
    search: zod_1.z.string()
        .max(200, '搜索词不能超过200个字符')
        .optional(),
    sortBy: zod_1.z.enum(['reportedAt', 'completedAt', 'title', 'priority', 'status'])
        .optional()
        .default('reportedAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc'])
        .optional()
        .default('desc'),
});
// Assignment validation
exports.AssignWorkOrderSchema = zod_1.z.object({
    assignedToId: zod_1.z.string()
        .min(1, '分配用户ID不能为空'),
});
// Status update validation
exports.UpdateWorkOrderStatusSchema = zod_1.z.object({
    status: exports.WorkOrderStatusSchema,
    notes: zod_1.z.string()
        .max(500, '备注不能超过500个字符')
        .optional(),
});
// File upload validation
exports.FileUploadSchema = zod_1.z.object({
    workOrderId: zod_1.z.string()
        .min(1, '工单ID不能为空'),
});
// Common ID parameter validation
exports.IdParamSchema = zod_1.z.object({
    id: zod_1.z.string()
        .min(1, 'ID不能为空'),
});
// Resolution record validation
exports.CreateResolutionRecordSchema = zod_1.z.object({
    solutionDescription: zod_1.z.string()
        .min(10, '解决方案描述至少需要10个字符')
        .max(2000, '解决方案描述不能超过2000个字符'),
    faultCode: exports.FaultCodeSchema.optional(),
    photos: zod_1.z.array(zod_1.z.string())
        .max(5, '最多只能上传5张照片')
        .optional(),
});
// CSV Export validation
exports.CSVExportQuerySchema = zod_1.z.object({
    // All the same filters as WorkOrderQuerySchema but without pagination
    status: exports.WorkOrderStatusSchema.optional(),
    priority: exports.PrioritySchema.optional(),
    assetId: zod_1.z.string().optional(),
    createdById: zod_1.z.string().optional(),
    assignedToId: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    startDate: zod_1.z.string()
        .datetime('开始日期格式无效')
        .transform(val => new Date(val))
        .optional(),
    endDate: zod_1.z.string()
        .datetime('结束日期格式无效')
        .transform(val => new Date(val))
        .optional(),
    search: zod_1.z.string()
        .max(200, '搜索词不能超过200个字符')
        .optional(),
    sortBy: zod_1.z.enum(['reportedAt', 'completedAt', 'title', 'priority', 'status'])
        .optional()
        .default('reportedAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc'])
        .optional()
        .default('desc'),
    columns: zod_1.z.string()
        .optional()
        .transform(val => val ? val.split(',').map(col => col.trim()) : undefined),
});

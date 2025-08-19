import { z } from 'zod';
import { Priority, WorkOrderStatus, FaultCode } from '@emaintenance/database';

// Enum validation schemas
export const PrioritySchema = z.nativeEnum(Priority);
export const WorkOrderStatusSchema = z.nativeEnum(WorkOrderStatus);
export const FaultCodeSchema = z.nativeEnum(FaultCode);

// Create work order request validation
export const CreateWorkOrderSchema = z.object({
  title: z.string()
    .min(5, '工单标题至少需要5个字符')
    .max(200, '工单标题不能超过200个字符'),
  
  description: z.string()
    .max(2000, '描述不能超过2000个字符')
    .optional(),
  
  category: z.string()
    .min(1, '请选择报修类别')
    .max(100, '类别名称过长'),
  
  reason: z.string()
    .min(1, '请选择报修原因')
    .max(100, '原因描述过长'),
  
  // New fields for integrated categories and reasons
  categoryId: z.string()
    .min(1, '分类ID不能为空')
    .optional(),
  
  reasonId: z.string()
    .min(1, '原因ID不能为空')
    .optional(),
  
  location: z.string()
    .max(200, '位置描述过长')
    .optional(),
  
  priority: PrioritySchema.default(Priority.MEDIUM),
  
  assetId: z.string()
    .min(1, '设备ID不能为空')
    .optional(),
  
  attachments: z.array(z.string().min(1, '附件路径不能为空'))
    .max(10, '最多只能上传10个附件')
    .optional()
    .default([]),
});

// Create work order multipart form validation (when files are uploaded)
export const CreateWorkOrderMultipartSchema = z.object({
  title: z.string()
    .min(5, '工单标题至少需要5个字符')
    .max(200, '工单标题不能超过200个字符'),
  
  description: z.string()
    .max(2000, '描述不能超过2000个字符')
    .optional()
    .default(''),
  
  category: z.string()
    .min(1, '请选择报修类别')
    .max(100, '类别名称过长'),
  
  reason: z.string()
    .min(1, '请选择报修原因')
    .max(100, '原因描述过长'),
  
  // New fields for integrated categories and reasons
  categoryId: z.string()
    .min(1, '分类ID不能为空')
    .optional(),
  
  reasonId: z.string()
    .min(1, '原因ID不能为空')
    .optional(),
  
  location: z.string()
    .max(200, '位置描述过长')
    .optional()
    .default(''),
  
  priority: PrioritySchema.default(Priority.MEDIUM),
  
  assetId: z.string()
    .min(1, '设备ID不能为空'),
  
  // For multipart form data, files are handled separately via req.files
  // No need to validate attachments in the body schema
});

// Update work order request validation
export const UpdateWorkOrderSchema = z.object({
  title: z.string()
    .min(5, '工单标题至少需要5个字符')
    .max(200, '工单标题不能超过200个字符')
    .optional(),
  
  description: z.string()
    .min(10, '描述至少需要10个字符')
    .max(2000, '描述不能超过2000个字符')
    .optional(),
  
  category: z.string()
    .min(1, '请选择报修类别')
    .max(100, '类别名称过长')
    .optional(),
  
  reason: z.string()
    .min(1, '请选择报修原因')
    .max(100, '原因描述过长')
    .optional(),
  
  location: z.string()
    .max(200, '位置描述过长')
    .optional(),
  
  priority: PrioritySchema.optional(),
  
  status: WorkOrderStatusSchema.optional(),
  
  solution: z.string()
    .max(2000, '解决方案描述过长')
    .optional(),
  
  faultCode: z.string()
    .max(50, '故障代码过长')
    .optional(),
  
  assignedToId: z.string()
    .min(1, '分配用户ID不能为空')
    .optional(),
  
  attachments: z.array(z.string().min(1, '附件路径不能为空'))
    .max(10, '最多只能上传10个附件')
    .optional(),
});

// Query parameters validation
export const WorkOrderQuerySchema = z.object({
  page: z.string()
    .default('1')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0, '页码必须大于0')
    .optional(),
  
  limit: z.string()
    .default('20')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0 && val <= 100, '每页条数必须在1-100之间')
    .optional(),
  
  status: z.union([
    WorkOrderStatusSchema,
    z.enum(['NOT_COMPLETED', 'ACTIVE']) // Support special filter statuses (ACTIVE for backward compatibility)
  ]).optional(),
  
  priority: PrioritySchema.optional(),
  
  assetId: z.string().optional(),
  
  createdById: z.string().optional(),
  
  assignedToId: z.string().optional(),
  
  category: z.string().optional(),
  
  startDate: z.string()
    .datetime('开始日期格式无效')
    .transform(val => new Date(val))
    .optional(),
  
  endDate: z.string()
    .datetime('结束日期格式无效')
    .transform(val => new Date(val))
    .optional(),
  
  search: z.string()
    .max(200, '搜索词不能超过200个字符')
    .optional(),
  
  sortBy: z.enum(['reportedAt', 'completedAt', 'title', 'priority', 'status'])
    .optional()
    .default('reportedAt'),
  
  sortOrder: z.enum(['asc', 'desc'])
    .optional()
    .default('desc'),
});

// Assignment validation
export const AssignWorkOrderSchema = z.object({
  assignedToId: z.string()
    .min(1, '分配用户ID不能为空'),
});

// Status update validation
export const UpdateWorkOrderStatusSchema = z.object({
  status: WorkOrderStatusSchema,
  notes: z.string()
    .max(500, '备注不能超过500个字符')
    .optional(),
});

// File upload validation
export const FileUploadSchema = z.object({
  workOrderId: z.string()
    .min(1, '工单ID不能为空'),
});

// Common ID parameter validation
export const IdParamSchema = z.object({
  id: z.string()
    .min(1, 'ID不能为空'),
});

// Export types for TypeScript
export type CreateWorkOrderInput = z.infer<typeof CreateWorkOrderSchema>;
export type CreateWorkOrderMultipartInput = z.infer<typeof CreateWorkOrderMultipartSchema>;
export type UpdateWorkOrderInput = z.infer<typeof UpdateWorkOrderSchema>;
export type WorkOrderQueryInput = z.infer<typeof WorkOrderQuerySchema>;
export type AssignWorkOrderInput = z.infer<typeof AssignWorkOrderSchema>;
export type UpdateWorkOrderStatusInput = z.infer<typeof UpdateWorkOrderStatusSchema>;
export type FileUploadInput = z.infer<typeof FileUploadSchema>;
export type IdParamInput = z.infer<typeof IdParamSchema>;

// Resolution record validation
export const CreateResolutionRecordSchema = z.object({
  solutionDescription: z.string()
    .min(10, '解决方案描述至少需要10个字符')
    .max(2000, '解决方案描述不能超过2000个字符'),
  
  faultCode: FaultCodeSchema.optional(),
  
  photos: z.array(z.string())
    .max(5, '最多只能上传5张照片')
    .optional(),
});

export type CreateResolutionRecordInput = z.infer<typeof CreateResolutionRecordSchema>;

// CSV Export validation
export const CSVExportQuerySchema = z.object({
  // All the same filters as WorkOrderQuerySchema but without pagination
  status: WorkOrderStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  assetId: z.string().optional(),
  createdById: z.string().optional(),
  assignedToId: z.string().optional(),
  category: z.string().optional(),
  startDate: z.string()
    .datetime('开始日期格式无效')
    .transform(val => new Date(val))
    .optional(),
  endDate: z.string()
    .datetime('结束日期格式无效')
    .transform(val => new Date(val))
    .optional(),
  search: z.string()
    .max(200, '搜索词不能超过200个字符')
    .optional(),
  sortBy: z.enum(['reportedAt', 'completedAt', 'title', 'priority', 'status'])
    .optional()
    .default('reportedAt'),
  sortOrder: z.enum(['asc', 'desc'])
    .optional()
    .default('desc'),
  columns: z.string()
    .optional()
    .transform(val => val ? val.split(',').map(col => col.trim()) : undefined),
});

export type CSVExportQueryInput = z.infer<typeof CSVExportQuerySchema>;
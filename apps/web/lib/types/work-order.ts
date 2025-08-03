export enum WorkOrderStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_PARTS = 'WAITING_PARTS',
  WAITING_EXTERNAL = 'WAITING_EXTERNAL',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum FaultCode {
  MECHANICAL_FAILURE = 'MECHANICAL_FAILURE',
  ELECTRICAL_FAILURE = 'ELECTRICAL_FAILURE',
  SOFTWARE_ISSUE = 'SOFTWARE_ISSUE',
  WEAR_AND_TEAR = 'WEAR_AND_TEAR',
  USER_ERROR = 'USER_ERROR',
  PREVENTIVE_MAINTENANCE = 'PREVENTIVE_MAINTENANCE',
  EXTERNAL_FACTOR = 'EXTERNAL_FACTOR',
  OTHER = 'OTHER',
}

export interface Asset {
  id: string;
  assetCode: string;
  name: string;
  location: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  category: string;
  reason: string;
  location?: string | null;
  priority: Priority;
  status: WorkOrderStatus;
  reportedAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  solution?: string | null;
  faultCode?: string | null;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
  assetId: string;
  createdById: string;
  assignedToId?: string | null;
  asset: Asset;
  createdBy: User;
  assignedTo?: User | null;
}

export interface WorkOrderStatusHistoryItem {
  id: string;
  workOrderId: string;
  fromStatus?: WorkOrderStatus | null;
  toStatus: WorkOrderStatus;
  changedById: string;
  changedBy: User;
  notes?: string | null;
  createdAt: Date;
}

export interface WorkOrderWithStatusHistory extends WorkOrder {
  statusHistory: WorkOrderStatusHistoryItem[];
}

export interface UpdateWorkOrderStatusRequest {
  status: WorkOrderStatus;
  notes?: string;
}

export interface PaginatedWorkOrders {
  workOrders: WorkOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ResolutionPhoto {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface ResolutionRecord {
  id: string;
  workOrderId: string;
  solutionDescription: string;
  faultCode?: FaultCode | null;
  resolvedById: string;
  resolvedBy: User;
  photos: ResolutionPhoto[];
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkOrderWithResolution extends WorkOrder {
  resolutionRecord?: ResolutionRecord | null;
}

export interface CreateResolutionRequest {
  solutionDescription: string;
  faultCode?: FaultCode;
  photos?: string[];
}

export interface MaintenanceHistoryItem {
  id: string;
  assetId: string;
  workOrderId: string;
  workOrderTitle: string;
  resolutionSummary?: string | null;
  faultCode?: FaultCode | null;
  technician: string;
  completedAt: Date;
  createdAt: Date;
}

export interface AssetMaintenanceHistory {
  assetId: string;
  assetCode: string;
  assetName: string;
  maintenanceHistory: MaintenanceHistoryItem[];
  totalRecords: number;
}

export const WorkOrderStatusLabels = {
  [WorkOrderStatus.PENDING]: '待处理',
  [WorkOrderStatus.IN_PROGRESS]: '进行中',
  [WorkOrderStatus.WAITING_PARTS]: '等待备件',
  [WorkOrderStatus.WAITING_EXTERNAL]: '等待外部',
  [WorkOrderStatus.COMPLETED]: '已完成',
  [WorkOrderStatus.CANCELLED]: '已取消',
};

export const PriorityLabels = {
  [Priority.LOW]: '低',
  [Priority.MEDIUM]: '中',
  [Priority.HIGH]: '高',
  [Priority.URGENT]: '紧急',
};

export const StatusColors = {
  [WorkOrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [WorkOrderStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [WorkOrderStatus.WAITING_PARTS]: 'bg-orange-100 text-orange-800',
  [WorkOrderStatus.WAITING_EXTERNAL]: 'bg-purple-100 text-purple-800',
  [WorkOrderStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [WorkOrderStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
};

export const PriorityColors = {
  [Priority.LOW]: 'bg-gray-100 text-gray-800',
  [Priority.MEDIUM]: 'bg-blue-100 text-blue-800',
  [Priority.HIGH]: 'bg-orange-100 text-orange-800',
  [Priority.URGENT]: 'bg-red-100 text-red-800',
};

export const FaultCodeLabels = {
  [FaultCode.MECHANICAL_FAILURE]: '机械故障',
  [FaultCode.ELECTRICAL_FAILURE]: '电气故障',
  [FaultCode.SOFTWARE_ISSUE]: '软件问题',
  [FaultCode.WEAR_AND_TEAR]: '磨损老化',
  [FaultCode.USER_ERROR]: '操作错误',
  [FaultCode.PREVENTIVE_MAINTENANCE]: '预防性维护',
  [FaultCode.EXTERNAL_FACTOR]: '外部因素',
  [FaultCode.OTHER]: '其他',
};
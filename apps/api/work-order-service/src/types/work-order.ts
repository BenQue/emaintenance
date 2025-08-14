import { Priority, WorkOrderStatus, FaultCode } from '@emaintenance/database';

export interface CreateWorkOrderRequest {
  title: string;
  description: string;
  category: string;
  reason: string;
  location?: string;
  priority: Priority;
  assetId: string;
  attachments?: string[];
}

export interface UpdateWorkOrderRequest {
  title?: string;
  description?: string;
  category?: string;
  reason?: string;
  location?: string;
  priority?: Priority;
  status?: WorkOrderStatus;
  solution?: string;
  faultCode?: string;
  assignedToId?: string;
  attachments?: string[];
}

export interface WorkOrderWithRelations {
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
  asset: {
    id: string;
    assetCode: string;
    name: string;
    location: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  photos?: WorkOrderPhoto[];
}

export interface WorkOrderFilters {
  status?: WorkOrderStatus;
  priority?: Priority;
  assetId?: string;
  createdById?: string;
  assignedToId?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string; // Full-text search across title, description, and resolution
  sortBy?: 'reportedAt' | 'completedAt' | 'title' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedWorkOrders {
  workOrders: WorkOrderWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateWorkOrderStatusRequest {
  status: WorkOrderStatus;
  notes?: string;
}

export interface WorkOrderStatusHistoryItem {
  id: string;
  workOrderId: string;
  fromStatus?: WorkOrderStatus | null;
  toStatus: WorkOrderStatus;
  changedById: string;
  changedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  notes?: string | null;
  createdAt: Date;
}

export interface WorkOrderWithStatusHistory extends WorkOrderWithRelations {
  statusHistory: WorkOrderStatusHistoryItem[];
}

export interface CreateResolutionRecordRequest {
  solutionDescription: string;
  faultCode?: FaultCode;
  photos?: string[]; // File paths for uploaded photos
}

export interface ResolutionRecordResponse {
  id: string;
  workOrderId: string;
  solutionDescription: string;
  faultCode?: FaultCode | null;
  resolvedById: string;
  resolvedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  photos: ResolutionPhotoResponse[];
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolutionPhotoResponse {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface WorkOrderWithResolution extends WorkOrderWithRelations {
  resolutionRecord?: ResolutionRecordResponse | null;
}

export interface MaintenanceHistoryResponse {
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
  maintenanceHistory: MaintenanceHistoryResponse[];
  totalRecords: number;
}

export interface MTTRStatistics {
  averageMTTR: number; // in hours
  mttrTrend: {
    period: string;
    mttr: number;
  }[];
  byPriority: {
    priority: Priority;
    mttr: number;
  }[];
  byCategory: {
    category: string;
    mttr: number;
  }[];
}

export interface WorkOrderTrends {
  creationTrend: {
    date: string;
    count: number;
  }[];
  completionTrend: {
    date: string;
    count: number;
  }[];
  averageResolutionTime: {
    date: string;
    hours: number;
  }[];
}

export interface KPIFilters extends WorkOrderFilters {
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  granularity?: 'day' | 'week' | 'month';
}

export interface FilterOptionsResponse {
  statuses: WorkOrderStatus[];
  priorities: Priority[];
  categories: string[];
  assets: {
    id: string;
    assetCode: string;
    name: string;
  }[];
  users: {
    id: string;
    name: string;
    role: string;
  }[];
}

export interface CSVExportRequest {
  filters?: WorkOrderFilters;
  columns?: string[];
}

export interface WorkOrderForCSV {
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
  assetCode: string;
  assetName: string;
  createdBy: string;
  assignedTo?: string | null;
  resolutionDescription?: string | null;
}

// Photo-related types
export interface WorkOrderPhoto {
  id: string;
  workOrderId: string;
  filename: string;
  originalName: string;
  filePath: string;
  thumbnailPath: string | null;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface PhotoUploadRequest {
  photos: Express.Multer.File[];
}

export interface PhotoUploadResponse {
  workOrder: WorkOrderWithRelations;
  uploadedPhotos: WorkOrderPhoto[];
}

export interface PhotoListResponse {
  photos: WorkOrderPhoto[];
}
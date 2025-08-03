import { Priority, WorkOrderStatus } from '@emaintanance/database';

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
}

export interface PaginatedWorkOrders {
  workOrders: WorkOrderWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
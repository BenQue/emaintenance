import {
  WorkOrder,
  WorkOrderWithStatusHistory,
  WorkOrderStatusHistoryItem,
  UpdateWorkOrderStatusRequest,
  PaginatedWorkOrders,
} from '../types/work-order';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

class WorkOrderService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  }

  async getAssignedWorkOrders(page: number = 1, limit: number = 20): Promise<PaginatedWorkOrders> {
    return this.request<PaginatedWorkOrders>(
      `/api/work-orders/assigned?page=${page}&limit=${limit}`
    );
  }

  async getWorkOrderById(id: string): Promise<WorkOrder> {
    return this.request<WorkOrder>(`/api/work-orders/${id}`);
  }

  async getWorkOrderWithHistory(id: string): Promise<WorkOrderWithStatusHistory> {
    return this.request<WorkOrderWithStatusHistory>(`/api/work-orders/${id}/history`);
  }

  async getWorkOrderStatusHistory(id: string): Promise<WorkOrderStatusHistoryItem[]> {
    const response = await this.request<{ statusHistory: WorkOrderStatusHistoryItem[] }>(
      `/api/work-orders/${id}/status-history`
    );
    return response.statusHistory;
  }

  async updateWorkOrderStatus(
    id: string,
    statusUpdate: UpdateWorkOrderStatusRequest
  ): Promise<WorkOrder> {
    return this.request<WorkOrder>(`/api/work-orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusUpdate),
    });
  }

  async getMyWorkOrders(
    type: 'created' | 'assigned' = 'assigned',
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedWorkOrders> {
    return this.request<PaginatedWorkOrders>(
      `/api/work-orders/my?type=${type}&page=${page}&limit=${limit}`
    );
  }

  async getAllWorkOrders(
    filters: {
      status?: string;
      priority?: string;
      assetId?: string;
      createdById?: string;
      assignedToId?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
    } = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedWorkOrders> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
      ),
    });

    return this.request<PaginatedWorkOrders>(
      `/api/work-orders?${queryParams}`
    );
  }

  async getWorkOrderStatistics(
    filters: {
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    averageResolutionTime: number | null;
  }> {
    const queryParams = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
      )
    );

    const response = await this.request<{
      statistics: {
        total: number;
        byStatus: Record<string, number>;
        byPriority: Record<string, number>;
        averageResolutionTime: number | null;
      };
    }>(`/api/work-orders/statistics?${queryParams}`);
    
    return response.statistics;
  }
}

export const workOrderService = new WorkOrderService();
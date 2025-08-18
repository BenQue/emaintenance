import {
  WorkOrder,
  WorkOrderWithStatusHistory,
  WorkOrderStatusHistoryItem,
  UpdateWorkOrderStatusRequest,
  PaginatedWorkOrders,
  WorkOrderWithResolution,
  CreateResolutionRequest,
  ResolutionRecord,
  AssetMaintenanceHistory,
  Priority,
} from '../types/work-order';

const API_BASE_URL = process.env.NEXT_PUBLIC_WORK_ORDER_SERVICE_URL || 'http://localhost:3002';

interface CreateWorkOrderData {
  assetId: string;
  title: string;
  category: string;
  reason: string;
  location?: string;
  priority: Priority;
  description?: string;
  photos?: File[];
  // New fields for integrated categories and reasons
  categoryId?: string;
  reasonId?: string;
}

class WorkOrderService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      throw new Error('认证token不存在，请重新登录');
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: `HTTP error! status: ${response.status}` 
      }));
      
      // Handle authentication errors specifically
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('auth_token');
        throw new Error('认证已过期，请重新登录');
      }
      
      if (response.status === 404 && errorData.message?.includes('工单不存在')) {
        throw new Error('工单不存在或无访问权限');
      }
      
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
      search?: string;
      sortBy?: string;
      sortOrder?: string;
    } = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedWorkOrders> {
    const queryParams = new URLSearchParams();
    
    // Add all filters, handle status separately for undefined case
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'status') {
        // Only add status if it has a value (undefined means no status filter = all orders)
        if (value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      } else if (value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    // Add pagination
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    
    const url = `/api/work-orders?${queryParams.toString()}`;
    // Debug URL construction in development
    if (process.env.NODE_ENV === 'development') {
    }
    
    return this.request<PaginatedWorkOrders>(url);
  }

  async getWorkOrderById(id: string): Promise<WorkOrder> {
    return this.request<WorkOrder>(`/api/work-orders/${id}`);
  }

  async createWorkOrder(workOrderData: CreateWorkOrderData): Promise<WorkOrder> {
    // Debug work order creation in development
    if (process.env.NODE_ENV === 'development') {
    }
    const token = localStorage.getItem('auth_token');
    
    const { photos, ...formData } = workOrderData;
    
    if (photos && photos.length > 0) {
      // Handle multipart form data when photos are included
      const formDataObj = new FormData();
      
      // Add form fields
      formDataObj.append('assetId', formData.assetId);
      formDataObj.append('title', formData.title);
      formDataObj.append('category', formData.category);
      formDataObj.append('reason', formData.reason);
      formDataObj.append('priority', formData.priority);
      if (formData.location) {
        formDataObj.append('location', formData.location);
      }
      if (formData.description) {
        formDataObj.append('description', formData.description);
      }
      
      // Add photos
      photos.forEach((photo) => {
        formDataObj.append('attachments', photo);
      });

      try {
        const response = await fetch(`${API_BASE_URL}/api/work-orders`, {
          method: 'POST',
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: formDataObj,
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Network error' }));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.data || data;
      } catch (error) {
        throw error;
      }
    } else {
      // Handle JSON request when no photos
      return this.request<WorkOrder>('/api/work-orders', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
    }
  }

  async getWorkOrderWithHistory(id: string): Promise<WorkOrderWithStatusHistory> {
    // Debug work order history retrieval in development
    if (process.env.NODE_ENV === 'development') {
    }
    const result = await this.request<{workOrder: WorkOrderWithStatusHistory}>(`/api/work-orders/${id}/history`);
    const workOrder = result.workOrder;
    if (process.env.NODE_ENV === 'development') {
      // Log removed for production
        id: workOrder?.id,
        title: workOrder?.title,
        assetId: workOrder?.asset?.id,
        assetName: workOrder?.asset?.name,
        statusHistoryCount: workOrder?.statusHistory?.length || 0,
      });
    }
    return workOrder;
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

  async completeWorkOrder(
    id: string,
    resolutionData: CreateResolutionRequest
  ): Promise<WorkOrderWithResolution> {
    return this.request<WorkOrderWithResolution>(`/api/work-orders/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(resolutionData),
    });
  }

  async getWorkOrderWithResolution(id: string): Promise<WorkOrderWithResolution> {
    const result = await this.request<{workOrder: WorkOrderWithResolution}>(`/api/work-orders/${id}/resolution`);
    return result.workOrder;
  }

  async uploadResolutionPhotos(
    id: string,
    photos: File[]
  ): Promise<{ resolutionRecord: ResolutionRecord; uploadedPhotos: string[] }> {
    const formData = new FormData();
    photos.forEach((photo) => {
      formData.append('attachments', photo);
    });

    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${API_BASE_URL}/api/work-orders/${id}/photos`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  }

  async getAssetMaintenanceHistory(
    assetId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<AssetMaintenanceHistory> {
    const response = await this.request<{ maintenanceHistory: AssetMaintenanceHistory }>(
      `/api/work-orders/assets/${assetId}/maintenance-history?page=${page}&limit=${limit}`
    );
    return response.maintenanceHistory;
  }

  // Statistics Methods
  async getStatistics(filters: {
    timeRange?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    return this.request<any>(`/api/work-orders/statistics?${params.toString()}`);
  }

  // KPI Methods
  async getMTTRStatistics(filters: {
    timeRange?: string;
    granularity?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    return this.request<any>(`/api/work-orders/kpi/mttr?${params.toString()}`);
  }

  async getWorkOrderTrends(filters: {
    timeRange?: string;
    granularity?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    return this.request<any>(`/api/work-orders/kpi/trends?${params.toString()}`);
  }

  // Advanced Filtering Methods
  async getFilterOptions(): Promise<{
    statuses: string[];
    priorities: string[];
    categories: string[];
    assets: { id: string; assetCode: string; name: string }[];
    users: { id: string; name: string; role: string }[];
  }> {
    try {
      return this.request('/api/work-orders/filter-options');
    } catch (error) {
      // Add specific error context for debugging
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load filter options: ${message}`);
    }
  }

  async getFormOptions(): Promise<{
    categories: string[];
    reasons: string[];
    commonLocations: string[];
  }> {
    try {
      // Import SettingsService dynamically to avoid circular dependencies
      const { SettingsService } = await import('./settings-service');
      
      // Fetch dynamic master data from settings service
      const [categoriesResponse, reasonsResponse, locationsResponse] = await Promise.all([
        SettingsService.getCategories({ isActive: true, limit: 100 }).catch(() => ({ items: [] })),
        SettingsService.getReasons({ isActive: true, limit: 100 }).catch(() => ({ items: [] })),
        SettingsService.getLocations({ isActive: true, limit: 100 }).catch(() => ({ items: [] })),
      ]);
      
      return {
        categories: categoriesResponse.items.length > 0 
          ? categoriesResponse.items.map(cat => cat.name)
          : ['设备故障', '预防性维护', '常规检查', '清洁维护'],
        reasons: reasonsResponse.items.length > 0
          ? reasonsResponse.items.map(reason => reason.name)
          : ['机械故障', '电气故障', '软件问题', '磨损老化', '操作错误', '外部因素'],
        commonLocations: locationsResponse.items.length > 0
          ? locationsResponse.items.map(loc => loc.name)
          : ['生产车间A', '生产车间B', '仓库区域', '办公区域', '设备机房'],
      };
    } catch (error) {
      // If API fails, return default options
      return {
        categories: ['设备故障', '预防性维护', '常规检查', '清洁维护'],
        reasons: ['机械故障', '电气故障', '软件问题', '磨损老化', '操作错误', '外部因素'],
        commonLocations: ['生产车间A', '生产车间B', '仓库区域', '办公区域', '设备机房'],
      };
    }
  }

  async exportWorkOrdersCSV(filters: {
    status?: string;
    priority?: string;
    assetId?: string;
    createdById?: string;
    assignedToId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    columns?: string;
  } = {}): Promise<void> {
    const queryParams = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => 
          value !== undefined && value !== '' && value !== 'ALL'
        )
      )
    );

    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${API_BASE_URL}/api/work-orders/export?${queryParams}`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // Download the CSV file
    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
      : 'work-orders-export.csv';

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async getWorkOrderPhotos(workOrderId: string): Promise<any[]> {
    try {
      const response = await this.request<{ photos: any[] }>(
        `/api/work-orders/${workOrderId}/work-order-photos`
      );
      return response.photos || [];
    } catch (error) {
      // Error handling: Failed to fetch work order photos
      throw error;
    }
  }

  getWorkOrderPhotoUrl(workOrderId: string, photoId: string): string {
    return `${API_BASE_URL}/api/work-orders/${workOrderId}/work-order-photos/${photoId}`;
  }

  getWorkOrderPhotoThumbnailUrl(workOrderId: string, photoId: string): string {
    return `${API_BASE_URL}/api/work-orders/${workOrderId}/work-order-photos/${photoId}/thumbnail`;
  }
}

export const workOrderService = new WorkOrderService();
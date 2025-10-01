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
  FaultSymptom,
} from '../types/work-order';
import { buildApiUrl, apiFetch } from '../config/api-config';

export interface CreateWorkOrderData {
  assetId: string;
  title: string;
  category: string; // Kept for backward compatibility
  reason: string; // Kept for backward compatibility
  location?: string;
  priority: Priority;
  description?: string;
  photos?: File[];
  // New fields for integrated categories and reasons
  categoryId?: string;
  reasonId?: string;
  // New fields from Story 2.4a (matching mobile implementation)
  faultSymptoms?: FaultSymptom[];
  additionalLocation?: string;
  productionInterrupted?: boolean;
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
    
    const url = buildApiUrl(endpoint, 'workOrder');
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        // 添加cache-control防止缓存问题
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...options.headers,
      },
      cache: 'no-store', // 防止浏览器缓存
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
    // Debug URL construction
    console.log('WorkOrderService.getAllWorkOrders - Input filters:', filters);
    console.log('WorkOrderService.getAllWorkOrders - Query params:', queryParams.toString());
    console.log('WorkOrderService.getAllWorkOrders - Final URL:', url);
    
    return this.request<PaginatedWorkOrders>(url);
  }

  async getWorkOrderById(id: string): Promise<WorkOrder> {
    return this.request<WorkOrder>(`/work-orders/${id}`);
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

      // Add new fields from Story 2.4a
      if (formData.faultSymptoms && formData.faultSymptoms.length > 0) {
        formDataObj.append('faultSymptoms', JSON.stringify(formData.faultSymptoms));
      }
      if (formData.productionInterrupted !== undefined) {
        formDataObj.append('productionInterrupted', formData.productionInterrupted.toString());
      }
      if (formData.additionalLocation) {
        formDataObj.append('additionalLocation', formData.additionalLocation);
      }

      // Existing fields
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
        const url = buildApiUrl('/work-orders', 'workOrder');
        const response = await fetch(url, {
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
      return this.request<WorkOrder>('/work-orders', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
    }
  }

  async getWorkOrderWithHistory(id: string): Promise<WorkOrderWithStatusHistory> {
    // Debug work order history retrieval in development
    const result = await this.request<{workOrder: WorkOrderWithStatusHistory}>(`/work-orders/${id}/history`);
    const workOrder = result.workOrder;
    return workOrder;
  }

  async getWorkOrderStatusHistory(id: string): Promise<WorkOrderStatusHistoryItem[]> {
    const response = await this.request<{ statusHistory: WorkOrderStatusHistoryItem[] }>(
      `/api/work-orders/${id}/history`
    );
    return response.statusHistory;
  }

  async updateWorkOrderStatus(
    id: string,
    statusUpdate: UpdateWorkOrderStatusRequest
  ): Promise<WorkOrder> {
    return this.request<WorkOrder>(`/work-orders/${id}/status`, {
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
    }>(`/api/work-orders/statistics/overview?${queryParams}`);
    
    return response.statistics;
  }

  async completeWorkOrder(
    id: string,
    resolutionData: CreateResolutionRequest
  ): Promise<WorkOrderWithResolution> {
    return this.request<WorkOrderWithResolution>(`/work-orders/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(resolutionData),
    });
  }

  async getWorkOrderWithResolution(id: string): Promise<WorkOrderWithResolution> {
    const result = await this.request<{workOrder: WorkOrderWithResolution}>(`/work-orders/${id}/resolution`);
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
    const url = buildApiUrl(`/work-orders/${id}/photos`, 'workOrder');
    
    const response = await fetch(url, {
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
    
    return this.request<any>(`/work-orders/statistics/overview?${params.toString()}`);
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
    
    return this.request<any>(`/work-orders/kpi/mttr?${params.toString()}`);
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
    
    return this.request<any>(`/work-orders/kpi/completion-rate?${params.toString()}`);
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
      return this.request('/work-orders/filter-options');
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
    const url = buildApiUrl(`/work-orders/export?${queryParams}`, 'workOrder');
    
    const response = await fetch(url, {
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

    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
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
    return buildApiUrl(`/work-orders/${workOrderId}/work-order-photos/${photoId}`, 'workOrder');
  }

  getWorkOrderPhotoThumbnailUrl(workOrderId: string, photoId: string): string {
    return buildApiUrl(`/work-orders/${workOrderId}/work-order-photos/${photoId}/thumbnail`, 'workOrder');
  }

  async deleteWorkOrder(id: string): Promise<void> {
    await this.request<void>(`/work-orders/${id}`, {
      method: 'DELETE',
    });
  }

  async updateWorkOrder(
    id: string,
    updateData: Partial<CreateWorkOrderData>
  ): Promise<WorkOrder> {
    return this.request<WorkOrder>(`/work-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async assignToMe(id: string): Promise<WorkOrder> {
    const response = await this.request<{ status: string; message: string; data: { workOrder: WorkOrder } }>(
      `/work-orders/${id}/assign-to-me`,
      {
        method: 'PUT',
      }
    );
    return response.data.workOrder;
  }
}

export const workOrderService = new WorkOrderService();
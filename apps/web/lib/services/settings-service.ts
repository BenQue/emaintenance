import { apiClient } from './api-client';

// Master Data types
export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  reasons?: Reason[];
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FaultCode {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Reason {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
}

export interface PriorityLevel {
  id: string;
  name: string;
  description?: string;
  level: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MasterDataCreateInput {
  name: string;
  description?: string;
  level?: number; // Only for PriorityLevel
  categoryId?: string; // For creating reasons with category association
}

export interface MasterDataUpdateInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  level?: number; // Only for PriorityLevel
}

export interface MasterDataListQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface MasterDataListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface UsageInfo {
  id: string;
  name: string;
  workOrderCount: number;
  assetCount?: number;
  resolutionRecordCount?: number;
  maintenanceHistoryCount?: number;
  canDelete: boolean;
}

// Settings Service
export class SettingsService {
  // Categories
  static async getCategories(query?: MasterDataListQuery): Promise<MasterDataListResponse<Category>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);
    if (query?.isActive !== undefined) params.append('isActive', query.isActive.toString());

    const response = await apiClient.get(`/api/settings/categories?${params.toString()}`);
    return response.data as MasterDataListResponse<Category>;
  }

  static async createCategory(data: MasterDataCreateInput): Promise<Category> {
    const response = await apiClient.post('/api/settings/categories', data);
    return response.data as Category;
  }

  static async updateCategory(id: string, data: MasterDataUpdateInput): Promise<Category> {
    const response = await apiClient.put(`/api/settings/categories/${id}`, data);
    return response.data as Category;
  }

  static async deleteCategory(id: string): Promise<Category> {
    const response = await apiClient.delete(`/api/settings/categories/${id}`);
    return response.data as Category;
  }

  static async getCategoryUsage(id: string): Promise<UsageInfo> {
    const response = await apiClient.get(`/api/settings/categories/${id}/usage`);
    return response.data as UsageInfo;
  }

  // Locations
  static async getLocations(query?: MasterDataListQuery): Promise<MasterDataListResponse<Location>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);
    if (query?.isActive !== undefined) params.append('isActive', query.isActive.toString());

    const response = await apiClient.get(`/api/settings/locations?${params.toString()}`);
    return response.data as MasterDataListResponse<Location>;
  }

  static async createLocation(data: MasterDataCreateInput): Promise<Location> {
    const response = await apiClient.post('/api/settings/locations', data);
    return response.data as Location;
  }

  static async updateLocation(id: string, data: MasterDataUpdateInput): Promise<Location> {
    const response = await apiClient.put(`/api/settings/locations/${id}`, data);
    return response.data as Location;
  }

  static async deleteLocation(id: string): Promise<Location> {
    const response = await apiClient.delete(`/api/settings/locations/${id}`);
    return response.data as Location;
  }

  static async getLocationUsage(id: string): Promise<UsageInfo> {
    const response = await apiClient.get(`/api/settings/locations/${id}/usage`);
    return response.data as UsageInfo;
  }

  // Fault Codes
  static async getFaultCodes(query?: MasterDataListQuery): Promise<MasterDataListResponse<FaultCode>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);
    if (query?.isActive !== undefined) params.append('isActive', query.isActive.toString());

    const response = await apiClient.get(`/api/settings/fault-codes?${params.toString()}`);
    return response.data as MasterDataListResponse<FaultCode>;
  }

  static async createFaultCode(data: MasterDataCreateInput): Promise<FaultCode> {
    const response = await apiClient.post('/api/settings/fault-codes', data);
    return response.data as FaultCode;
  }

  static async updateFaultCode(id: string, data: MasterDataUpdateInput): Promise<FaultCode> {
    const response = await apiClient.put(`/api/settings/fault-codes/${id}`, data);
    return response.data as FaultCode;
  }

  static async deleteFaultCode(id: string): Promise<FaultCode> {
    const response = await apiClient.delete(`/api/settings/fault-codes/${id}`);
    return response.data as FaultCode;
  }

  static async getFaultCodeUsage(id: string): Promise<UsageInfo> {
    const response = await apiClient.get(`/api/settings/fault-codes/${id}/usage`);
    return response.data as UsageInfo;
  }

  // Reasons
  static async getReasons(query?: MasterDataListQuery): Promise<MasterDataListResponse<Reason>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);
    if (query?.isActive !== undefined) params.append('isActive', query.isActive.toString());

    const response = await apiClient.get(`/api/settings/reasons?${params.toString()}`);
    return response.data as MasterDataListResponse<Reason>;
  }

  static async createReason(data: MasterDataCreateInput): Promise<Reason> {
    const response = await apiClient.post('/api/settings/reasons', data);
    return response.data as Reason;
  }

  static async updateReason(id: string, data: MasterDataUpdateInput): Promise<Reason> {
    const response = await apiClient.put(`/api/settings/reasons/${id}`, data);
    return response.data as Reason;
  }

  static async deleteReason(id: string): Promise<Reason> {
    const response = await apiClient.delete(`/api/settings/reasons/${id}`);
    return response.data as Reason;
  }

  static async getReasonUsage(id: string): Promise<UsageInfo> {
    const response = await apiClient.get(`/api/settings/reasons/${id}/usage`);
    return response.data as UsageInfo;
  }

  // Priority Levels
  static async getPriorityLevels(query?: MasterDataListQuery): Promise<MasterDataListResponse<PriorityLevel>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);
    if (query?.isActive !== undefined) params.append('isActive', query.isActive.toString());

    const response = await apiClient.get(`/api/settings/priority-levels?${params.toString()}`);
    return response.data as MasterDataListResponse<PriorityLevel>;
  }

  static async createPriorityLevel(data: MasterDataCreateInput): Promise<PriorityLevel> {
    const response = await apiClient.post('/api/settings/priority-levels', data);
    return response.data as PriorityLevel;
  }

  static async updatePriorityLevel(id: string, data: MasterDataUpdateInput): Promise<PriorityLevel> {
    const response = await apiClient.put(`/api/settings/priority-levels/${id}`, data);
    return response.data as PriorityLevel;
  }

  static async deletePriorityLevel(id: string): Promise<PriorityLevel> {
    const response = await apiClient.delete(`/api/settings/priority-levels/${id}`);
    return response.data as PriorityLevel;
  }

  static async getPriorityLevelUsage(id: string): Promise<UsageInfo> {
    const response = await apiClient.get(`/api/settings/priority-levels/${id}/usage`);
    return response.data as UsageInfo;
  }

  // Integrated Categories with Reasons
  static async getCategoriesWithReasons(query?: MasterDataListQuery): Promise<MasterDataListResponse<Category>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);
    if (query?.isActive !== undefined) params.append('isActive', query.isActive.toString());

    const response = await apiClient.get(`/api/settings/categories-with-reasons?${params.toString()}`);
    return response.data as MasterDataListResponse<Category>;
  }

  static async getReasonsByCategory(categoryId: string, query?: MasterDataListQuery): Promise<MasterDataListResponse<Reason>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);
    if (query?.isActive !== undefined) params.append('isActive', query.isActive.toString());

    const response = await apiClient.get(`/api/settings/categories/${categoryId}/reasons?${params.toString()}`);
    return response.data as MasterDataListResponse<Reason>;
  }

  static async createReasonForCategory(categoryId: string, data: MasterDataCreateInput): Promise<Reason> {
    const response = await apiClient.post(`/api/settings/categories/${categoryId}/reasons`, data);
    return response.data as Reason;
  }
}
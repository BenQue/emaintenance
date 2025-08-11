const API_BASE_URL = process.env.NEXT_PUBLIC_ASSET_SERVICE_URL || 'http://localhost:3003';

export interface Asset {
  id: string;
  assetCode: string;
  name: string;
  description?: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  location: string;
  isActive: boolean;
  ownerId: string;
  owner: { firstName: string; lastName: string };
  administratorId: string;
  administrator: { firstName: string; lastName: string };
  installDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedAssets {
  assets: Asset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssetStats {
  total: number;
  active: number;
  inactive: number;
  locations: number;
  byLocation: Record<string, number>;
  byManufacturer: Record<string, number>;
}

interface AssetKPIFilters {
  timeRange?: string;
  location?: string;
  assetType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

interface AssetFilters {
  location?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

class AssetService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('auth_token');
    
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

  private buildQueryParams(filters: AssetKPIFilters | AssetFilters): string {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    return params.toString();
  }

  // Basic CRUD operations
  async getAllAssets(filters: AssetFilters = {}): Promise<PaginatedAssets> {
    const queryParams = this.buildQueryParams(filters);
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${API_BASE_URL}/api/assets?${queryParams}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Handle the specific backend response format for assets list
    if (result.success && result.data && result.pagination) {
      return {
        assets: result.data,
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      };
    }
    
    // Fallback to direct data if format is different
    return result.data || result;
  }

  async getAssetById(id: string): Promise<Asset> {
    return this.request<Asset>(`/api/assets/${id}`);
  }

  async createAsset(assetData: Partial<Asset>): Promise<Asset> {
    return this.request<Asset>('/api/assets', {
      method: 'POST',
      body: JSON.stringify(assetData),
    });
  }

  async updateAsset(id: string, assetData: Partial<Asset>): Promise<Asset> {
    return this.request<Asset>(`/api/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assetData),
    });
  }

  async deleteAsset(id: string): Promise<void> {
    return this.request<void>(`/api/assets/${id}`, {
      method: 'DELETE',
    });
  }

  // Search and stats
  async searchAssets(query: string): Promise<{ assets: Asset[]; total: number }> {
    return this.request<{ assets: Asset[]; total: number }>(`/api/assets/search?q=${encodeURIComponent(query)}`);
  }

  // Manual asset code input methods
  async searchAssetsByCode(partialCode: string, filters: { location?: string; isActive?: boolean; limit?: number } = {}): Promise<Asset[]> {
    const params = new URLSearchParams();
    params.append('code', partialCode);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return this.request<Asset[]>(`/api/assets/search-by-code?${params.toString()}`);
  }

  async validateAssetCode(assetCode: string): Promise<{ exists: boolean; asset?: Asset }> {
    const params = new URLSearchParams();
    params.append('code', assetCode);
    
    return this.request<{ exists: boolean; asset?: Asset }>(`/api/assets/validate?${params.toString()}`);
  }

  async getAssetSuggestions(input: string, filters: { location?: string; isActive?: boolean; limit?: number } = {}): Promise<Asset[]> {
    const params = new URLSearchParams();
    params.append('input', input);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return this.request<Asset[]>(`/api/assets/suggest?${params.toString()}`);
  }

  async getAssetStats(): Promise<AssetStats> {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${API_BASE_URL}/api/assets/stats`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data || result;
  }

  async getLocations(): Promise<{ locations: string[] }> {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${API_BASE_URL}/api/assets/locations`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data || result;
  }

  // KPI methods (keeping existing ones)
  async getDowntimeRanking(filters: AssetKPIFilters = {}): Promise<any[]> {
    const queryParams = this.buildQueryParams(filters);
    return this.request<any[]>(`/api/assets/kpi/downtime-ranking?${queryParams}`);
  }

  async getFaultFrequencyRanking(filters: AssetKPIFilters = {}): Promise<any[]> {
    const queryParams = this.buildQueryParams(filters);
    return this.request<any[]>(`/api/assets/kpi/fault-frequency?${queryParams}`);
  }

  async getMaintenanceCostAnalysis(filters: AssetKPIFilters = {}): Promise<any[]> {
    const queryParams = this.buildQueryParams(filters);
    return this.request<any[]>(`/api/assets/kpi/maintenance-cost?${queryParams}`);
  }

  async getHealthOverview(filters: AssetKPIFilters = {}): Promise<any> {
    const queryParams = this.buildQueryParams(filters);
    return this.request<any>(`/api/assets/kpi/health-overview?${queryParams}`);
  }

  async getPerformanceRanking(filters: AssetKPIFilters = {}): Promise<any[]> {
    const queryParams = this.buildQueryParams(filters);
    return this.request<any[]>(`/api/assets/kpi/performance-ranking?${queryParams}`);
  }

  async getCriticalAssets(filters: AssetKPIFilters = {}): Promise<any[]> {
    const queryParams = this.buildQueryParams(filters);
    return this.request<any[]>(`/api/assets/kpi/critical-assets?${queryParams}`);
  }
}

export const assetService = new AssetService();
const API_BASE_URL = process.env.NEXT_PUBLIC_ASSET_API_URL || 'http://localhost:3003';

interface AssetKPIFilters {
  timeRange?: string;
  location?: string;
  assetType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

class AssetService {
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

  private buildQueryParams(filters: AssetKPIFilters): string {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    return params.toString();
  }

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
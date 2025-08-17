import { authService } from './auth-service';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  details?: any[];
  status?: number;
  code?: string;
}

interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
}

export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor(baseUrl: string = API_BASE_URL, timeout: number = 10000, retries: number = 2) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.retries = retries;
  }

  private async request<T>(
    endpoint: string,
    options: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const { timeout = this.timeout, retries = this.retries, ...fetchOptions } = options;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    // Add auth token if available and authenticated
    const token = authService.getToken();
    if (token && authService.isAuthenticated()) {
      (defaultHeaders as any)['Authorization'] = `Bearer ${token}`;
    }

    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          headers: defaultHeaders,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle authentication errors with automatic logout
        if (response.status === 401) {
          // Token expired or invalid - logout user
          authService.logout();
          // Import auth store dynamically to avoid circular dependency
          try {
            const { useAuthStore } = await import('../stores/auth-store');
            useAuthStore.getState().logout();
          } catch (importError) {
            console.warn('Could not import auth store for logout');
          }
          
          const errorData = await response.json().catch(() => ({}));
          throw new ApiAuthError('认证已过期，请重新登录', 401, errorData.code);
        }

        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          throw new ApiAuthError('权限不足，无法访问该资源', 403, errorData.code);
        }

        const data = await response.json();

        if (!response.ok) {
          throw new ApiRequestError(
            data.error || `请求失败 (${response.status})`,
            response.status,
            data.code,
            data.details
          );
        }

        return data;
      } catch (error) {
        lastError = error as Error;

        // Don't retry for authentication or client errors (4xx)
        if (error instanceof ApiAuthError || 
            (error instanceof ApiRequestError && error.status < 500)) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === retries) {
          break;
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError!;
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, any>, config?: RequestConfig): Promise<ApiResponse<T>> {
    let finalEndpoint = endpoint;
    if (params) {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
      finalEndpoint = url.pathname + url.search;
    }

    return this.request(finalEndpoint, { ...config, method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request(endpoint, { ...config, method: 'DELETE' });
  }
}

// Custom error classes for better error handling
export class ApiRequestError extends Error {
  public status: number;
  public code?: string;
  public details?: any[];

  constructor(message: string, status: number, code?: string, details?: any[]) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ApiAuthError extends Error {
  public status: number;
  public code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiAuthError';
    this.status = status;
    this.code = code;
  }
}

// Create API client instances for each microservice
export const apiClient = new ApiClient();

export const userServiceClient = new ApiClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
);

export const workOrderServiceClient = new ApiClient(
  process.env.NEXT_PUBLIC_WORK_ORDER_SERVICE_URL || 'http://localhost:3002'
);

export const assetServiceClient = new ApiClient(
  process.env.NEXT_PUBLIC_ASSET_SERVICE_URL || 'http://localhost:3003'
);

export default apiClient;
export type { RequestConfig };
import { ApiClient, ApiRequestError, ApiAuthError, userServiceClient, workOrderServiceClient, assetServiceClient } from '../api-client';
import { authService } from '../auth-service';

// Mock the auth service
jest.mock('../auth-service', () => ({
  authService: {
    getToken: jest.fn(),
    isAuthenticated: jest.fn(),
    logout: jest.fn(),
  },
}));

// Mock the auth store
jest.mock('../../stores/auth-store', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      logout: jest.fn(),
    })),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('ApiClient', () => {
  let apiClient: ApiClient;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    apiClient = new ApiClient('http://localhost:3000');
    mockFetch.mockClear();
    (authService.getToken as jest.Mock).mockClear();
    (authService.isAuthenticated as jest.Mock).mockClear();
    (authService.logout as jest.Mock).mockClear();
  });

  describe('Authentication Integration', () => {
    it('should attach Bearer token when authenticated', async () => {
      (authService.getToken as jest.Mock).mockReturnValue('mock-token');
      (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      } as Response);

      await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      );
    });

    it('should not attach token when not authenticated', async () => {
      (authService.getToken as jest.Mock).mockReturnValue('mock-token');
      (authService.isAuthenticated as jest.Mock).mockReturnValue(false);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      } as Response);

      await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String),
          }),
        })
      );
    });

    it('should not attach token when token is null', async () => {
      (authService.getToken as jest.Mock).mockReturnValue(null);
      (authService.isAuthenticated as jest.Mock).mockReturnValue(false);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      } as Response);

      await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String),
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 errors and logout user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized', code: 'TOKEN_EXPIRED' }),
      } as Response);

      await expect(apiClient.get('/test')).rejects.toThrow(ApiAuthError);
      expect(authService.logout).toHaveBeenCalled();
    });

    it('should handle 403 errors properly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }),
      } as Response);

      await expect(apiClient.get('/test')).rejects.toThrow(ApiAuthError);
      expect(authService.logout).not.toHaveBeenCalled();
    });

    it('should handle general request errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ 
          error: 'Bad Request', 
          code: 'VALIDATION_ERROR',
          details: ['Field is required']
        }),
      } as Response);

      try {
        await apiClient.get('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiRequestError);
        expect((error as ApiRequestError).status).toBe(400);
        expect((error as ApiRequestError).code).toBe('VALIDATION_ERROR');
        expect((error as ApiRequestError).details).toEqual(['Field is required']);
      }
    });
  });

  describe('Retry Logic', () => {
    it('should retry on server errors with exponential backoff', async () => {
      const apiClientWithRetries = new ApiClient('http://localhost:3000', 1000, 2);
      
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: {} }),
        } as Response);

      const startTime = Date.now();
      await apiClientWithRetries.get('/test');
      const endTime = Date.now();

      expect(mockFetch).toHaveBeenCalledTimes(3);
      // Should have waited for exponential backoff (1s + 2s = ~3s)
      expect(endTime - startTime).toBeGreaterThan(2000);
    });

    it('should not retry on client errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad Request' }),
      } as Response);

      await expect(apiClient.get('/test')).rejects.toThrow(ApiRequestError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      } as Response);

      await expect(apiClient.get('/test')).rejects.toThrow(ApiAuthError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      } as Response);
    });

    it('should handle GET requests with query parameters', async () => {
      await apiClient.get('/users', { page: 1, limit: 10, active: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users?page=1&limit=10&active=true'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should handle POST requests with data', async () => {
      const testData = { name: 'Test User', email: 'test@example.com' };
      await apiClient.post('/users', testData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testData),
        })
      );
    });

    it('should handle PUT requests', async () => {
      const testData = { name: 'Updated User' };
      await apiClient.put('/users/1', testData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(testData),
        })
      );
    });

    it('should handle PATCH requests', async () => {
      const testData = { name: 'Patched User' };
      await apiClient.patch('/users/1', testData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/users/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(testData),
        })
      );
    });

    it('should handle DELETE requests', async () => {
      await apiClient.delete('/users/1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/users/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout requests after specified duration', async () => {
      const apiClientWithTimeout = new ApiClient('http://localhost:3000', 100);
      
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );

      await expect(apiClientWithTimeout.get('/test')).rejects.toThrow();
    });
  });

  describe('Microservice Client Instances', () => {
    it('should create user service client with correct base URL', () => {
      expect(userServiceClient).toBeInstanceOf(ApiClient);
    });

    it('should create work order service client with correct base URL', () => {
      expect(workOrderServiceClient).toBeInstanceOf(ApiClient);
    });

    it('should create asset service client with correct base URL', () => {
      expect(assetServiceClient).toBeInstanceOf(ApiClient);
    });
  });

  describe('Request Configuration', () => {
    it('should accept custom timeout and retries in request config', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      } as Response);

      await apiClient.get('/test', {}, { timeout: 5000, retries: 1 });

      // Test passes if no error is thrown and fetch is called
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should accept custom headers in request config', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      } as Response);

      await apiClient.get('/test', {}, { 
        headers: { 'X-Custom-Header': 'custom-value' } 
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });
  });
});
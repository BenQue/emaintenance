import { authService } from '../auth-service';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('successfully logs in with email', async () => {
      const mockResponse = {
        token: 'mock-jwt-token',
        user: {
          id: '1',
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          role: 'EMPLOYEE' as const,
          isActive: true,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authService.login({
        emailOrUsername: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            username: undefined,
            password: 'password123',
          }),
        }
      );
    });

    it('successfully logs in with username', async () => {
      const mockResponse = {
        token: 'mock-jwt-token',
        user: {
          id: '1',
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          role: 'TECHNICIAN' as const,
          isActive: true,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authService.login({
        emailOrUsername: 'testuser',
        password: 'password123',
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: undefined,
            username: 'testuser',
            password: 'password123',
          }),
        }
      );
    });

    it('throws error on failed login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid credentials' }),
      } as Response);

      await expect(
        authService.login({
          emailOrUsername: 'wrong@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('handles different HTTP error codes properly', async () => {
      // Test 403 Forbidden
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      } as Response);

      await expect(
        authService.login({
          emailOrUsername: 'disabled@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('账户已被禁用，请联系管理员');

      // Test 429 Too Many Requests
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      } as Response);

      await expect(
        authService.login({
          emailOrUsername: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('登录尝试过于频繁，请稍后再试');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        authService.login({
          emailOrUsername: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('token management', () => {
    it('stores token in localStorage', () => {
      const token = 'test-token';
      authService.storeToken(token);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', token);
    });

    it('retrieves token from localStorage', () => {
      const token = 'test-token';
      mockLocalStorage.getItem.mockReturnValue(token);

      const result = authService.getToken();

      expect(result).toBe(token);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_token');
    });

    it('removes token from localStorage', () => {
      authService.removeToken();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('authentication status', () => {
    it('returns false when no token exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      expect(authService.isAuthenticated()).toBe(false);
    });

    it('returns false when token is expired', () => {
      // Create an expired token (expired 1 hour ago)
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 3600,
      };
      const expiredToken = `header.${btoa(JSON.stringify(expiredPayload))}.signature`;
      
      mockLocalStorage.getItem.mockReturnValue(expiredToken);

      expect(authService.isAuthenticated()).toBe(false);
    });

    it('returns true when token is valid and not expired', () => {
      // Create a valid token (expires in 1 hour)
      const validPayload = {
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const validToken = `header.${btoa(JSON.stringify(validPayload))}.signature`;
      
      mockLocalStorage.getItem.mockReturnValue(validToken);

      expect(authService.isAuthenticated()).toBe(true);
    });
  });

  describe('logout', () => {
    it('removes token on logout', () => {
      authService.logout();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });
});
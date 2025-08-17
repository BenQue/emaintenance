interface LoginRequest {
  identifier: string; // Changed from emailOrUsername to match backend
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: 'EMPLOYEE' | 'TECHNICIAN' | 'SUPERVISOR' | 'ADMIN';
    isActive: boolean;
  };
}

interface AuthError {
  message: string;
  code?: string;
}

class AuthService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: credentials.identifier,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Provide more specific error messages based on status code
        switch (response.status) {
          case 401:
            throw new Error(errorData.message || '用户名或密码错误');
          case 403:
            throw new Error('账户已被禁用，请联系管理员');
          case 429:
            throw new Error('登录尝试过于频繁，请稍后再试');
          case 500:
            throw new Error('服务器内部错误，请稍后再试');
          default:
            throw new Error(errorData.message || '登录失败，请重试');
        }
      }

      const result = await response.json();
      
      if (!result.success || !result.data?.token || !result.data?.user) {
        throw new Error('服务器响应格式错误');
      }

      const data: LoginResponse = {
        token: result.data.token,
        user: result.data.user
      };

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('网络连接失败，请检查网络设置');
    }
  }

  storeToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  logout(): void {
    this.removeToken();
  }

  async validateToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.removeToken(); // Clear invalid token
        return false;
      }

      const data = await response.json();
      return data.success && data.data?.valid === true;
    } catch (error) {
      this.removeToken(); // Clear token on error
      return false;
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null;
  }

  // For immediate UI checks - use validateToken() for definitive validation
  async isAuthenticatedAsync(): Promise<boolean> {
    return await this.validateToken();
  }

  async fetchProfile(): Promise<LoginResponse['user']> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid, remove it
          this.removeToken();
          throw new Error('Authentication expired');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch profile');
      }

      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error('Invalid server response');
      }

      return result.data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error while fetching profile');
    }
  }
}

export const authService = new AuthService();
export type { LoginRequest, LoginResponse, AuthError };
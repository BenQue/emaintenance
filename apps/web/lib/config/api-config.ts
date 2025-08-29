/**
 * 统一的API配置系统
 * 自动检测运行环境并配置正确的API端点
 */

interface ApiEndpoints {
  auth: string;
  users: string;
  workOrders: string;
  assets: string;
  notifications: string;
  assignmentRules: string;
}

interface ApiConfig {
  baseUrl: string;
  endpoints: ApiEndpoints;
  isProduction: boolean;
  useProxy: boolean;
}

/**
 * 检测当前运行环境
 */
function detectEnvironment(): {
  isDocker: boolean;
  isProduction: boolean;
  isBrowser: boolean;
} {
  const isBrowser = typeof window !== 'undefined';
  const isDocker = process.env.RUNNING_IN_DOCKER === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  
  return { isDocker, isProduction, isBrowser };
}

/**
 * 获取基础URL
 * 优先级：环境变量 > 自动检测 > 默认值
 */
function getBaseUrl(): string {
  const { isBrowser, isDocker } = detectEnvironment();
  
  // 如果是浏览器环境
  if (isBrowser) {
    // 优先使用环境变量中的API网关地址
    const apiGateway = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
    if (apiGateway) {
      return apiGateway;
    }
    
    // Docker环境下，使用相对路径（通过Nginx代理）
    if (isDocker || !process.env.NEXT_PUBLIC_API_URL) {
      return '';
    }
    
    // 开发环境使用环境变量或默认值
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost';
  }
  
  // 服务器端渲染时
  // Docker容器内部通信
  if (isDocker) {
    return 'http://nginx';
  }
  
  // 本地开发
  return 'http://localhost';
}

/**
 * 构建服务端点URL
 */
function buildServiceUrl(service: string, port?: number): string {
  const baseUrl = getBaseUrl();
  const { isBrowser, isDocker } = detectEnvironment();
  
  // 如果使用相对路径或Nginx代理，直接返回API路径
  if (!baseUrl || baseUrl === 'http://nginx' || isDocker) {
    return '';
  }
  
  // 如果是完整的URL（包含端口），直接使用
  if (baseUrl.includes(':') && baseUrl.split(':').length > 2) {
    return baseUrl;
  }
  
  // 否则添加端口
  return port ? `${baseUrl}:${port}` : baseUrl;
}

/**
 * 获取各个服务的URL
 */
function getServiceUrls(): {
  userService: string;
  workOrderService: string;
  assetService: string;
} {
  // 优先使用环境变量
  const userServiceUrl = process.env.NEXT_PUBLIC_USER_SERVICE_URL || 
    buildServiceUrl('user-service', 3001);
  const workOrderServiceUrl = process.env.NEXT_PUBLIC_WORK_ORDER_SERVICE_URL || 
    buildServiceUrl('work-order-service', 3002);
  const assetServiceUrl = process.env.NEXT_PUBLIC_ASSET_SERVICE_URL || 
    buildServiceUrl('asset-service', 3003);
  
  return {
    userService: userServiceUrl,
    workOrderService: workOrderServiceUrl,
    assetService: assetServiceUrl,
  };
}

/**
 * 构建完整的API URL
 */
export function buildApiUrl(path: string, service?: 'user' | 'workOrder' | 'asset'): string {
  const { userService, workOrderService, assetService } = getServiceUrls();
  
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 如果没有基础URL，使用相对路径
  let baseUrl = '';
  
  switch (service) {
    case 'user':
      baseUrl = userService;
      break;
    case 'workOrder':
      baseUrl = workOrderService;
      break;
    case 'asset':
      baseUrl = assetService;
      break;
    default:
      // 根据路径自动判断服务
      if (normalizedPath.includes('/auth') || normalizedPath.includes('/users')) {
        baseUrl = userService;
      } else if (normalizedPath.includes('/work-orders') || 
                 normalizedPath.includes('/notifications') || 
                 normalizedPath.includes('/assignment-rules')) {
        baseUrl = workOrderService;
      } else if (normalizedPath.includes('/assets')) {
        baseUrl = assetService;
      }
  }
  
  // 如果基础URL为空，返回相对路径（将通过Nginx代理）
  if (!baseUrl) {
    return `/api${normalizedPath}`;
  }
  
  // 构建完整URL
  return `${baseUrl}/api${normalizedPath}`;
}

/**
 * 获取API配置
 */
export function getApiConfig(): ApiConfig {
  const { isProduction, isDocker } = detectEnvironment();
  const baseUrl = getBaseUrl();
  
  return {
    baseUrl,
    endpoints: {
      auth: buildApiUrl('/auth', 'user'),
      users: buildApiUrl('/users', 'user'),
      workOrders: buildApiUrl('/work-orders', 'workOrder'),
      assets: buildApiUrl('/assets', 'asset'),
      notifications: buildApiUrl('/notifications', 'workOrder'),
      assignmentRules: buildApiUrl('/assignment-rules', 'workOrder'),
    },
    isProduction,
    useProxy: !baseUrl || isDocker,
  };
}

/**
 * 统一的fetch包装器，处理认证和错误
 */
export async function apiFetch<T = any>(
  path: string,
  options?: RequestInit,
  service?: 'user' | 'workOrder' | 'asset'
): Promise<T> {
  const url = buildApiUrl(path, service);
  
  // 获取认证token
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('token') 
    : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`,
      }));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }
    
    // 处理空响应
    if (response.status === 204) {
      return {} as T;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${url}`, error);
    throw error;
  }
}

// 导出配置实例
export const apiConfig = getApiConfig();

// 调试助手
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__API_CONFIG__ = apiConfig;
  console.log('API Configuration:', apiConfig);
}
class Environment {
  // 开发环境 - 本地开发服务器
  static const String _devBaseUrl = 'http://192.168.31.53'; // 你的Mac IP地址
  
  // 生产环境 - 请替换为你的实际服务器地址
  static const String _prodBaseUrl = 'https://api.bizlink.com'; // 替换为你的域名
  
  // 自动检测环境：Release构建时自动使用生产环境
  static bool get isDevelopment {
    bool isDebugMode = false;
    assert(isDebugMode = true); // 只在Debug模式下为true
    return isDebugMode;
  }
  
  static String get baseUrl => isDevelopment ? _devBaseUrl : _prodBaseUrl;
  
  // 微服务URL配置 - 根据环境自动调整
  static String get userServiceUrl {
    return isDevelopment 
        ? '$baseUrl:3001'  // 开发环境使用端口
        : '$baseUrl/user-service';  // 生产环境使用路径
  }
  
  static String get workOrderServiceUrl {
    return isDevelopment 
        ? '$baseUrl:3002' 
        : '$baseUrl/work-order-service';
  }
  
  static String get assetServiceUrl {
    return isDevelopment 
        ? '$baseUrl:3003' 
        : '$baseUrl/asset-service';
  }
  
  // API端点
  static const String loginEndpoint = '/api/auth/login';
  static const String assetsEndpoint = '/api/assets';
  static const String workOrdersEndpoint = '/api/work-orders';
  
  // 环境信息
  static String get environmentName => isDevelopment ? 'Development' : 'Production';
  
  // 调试信息
  static Map<String, dynamic> get config => {
    'environment': environmentName,
    'baseUrl': baseUrl,
    'userService': userServiceUrl,
    'workOrderService': workOrderServiceUrl,
    'assetService': assetServiceUrl,
  };
}
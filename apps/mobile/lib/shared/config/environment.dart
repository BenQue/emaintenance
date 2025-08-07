class Environment {
  static const String _devBaseUrl = 'http://192.168.31.53'; // 你的Mac IP地址
  static const String _prodBaseUrl = 'https://your-production-domain.com';
  
  static const bool isDevelopment = true; // TODO: 根据构建配置设置
  
  static String get baseUrl => isDevelopment ? _devBaseUrl : _prodBaseUrl;
  
  // 微服务端口配置
  static String get userServiceUrl => '$baseUrl:3001';
  static String get workOrderServiceUrl => '$baseUrl:3002';
  static String get assetServiceUrl => '$baseUrl:3003';
  
  // API端点
  static const String loginEndpoint = '/api/auth/login';
  static const String assetsEndpoint = '/api/assets';
  static const String workOrdersEndpoint = '/api/work-orders';
}
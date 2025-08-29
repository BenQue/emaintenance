import 'package:shared_preferences/shared_preferences.dart';

class FlexibleEnvironment {
  // 默认服务器地址配置
  static const Map<String, String> _defaultServers = {
    'development': 'http://192.168.31.53',  // Mac local IP for Docker services
    'testing': 'http://10.163.144.13:3030',  // Testing server with port
    'production': 'http://10.163.144.13:3030',  // Production server
    'local': 'http://localhost',
  };
  
  // 当前环境检测
  static bool get isDevelopment {
    bool isDebugMode = false;
    assert(isDebugMode = true);
    return isDebugMode;
  }
  
  // 动态获取服务器地址
  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    
    // 1. 优先使用用户自定义的服务器地址
    final customServer = prefs.getString('custom_server_url');
    if (customServer != null && customServer.isNotEmpty) {
      return customServer;
    }
    
    // 2. 使用环境预设的服务器地址
    final selectedEnv = prefs.getString('selected_environment');
    if (selectedEnv != null && _defaultServers.containsKey(selectedEnv)) {
      return _defaultServers[selectedEnv]!;
    }
    
    // 3. 回退到默认环境检测
    return isDevelopment 
        ? _defaultServers['development']! 
        : _defaultServers['production']!;
  }
  
  // 动态设置服务器地址
  static Future<void> setCustomServer(String serverUrl) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('custom_server_url', serverUrl);
  }
  
  // 选择预设环境
  static Future<void> selectEnvironment(String environment) async {
    if (!_defaultServers.containsKey(environment)) {
      throw ArgumentError('Unsupported environment: $environment');
    }
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('selected_environment', environment);
    // 清除自定义服务器地址
    await prefs.remove('custom_server_url');
  }
  
  // 获取可用环境列表
  static List<String> get availableEnvironments => _defaultServers.keys.toList();
  
  // 获取当前配置信息
  static Future<Map<String, dynamic>> getCurrentConfig() async {
    final baseUrl = await getBaseUrl();
    final prefs = await SharedPreferences.getInstance();
    
    return {
      'baseUrl': baseUrl,
      'userService': '$baseUrl${_getServicePath('user-service')}',
      'workOrderService': '$baseUrl${_getServicePath('work-order-service')}', 
      'assetService': '$baseUrl${_getServicePath('asset-service')}',
      'customServer': prefs.getString('custom_server_url'),
      'selectedEnvironment': prefs.getString('selected_environment'),
      'isDebugMode': isDevelopment,
    };
  }
  
  // 根据环境获取服务路径
  static String _getServicePath(String serviceName) {
    return isDevelopment ? ':${_getServicePort(serviceName)}' : '/$serviceName';
  }
  
  static String _getServicePort(String serviceName) {
    switch (serviceName) {
      case 'user-service': return '3001';
      case 'work-order-service': return '3002';
      case 'asset-service': return '3003';
      default: return '3000';
    }
  }
  
  // 重置为默认配置
  static Future<void> resetToDefault() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('custom_server_url');
    await prefs.remove('selected_environment');
  }
}
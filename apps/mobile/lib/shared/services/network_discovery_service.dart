import 'dart:async';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// 网络发现服务
/// 自动发现本地网络中的E-Maintenance服务器
class NetworkDiscoveryService {
  static const String _healthEndpoint = '/health';
  static const String _apiHealthEndpoint = '/api/users/health';
  static const int _timeoutSeconds = 3;
  static const String _preferredServerKey = 'preferred_server_url';
  
  /// 发现本地网络中的服务器
  static Future<List<String>> discoverServers() async {
    final List<String> discoveredServers = [];
    final List<String> candidateIps = await _generateCandidateIps();
    
    // 并发检查所有候选IP
    final futures = candidateIps.map((ip) => _checkServer('http://$ip'));
    final results = await Future.wait(futures);
    
    for (int i = 0; i < results.length; i++) {
      if (results[i]) {
        discoveredServers.add('http://${candidateIps[i]}');
      }
    }
    
    return discoveredServers;
  }
  
  /// 生成候选IP地址列表
  static Future<List<String>> _generateCandidateIps() async {
    final List<String> candidateIps = [];
    
    try {
      // 获取设备IP地址
      final deviceIp = await _getDeviceIp();
      if (deviceIp != null) {
        // 获取网络段
        final networkPrefix = deviceIp.substring(0, deviceIp.lastIndexOf('.'));
        
        // 扫描网络段内的常见IP
        for (int i = 1; i < 255; i++) {
          candidateIps.add('$networkPrefix.$i');
        }
      }
      
      // 添加常见的默认地址
      candidateIps.addAll([
        'localhost',
        '127.0.0.1',
        '192.168.1.1',
        '192.168.1.100',
        '192.168.0.1',
        '192.168.0.100',
        '10.0.0.1',
        '10.0.0.100',
      ]);
      
    } catch (e) {
      print('生成候选IP时出错: $e');
      // 使用默认候选列表
      candidateIps.addAll([
        'localhost',
        '192.168.1.1',
        '192.168.0.1',
        '10.0.0.1',
      ]);
    }
    
    return candidateIps.toSet().toList(); // 去重
  }
  
  /// 获取设备IP地址
  static Future<String?> _getDeviceIp() async {
    try {
      final interfaces = await NetworkInterface.list();
      for (final interface in interfaces) {
        if (interface.name.contains('wlan') || 
            interface.name.contains('wifi') || 
            interface.name.contains('en0')) {
          for (final address in interface.addresses) {
            if (address.type == InternetAddressType.IPv4 && 
                !address.isLoopback) {
              return address.address;
            }
          }
        }
      }
    } catch (e) {
      print('获取设备IP失败: $e');
    }
    return null;
  }
  
  /// 检查服务器是否可用
  static Future<bool> _checkServer(String baseUrl) async {
    try {
      // 首先检查健康端点
      final healthResponse = await http.get(
        Uri.parse('$baseUrl$_healthEndpoint'),
        headers: {'Accept': 'application/json'},
      ).timeout(Duration(seconds: _timeoutSeconds));
      
      if (healthResponse.statusCode == 200) {
        // 再检查API端点
        final apiResponse = await http.get(
          Uri.parse('$baseUrl$_apiHealthEndpoint'),
          headers: {'Accept': 'application/json'},
        ).timeout(Duration(seconds: _timeoutSeconds));
        
        // API端点可能需要认证，所以401也认为是有效的
        if (apiResponse.statusCode == 200 || apiResponse.statusCode == 401) {
          return true;
        }
      }
    } catch (e) {
      // 网络错误、超时等，认为服务器不可用
    }
    
    return false;
  }
  
  /// 测试服务器连接性
  static Future<ServerStatus> testServerConnection(String baseUrl) async {
    final startTime = DateTime.now();
    
    try {
      // 测试健康检查端点
      final healthResponse = await http.get(
        Uri.parse('$baseUrl$_healthEndpoint'),
        headers: {'Accept': 'application/json'},
      ).timeout(Duration(seconds: _timeoutSeconds));
      
      final responseTime = DateTime.now().difference(startTime).inMilliseconds;
      
      if (healthResponse.statusCode == 200) {
        // 测试API端点
        final apiResponse = await http.get(
          Uri.parse('$baseUrl$_apiHealthEndpoint'),
          headers: {'Accept': 'application/json'},
        ).timeout(Duration(seconds: _timeoutSeconds));
        
        final hasApi = apiResponse.statusCode == 200 || apiResponse.statusCode == 401;
        
        return ServerStatus(
          url: baseUrl,
          isHealthy: true,
          hasApi: hasApi,
          responseTime: responseTime,
          error: null,
        );
      } else {
        return ServerStatus(
          url: baseUrl,
          isHealthy: false,
          hasApi: false,
          responseTime: responseTime,
          error: 'HTTP ${healthResponse.statusCode}',
        );
      }
    } catch (e) {
      final responseTime = DateTime.now().difference(startTime).inMilliseconds;
      return ServerStatus(
        url: baseUrl,
        isHealthy: false,
        hasApi: false,
        responseTime: responseTime,
        error: e.toString(),
      );
    }
  }
  
  /// 保存首选服务器
  static Future<void> savePreferredServer(String serverUrl) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_preferredServerKey, serverUrl);
  }
  
  /// 获取首选服务器
  static Future<String?> getPreferredServer() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_preferredServerKey);
  }
  
  /// 快速连接测试
  static Future<bool> quickConnectTest(String baseUrl) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$_healthEndpoint'),
        headers: {'Accept': 'application/json'},
      ).timeout(Duration(seconds: 2));
      
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}

/// 服务器状态信息
class ServerStatus {
  final String url;
  final bool isHealthy;
  final bool hasApi;
  final int responseTime;
  final String? error;
  
  const ServerStatus({
    required this.url,
    required this.isHealthy,
    required this.hasApi,
    required this.responseTime,
    this.error,
  });
  
  /// 服务器质量评分（0-100）
  int get qualityScore {
    if (!isHealthy) return 0;
    if (!hasApi) return 20;
    
    // 根据响应时间评分
    if (responseTime < 100) return 100;
    if (responseTime < 300) return 90;
    if (responseTime < 500) return 80;
    if (responseTime < 1000) return 70;
    if (responseTime < 2000) return 60;
    return 50;
  }
  
  String get statusText {
    if (!isHealthy) {
      return error ?? '连接失败';
    }
    if (!hasApi) {
      return 'Web服务可用，API不可用';
    }
    return '可用 (${responseTime}ms)';
  }
}
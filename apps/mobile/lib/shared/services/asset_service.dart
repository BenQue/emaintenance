import '../models/asset.dart';
import 'api_client.dart';

class AssetService {
  late final ApiClient _apiClient;
  
  static AssetService? _instance;
  
  AssetService._internal();
  
  static Future<AssetService> getInstance() async {
    if (_instance == null) {
      _instance = AssetService._internal();
      // 使用用户服务客户端，因为asset相关API在user service中
      _instance!._apiClient = await ApiClient.getUserServiceClient();
    }
    return _instance!;
  }
  
  Future<Asset> getAssetByCode(String assetCode) async {
    print('AssetService: 正在查找设备代码: $assetCode');
    
    // 检查token状态
    final token = await _apiClient.getToken();
    print('AssetService: 当前JWT token存在: ${token != null}');
    if (token != null) {
      print('AssetService: Token长度: ${token.length}');
      print('AssetService: Token前50字符: ${token.length > 50 ? token.substring(0, 50) + '...' : token}');
    }
    
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        '/api/assets/code/$assetCode',
      );
      
      print('AssetService: API响应状态码: ${response.statusCode}');
      print('AssetService: API响应数据: ${response.data}');
      
      if (response.data == null) {
        throw const ApiException(message: '设备信息响应数据为空');
      }
      
      // 检查响应格式，如果是包装在success字段中的数据
      final Map<String, dynamic> responseData = response.data!;
      Map<String, dynamic> assetData;
      
      if (responseData.containsKey('success') && responseData['success'] == true) {
        // 标准API响应格式：{"success": true, "data": {...}}
        assetData = responseData['data'] as Map<String, dynamic>;
        print('AssetService: 从标准响应格式中提取设备数据: $assetData');
      } else {
        // 直接响应格式
        assetData = responseData;
        print('AssetService: 使用直接响应格式的设备数据: $assetData');
      }
      
      return Asset.fromJson(assetData);
      
    } catch (e) {
      print('AssetService: 查找设备失败: $e');
      rethrow;
    }
  }
  
  Future<Asset> getAssetById(String id) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/assets/$id',
    );
    
    if (response.data == null) {
      throw const ApiException(message: '设备信息响应数据为空');
    }
    
    return Asset.fromJson(response.data!);
  }
  
  Future<List<Asset>> getAssets({
    int page = 1,
    int limit = 20,
    String? search,
    String? location,
  }) async {
    final queryParameters = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    
    if (search != null && search.isNotEmpty) {
      queryParameters['search'] = search;
    }
    
    if (location != null && location.isNotEmpty) {
      queryParameters['location'] = location;
    }
    
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/assets',
      queryParameters: queryParameters,
    );
    
    if (response.data == null) {
      throw const ApiException(message: '设备列表响应数据为空');
    }
    
    final List<dynamic> assetsJson = response.data!['assets'] as List<dynamic>;
    return assetsJson
        .map((json) => Asset.fromJson(json as Map<String, dynamic>))
        .toList();
  }
  
  Future<List<String>> getAssetCategories() async {
    // This could be retrieved from a backend endpoint
    // For now, return predefined categories
    return [
      '电气设备',
      '机械设备',
      '自动化设备',
      '安全设备',
      '环境设备',
      '通信设备',
      '计算机设备',
      '办公设备',
      '其他',
    ];
  }
  
  Future<List<String>> getFailureReasons() async {
    // This could be retrieved from a backend endpoint
    // For now, return predefined reasons
    return [
      '设备故障',
      '性能下降',
      '异常噪音',
      '温度异常',
      '泄漏',
      '磨损',
      '电气故障',
      '软件故障',
      '定期维护',
      '预防性维护',
      '其他',
    ];
  }
  
  Future<List<String>> getCommonLocations() async {
    // This could be retrieved from a backend endpoint
    // For now, return predefined locations
    return [
      '生产车间A',
      '生产车间B',
      '生产车间C',
      '仓库',
      '办公区',
      '设备间',
      '电气房',
      '机房',
      '实验室',
      '其他',
    ];
  }
}
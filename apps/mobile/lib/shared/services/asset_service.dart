import '../models/asset.dart';
import 'api_client.dart';

class AssetService {
  late final ApiClient _apiClient;
  
  static AssetService? _instance;
  
  AssetService._internal();
  
  static Future<AssetService> getInstance() async {
    _instance ??= AssetService._internal();
    _instance!._apiClient = await ApiClient.getInstance();
    return _instance!;
  }
  
  Future<Asset> getAssetByCode(String assetCode) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/assets/code/$assetCode',
    );
    
    if (response.data == null) {
      throw const ApiException(message: '设备信息响应数据为空');
    }
    
    return Asset.fromJson(response.data!);
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
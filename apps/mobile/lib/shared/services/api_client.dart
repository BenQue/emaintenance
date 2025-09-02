import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/environment.dart';
import '../config/environment_flexible.dart';

class ApiClient {
  final String _baseUrl;
  late final Dio _dio;
  late final SharedPreferences _prefs;
  
  static ApiClient? _instance;
  
  ApiClient._internal(this._baseUrl) {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      validateStatus: (status) {
        // Accept any status code less than 500
        return status != null && status < 500;
      },
    ));
    
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Add authorization header if token exists
        final token = await getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        // Debug logging
        print('🔵 REQUEST: ${options.method} ${options.baseUrl}${options.path}');
        print('🔵 Headers: ${options.headers}');
        if (options.data != null) {
          print('🔵 Data: ${options.data}');
        }
        handler.next(options);
      },
      onResponse: (response, handler) async {
        // Debug logging for responses
        print('🟢 RESPONSE: ${response.statusCode}');
        print('🟢 URL: ${response.requestOptions.baseUrl}${response.requestOptions.path}');
        print('🟢 Data: ${response.data}');
        handler.next(response);
      },
      onError: (error, handler) async {
        // Debug logging
        print('🔴 ERROR: ${error.type}');
        print('🔴 Message: ${error.message}');
        print('🔴 URL: ${error.requestOptions.baseUrl}${error.requestOptions.path}');
        if (error.response != null) {
          print('🔴 Status: ${error.response?.statusCode}');
          print('🔴 Response: ${error.response?.data}');
        } else {
          print('🔴 No response received - timeout or connection error');
        }
        // Handle 401 unauthorized errors
        if (error.response?.statusCode == 401) {
          await clearToken();
          // Could trigger navigation to login screen here
        }
        handler.next(error);
      },
    ));
  }
  
  static Future<ApiClient> getInstance({String? baseUrl}) async {
    final url = baseUrl ?? Environment.userServiceUrl; // 默认使用用户服务
    if (_instance == null || _instance!._baseUrl != url) {
      _instance = ApiClient._internal(url);
      _instance!._prefs = await SharedPreferences.getInstance();
    }
    return _instance!;
  }
  
  // 为不同服务创建特定的客户端实例（支持灵活配置）
  static Future<ApiClient> getUserServiceClient() async {
    final baseUrl = await FlexibleEnvironment.getBaseUrl();
    // 用户服务使用基础URL，因为auth路径已包含/user-service前缀
    return await getInstance(baseUrl: baseUrl);
  }
  
  static Future<ApiClient> getWorkOrderServiceClient() async {
    final baseUrl = await FlexibleEnvironment.getBaseUrl();
    // 工单服务使用基础URL，因为路径已包含/work-order-service前缀
    return await getInstance(baseUrl: baseUrl);
  }
  
  static Future<ApiClient> getAssetServiceClient() async {
    final baseUrl = await FlexibleEnvironment.getBaseUrl();
    // 资产服务使用基础URL，因为路径已包含/asset-service前缀
    return await getInstance(baseUrl: baseUrl);
  }
  
  Future<String?> getToken() async {
    return _prefs.getString('jwt_token');
  }
  
  Future<void> setToken(String token) async {
    await _prefs.setString('jwt_token', token);
  }
  
  Future<void> clearToken() async {
    await _prefs.remove('jwt_token');
  }
  
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.get<T>(
        path,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
  
  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.post<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
  
  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.put<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
  
  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.delete<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  // Getter to expose the configured Dio instance for authenticated image loading
  Dio get dio => _dio;
}

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  const ApiException({
    required this.message,
    this.statusCode,
    this.data,
  });

  factory ApiException.fromDioException(DioException dioException) {
    String message;
    int? statusCode = dioException.response?.statusCode;

    switch (dioException.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        message = '网络连接超时，请检查网络设置';
        break;
      case DioExceptionType.badResponse:
        if (dioException.response?.data is Map<String, dynamic>) {
          final errorData = dioException.response!.data as Map<String, dynamic>;
          message = errorData['message'] ?? errorData['error'] ?? '服务器错误';
        } else {
          message = '服务器返回错误响应';
        }
        break;
      case DioExceptionType.cancel:
        message = '请求已取消';
        break;
      case DioExceptionType.connectionError:
        message = '无法连接到服务器，请检查网络连接';
        break;
      default:
        message = dioException.message ?? '未知错误';
    }

    return ApiException(
      message: message,
      statusCode: statusCode,
      data: dioException.response?.data,
    );
  }

  @override
  String toString() {
    return 'ApiException: $message${statusCode != null ? ' (状态码: $statusCode)' : ''}';
  }
}
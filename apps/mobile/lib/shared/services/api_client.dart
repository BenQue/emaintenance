import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/environment.dart';

class ApiClient {
  final String _baseUrl;
  late final Dio _dio;
  late final SharedPreferences _prefs;
  
  static ApiClient? _instance;
  
  ApiClient._internal(this._baseUrl) {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      sendTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));
    
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Add authorization header if token exists
        final token = await getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
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
  
  // 为不同服务创建特定的客户端实例
  static Future<ApiClient> getUserServiceClient() async {
    return await getInstance(baseUrl: Environment.userServiceUrl);
  }
  
  static Future<ApiClient> getWorkOrderServiceClient() async {
    return await getInstance(baseUrl: Environment.workOrderServiceUrl);
  }
  
  static Future<ApiClient> getAssetServiceClient() async {
    return await getInstance(baseUrl: Environment.assetServiceUrl);
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
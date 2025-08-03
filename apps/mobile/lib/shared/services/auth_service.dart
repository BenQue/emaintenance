import '../models/user.dart';
import 'api_client.dart';

class AuthService {
  late final ApiClient _apiClient;
  
  static AuthService? _instance;
  
  AuthService._internal();
  
  static Future<AuthService> getInstance() async {
    _instance ??= AuthService._internal();
    _instance!._apiClient = await ApiClient.getInstance();
    return _instance!;
  }
  
  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    final loginRequest = LoginRequest(email: email, password: password);
    
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/api/auth/login',
      data: loginRequest.toJson(),
    );
    
    if (response.data == null) {
      throw const ApiException(message: '登录响应数据为空');
    }
    
    final authResponse = AuthResponse.fromJson(response.data!);
    
    // Store the JWT token
    await _apiClient.setToken(authResponse.token);
    
    return authResponse;
  }
  
  Future<void> logout() async {
    await _apiClient.clearToken();
  }
  
  Future<bool> isLoggedIn() async {
    final token = await _apiClient.getToken();
    return token != null && token.isNotEmpty;
  }
  
  Future<String?> getStoredToken() async {
    return await _apiClient.getToken();
  }
  
  Future<User?> getCurrentUser() async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>('/api/auth/me');
      
      if (response.data == null) {
        return null;
      }
      
      return User.fromJson(response.data!);
    } catch (e) {
      // If we can't get current user, token might be invalid
      await logout();
      return null;
    }
  }
  
  Future<bool> refreshToken() async {
    try {
      final response = await _apiClient.post<Map<String, dynamic>>('/api/auth/refresh');
      
      if (response.data == null) {
        return false;
      }
      
      final newToken = response.data!['token'] as String?;
      if (newToken != null) {
        await _apiClient.setToken(newToken);
        return true;
      }
      
      return false;
    } catch (e) {
      await logout();
      return false;
    }
  }
}
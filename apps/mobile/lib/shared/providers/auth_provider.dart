import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import '../services/api_client.dart';

enum AuthState {
  initial,
  loading,
  authenticated,
  unauthenticated,
  error,
}

class AuthProvider extends ChangeNotifier {
  AuthState _state = AuthState.initial;
  User? _user;
  String? _errorMessage;
  late final AuthService _authService;

  AuthState get state => _state;
  User? get user => _user;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _state == AuthState.authenticated && _user != null;
  bool get isLoading => _state == AuthState.loading;

  static AuthProvider? _instance;

  AuthProvider._internal();

  static Future<AuthProvider> getInstance() async {
    _instance ??= AuthProvider._internal();
    _instance!._authService = await AuthService.getInstance();
    return _instance!;
  }

  Future<void> initializeAuth() async {
    _setState(AuthState.loading);

    try {
      final isLoggedIn = await _authService.isLoggedIn();
      
      if (isLoggedIn) {
        // Try to get current user info
        final user = await _authService.getCurrentUser();
        
        if (user != null) {
          _user = user;
          _setState(AuthState.authenticated);
        } else {
          // Token might be invalid, logout
          await _authService.logout();
          _setState(AuthState.unauthenticated);
        }
      } else {
        _setState(AuthState.unauthenticated);
      }
    } catch (e) {
      _setError('初始化认证状态失败: ${e.toString()}');
    }
  }

  Future<bool> login({
    required String identifier,
    required String password,
  }) async {
    _setState(AuthState.loading);
    _clearError();

    try {
      final authResponse = await _authService.login(
        identifier: identifier,
        password: password,
      );

      _user = authResponse.user;
      _setState(AuthState.authenticated);
      return true;
    } catch (e) {
      String errorMessage = '登录失败';
      
      if (e is ApiException) {
        errorMessage = e.message;
      } else {
        errorMessage = '登录失败: ${e.toString()}';
      }
      
      _setError(errorMessage);
      return false;
    }
  }

  Future<void> logout() async {
    _setState(AuthState.loading);

    try {
      await _authService.logout();
      _user = null;
      _setState(AuthState.unauthenticated);
    } catch (e) {
      // Even if logout fails on server, clear local state
      _user = null;
      _setState(AuthState.unauthenticated);
    }
  }

  Future<bool> refreshToken() async {
    try {
      final success = await _authService.refreshToken();
      
      if (!success) {
        await logout();
        return false;
      }
      
      // Get updated user info if refresh succeeded
      final user = await _authService.getCurrentUser();
      if (user != null) {
        _user = user;
        notifyListeners();
      }
      
      return true;
    } catch (e) {
      await logout();
      return false;
    }
  }

  void _setState(AuthState newState) {
    _state = newState;
    notifyListeners();
  }

  void _setError(String message) {
    _errorMessage = message;
    _state = AuthState.error;
    notifyListeners();
  }

  void _clearError() {
    _errorMessage = null;
  }

  void clearError() {
    _clearError();
    notifyListeners();
  }
}
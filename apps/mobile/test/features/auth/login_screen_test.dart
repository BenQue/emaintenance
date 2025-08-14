import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:emaintenance_mobile/features/auth/login_screen.dart';
import 'package:emaintenance_mobile/shared/providers/auth_provider.dart';
import 'package:emaintenance_mobile/shared/models/user.dart';

// Mock AuthProvider for testing
class MockAuthProvider extends ChangeNotifier implements AuthProvider {
  @override
  AuthState state = AuthState.unauthenticated;
  
  @override
  User? user;
  
  @override
  String? errorMessage;
  
  @override
  bool get isAuthenticated => state == AuthState.authenticated && user != null;
  
  @override
  bool get isLoading => state == AuthState.loading;
  
  bool _loginSuccess = true;
  
  void setLoginSuccess(bool success) {
    _loginSuccess = success;
  }
  
  @override
  Future<bool> login({
    required String email,
    required String password,
  }) async {
    state = AuthState.loading;
    notifyListeners();
    
    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 100));
    
    if (_loginSuccess && email == 'test@example.com' && password == 'password123') {
      user = User(
        id: 'test-id',
        email: email,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.employee,
        isActive: true,
        createdAt: DateTime.now(),
      );
      state = AuthState.authenticated;
      notifyListeners();
      return true;
    } else {
      errorMessage = '用户名或密码错误';
      state = AuthState.error;
      notifyListeners();
      return false;
    }
  }
  
  @override
  Future<void> logout() async {
    user = null;
    state = AuthState.unauthenticated;
    notifyListeners();
  }
  
  @override
  void clearError() {
    errorMessage = null;
    if (state == AuthState.error) {
      state = AuthState.unauthenticated;
      notifyListeners();
    }
  }
  
  // Unimplemented methods for testing
  @override
  Future<void> initializeAuth() async {}
  
  @override
  Future<bool> refreshToken() async => false;
}

void main() {
  group('LoginScreen Tests', () {
    late MockAuthProvider mockAuthProvider;
    
    setUp(() {
      mockAuthProvider = MockAuthProvider();
    });
    
    Widget createTestWidget() {
      return ChangeNotifierProvider<AuthProvider>.value(
        value: mockAuthProvider,
        child: MaterialApp(
          home: const LoginScreen(),
          theme: ThemeData(brightness: Brightness.dark), // Use dark theme to avoid dev info
        ),
      );
    }
    
    testWidgets('should display login form correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Check if all form elements are present
      expect(find.text('设备维修管理系统'), findsOneWidget);
      expect(find.text('E-Maintenance System'), findsOneWidget);
      expect(find.byType(TextFormField), findsNWidgets(2)); // Email and password fields
      expect(find.text('登录'), findsOneWidget);
    });
    
    testWidgets('should show validation errors for empty fields', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Tap login button without entering any data
      await tester.tap(find.widgetWithText(ElevatedButton, '登录'));
      await tester.pump();
      
      // Check for validation errors
      expect(find.text('请输入邮箱地址'), findsOneWidget);
      expect(find.text('请输入密码'), findsOneWidget);
    });
    
    testWidgets('should show validation error for invalid email', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Enter invalid email
      await tester.enterText(find.byType(TextFormField).first, 'invalid-email');
      await tester.enterText(find.byType(TextFormField).last, 'password123');
      
      await tester.tap(find.widgetWithText(ElevatedButton, '登录'));
      await tester.pump();
      
      expect(find.text('请输入有效的邮箱地址'), findsOneWidget);
    });
    
    testWidgets('should toggle password visibility', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Find visibility toggle button
      final visibilityToggle = find.byIcon(Icons.visibility);
      expect(visibilityToggle, findsOneWidget);
      
      // Tap visibility toggle
      await tester.tap(visibilityToggle);
      await tester.pump();
      
      // Now should show visibility_off icon
      expect(find.byIcon(Icons.visibility_off), findsOneWidget);
      expect(find.byIcon(Icons.visibility), findsNothing);
    });
    
    testWidgets('should show loading state during login', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Enter valid credentials
      await tester.enterText(find.byType(TextFormField).first, 'test@example.com');
      await tester.enterText(find.byType(TextFormField).last, 'password123');
      
      // Tap login button
      await tester.tap(find.widgetWithText(ElevatedButton, '登录'));
      await tester.pump();
      
      // Check for loading indicator
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      
      // Wait for login to complete
      await tester.pump(const Duration(milliseconds: 200));
    });
    
    testWidgets('should show error message on failed login', (WidgetTester tester) async {
      mockAuthProvider.setLoginSuccess(false);
      await tester.pumpWidget(createTestWidget());
      
      // Enter credentials
      await tester.enterText(find.byType(TextFormField).first, 'wrong@example.com');
      await tester.enterText(find.byType(TextFormField).last, 'wrongpassword');
      
      // Tap login button
      await tester.tap(find.widgetWithText(ElevatedButton, '登录'));
      await tester.pump();
      
      // Wait for login to complete
      await tester.pump(const Duration(milliseconds: 200));
      
      // Check for error message
      expect(find.textContaining('用户名或密码错误'), findsAtLeastNWidgets(1));
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });
    
    testWidgets('should clear error message when close button is tapped', (WidgetTester tester) async {
      mockAuthProvider.setLoginSuccess(false);
      await tester.pumpWidget(createTestWidget());
      
      // Trigger error
      await tester.enterText(find.byType(TextFormField).first, 'wrong@example.com');
      await tester.enterText(find.byType(TextFormField).last, 'wrongpassword');
      await tester.tap(find.widgetWithText(ElevatedButton, '登录'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));
      
      // Error should be visible
      expect(find.textContaining('用户名或密码错误'), findsAtLeastNWidgets(1));
      
      // Tap close button
      await tester.tap(find.byIcon(Icons.close));
      await tester.pump();
      
      // Error should be cleared
      expect(find.textContaining('用户名或密码错误'), findsNothing);
    });
  });
}
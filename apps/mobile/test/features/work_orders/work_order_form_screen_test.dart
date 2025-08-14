import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:emaintenance_mobile/features/work_orders/work_order_form_screen.dart';
import 'package:emaintenance_mobile/shared/providers/auth_provider.dart';
import 'package:emaintenance_mobile/shared/models/user.dart';
import 'package:emaintenance_mobile/shared/models/asset.dart';

// Mock AuthProvider for testing
class MockAuthProvider extends ChangeNotifier implements AuthProvider {
  @override
  AuthState state = AuthState.authenticated;
  
  @override
  User? user = User(
    id: 'test-id',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.employee,
    isActive: true,
    createdAt: DateTime.now(),
  );
  
  @override
  String? errorMessage;
  
  @override
  bool get isAuthenticated => true;
  
  @override
  bool get isLoading => false;
  
  @override
  Future<bool> login({required String email, required String password}) async => true;
  
  @override
  Future<void> logout() async {}
  
  @override
  void clearError() {}
  
  @override
  Future<void> initializeAuth() async {}
  
  @override
  Future<bool> refreshToken() async => true;
}

void main() {
  group('WorkOrderFormScreen Tests', () {
    late MockAuthProvider mockAuthProvider;
    late Asset testAsset;
    
    setUp(() {
      mockAuthProvider = MockAuthProvider();
      testAsset = Asset(
        id: 'asset-1',
        assetCode: 'TEST001',
        name: '测试设备',
        location: '测试位置',
        isActive: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
    });
    
    Widget createTestWidget({Asset? asset}) {
      return ChangeNotifierProvider<AuthProvider>.value(
        value: mockAuthProvider,
        child: MaterialApp(
          home: WorkOrderFormScreen(asset: asset),
        ),
      );
    }
    
    testWidgets('should display work order form correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(asset: testAsset));
      
      // Wait for form to load
      await tester.pump(const Duration(seconds: 1));
      
      // Check if form elements are present
      expect(find.text('创建维修工单'), findsOneWidget);
      expect(find.text('工单标题'), findsOneWidget);
      expect(find.text('报修类别'), findsOneWidget);
      expect(find.text('报修原因'), findsOneWidget);
      expect(find.text('具体位置'), findsOneWidget);
      expect(find.text('详细描述（可选）'), findsOneWidget);
      expect(find.text('提交工单'), findsOneWidget);
    });
    
    testWidgets('should display asset information when asset is provided', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(asset: testAsset));
      
      // Wait for form to load
      await tester.pump(const Duration(seconds: 1));
      
      // Check if asset information is displayed
      expect(find.text('设备信息'), findsOneWidget);
      expect(find.text('测试设备'), findsOneWidget);
      expect(find.text('设备编号: TEST001'), findsOneWidget);
      expect(find.text('当前位置: 测试位置'), findsOneWidget);
    });
    
    testWidgets('should show validation errors for required fields', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(asset: testAsset));
      
      // Wait for form to load
      await tester.pump(const Duration(seconds: 1));
      
      // Try to submit without filling required fields
      await tester.tap(find.text('提交工单'));
      await tester.pump();
      
      // Check for validation errors
      expect(find.text('请输入工单标题'), findsOneWidget);
    });
    
    testWidgets('should handle priority selection', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(asset: testAsset));
      
      // Wait for form to load
      await tester.pump(const Duration(seconds: 1));
      
      // Check if priority options are available
      expect(find.text('优先级'), findsOneWidget);
      expect(find.text('低'), findsOneWidget);
      expect(find.text('中'), findsOneWidget);
      expect(find.text('高'), findsOneWidget);
      expect(find.text('紧急'), findsOneWidget);
    });
  });
}
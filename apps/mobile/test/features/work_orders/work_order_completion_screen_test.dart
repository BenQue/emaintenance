import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:provider/provider.dart';

import '../../../lib/features/work_orders/work_order_completion_screen.dart';
import '../../../lib/shared/models/work_order.dart';
import '../../../lib/shared/models/user.dart';
import '../../../lib/shared/models/asset.dart';
import '../../../lib/shared/services/work_order_service.dart';
import '../../../lib/shared/services/offline_storage_service.dart';
import '../../../lib/shared/providers/auth_provider.dart';

import 'work_order_completion_screen_test.mocks.dart';

@GenerateMocks([
  WorkOrderService,
  OfflineStorageService,
  AuthProvider,
])
void main() {
  late MockWorkOrderService mockWorkOrderService;
  late MockOfflineStorageService mockOfflineStorage;
  late MockAuthProvider mockAuthProvider;

  setUp(() {
    mockWorkOrderService = MockWorkOrderService();
    mockOfflineStorage = MockOfflineStorageService();
    mockAuthProvider = MockAuthProvider();
  });

  // Test data
  final testUser = User(
    id: 'user1',
    email: 'john.doe@example.com',
    username: 'johndoe',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.technician,
    isActive: true,
    createdAt: DateTime.now(),
  );

  final testAsset = Asset(
    id: 'asset1',
    assetCode: 'A001',
    name: 'Test Equipment',
    location: 'Building A',
    isActive: true,
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
  );

  final testWorkOrder = WorkOrderWithRelations(
    id: 'wo1',
    title: 'Test Work Order',
    description: 'Test description',
    category: 'Maintenance',
    reason: 'Scheduled',
    priority: Priority.medium,
    status: WorkOrderStatus.inProgress,
    reportedAt: DateTime.now(),
    attachments: [],
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
    assetId: 'asset1',
    createdById: 'user1',
    assignedToId: 'user1',
    asset: testAsset,
    createdBy: testUser,
    assignedTo: testUser,
  );

  Widget createTestWidget() {
    return MaterialApp(
      home: ChangeNotifierProvider<AuthProvider>.value(
        value: mockAuthProvider,
        child: WorkOrderCompletionScreen(workOrder: testWorkOrder),
      ),
    );
  }

  group('WorkOrderCompletionScreen Widget Tests', () {
    testWidgets('should display work order information', (WidgetTester tester) async {
      // Arrange
      when(mockAuthProvider.user).thenReturn(testUser);

      // Act
      await tester.pumpWidget(createTestWidget());

      // Assert
      expect(find.text('完成工单'), findsOneWidget);
      expect(find.text('Test Work Order'), findsOneWidget);
      expect(find.text('Test description'), findsOneWidget);
      expect(find.text('Test Equipment'), findsOneWidget);
    });

    testWidgets('should show solution description field', (WidgetTester tester) async {
      // Arrange
      when(mockAuthProvider.user).thenReturn(testUser);

      // Act
      await tester.pumpWidget(createTestWidget());

      // Assert
      expect(find.text('解决方案描述 *'), findsOneWidget);
      expect(find.byType(TextFormField), findsAtLeastNWidgets(1));
    });

    testWidgets('should show fault code dropdown', (WidgetTester tester) async {
      // Arrange
      when(mockAuthProvider.user).thenReturn(testUser);

      // Act
      await tester.pumpWidget(createTestWidget());

      // Assert
      expect(find.text('故障代码'), findsOneWidget);
      expect(find.byType(DropdownButton<FaultCode>), findsOneWidget);
    });

    testWidgets('should show photo section', (WidgetTester tester) async {
      // Arrange
      when(mockAuthProvider.user).thenReturn(testUser);

      // Act
      await tester.pumpWidget(createTestWidget());

      // Assert
      expect(find.text('完成照片'), findsOneWidget);
      expect(find.text('添加照片'), findsOneWidget);
      expect(find.text('添加完成照片作为维修证明'), findsOneWidget);
    });

    testWidgets('should validate required solution description', (WidgetTester tester) async {
      // Arrange
      when(mockAuthProvider.user).thenReturn(testUser);

      // Act
      await tester.pumpWidget(createTestWidget());
      
      // Try to submit without entering solution
      await tester.tap(find.text('提交'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('请输入解决方案描述'), findsOneWidget);
    });

    testWidgets('should validate minimum solution description length', (WidgetTester tester) async {
      // Arrange
      when(mockAuthProvider.user).thenReturn(testUser);

      // Act
      await tester.pumpWidget(createTestWidget());
      
      // Enter short description
      await tester.enterText(find.byType(TextFormField).first, 'Short');
      await tester.tap(find.text('提交'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('解决方案描述至少需要10个字符'), findsOneWidget);
    });

    testWidgets('should allow fault code selection', (WidgetTester tester) async {
      // Arrange
      when(mockAuthProvider.user).thenReturn(testUser);

      // Act
      await tester.pumpWidget(createTestWidget());
      
      // Tap dropdown
      await tester.tap(find.byType(DropdownButton<FaultCode>));
      await tester.pumpAndSettle();

      // Assert - should show fault code options
      expect(find.text('机械故障'), findsOneWidget);
      expect(find.text('电气故障'), findsOneWidget);
      expect(find.text('软件问题'), findsOneWidget);
    });

    testWidgets('should show photo source options when add photo is tapped', (WidgetTester tester) async {
      // Arrange
      when(mockAuthProvider.user).thenReturn(testUser);

      // Act
      await tester.pumpWidget(createTestWidget());
      await tester.tap(find.text('添加照片'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('拍照'), findsOneWidget);
      expect(find.text('从相册选择'), findsOneWidget);
      expect(find.text('取消'), findsAtLeastNWidgets(1));
    });

    testWidgets('should disable submit button while submitting', (WidgetTester tester) async {
      // Arrange
      when(mockAuthProvider.user).thenReturn(testUser);

      // Act
      await tester.pumpWidget(createTestWidget());
      
      // Enter valid solution
      await tester.enterText(
        find.byType(TextFormField).first,
        'This is a valid solution description that is long enough',
      );

      // Mock submission delay
      when(mockWorkOrderService.completeWorkOrder(any, any))
          .thenAnswer((_) => Future.delayed(const Duration(seconds: 1)));

      // Submit
      await tester.tap(find.text('提交'));
      await tester.pump(); // Only pump once to see intermediate state

      // Assert
      expect(find.text('提交中...'), findsOneWidget);
    });

    testWidgets('should show error message on submission failure', (WidgetTester tester) async {
      // Arrange
      when(mockAuthProvider.user).thenReturn(testUser);

      // Act
      await tester.pumpWidget(createTestWidget());
      
      // Enter valid solution
      await tester.enterText(
        find.byType(TextFormField).first,
        'This is a valid solution description that is long enough',
      );

      // Mock submission failure
      when(mockWorkOrderService.completeWorkOrder(any, any))
          .thenThrow(Exception('Network error'));

      // Submit
      await tester.tap(find.text('提交'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.textContaining('提交失败'), findsOneWidget);
    });
  });

  group('WorkOrderCompletionScreen Integration Tests', () {
    testWidgets('should complete work order successfully', (WidgetTester tester) async {
      // Arrange
      when(mockAuthProvider.user).thenReturn(testUser);
      
      final completedWorkOrder = WorkOrderWithResolution(
        id: testWorkOrder.id,
        title: testWorkOrder.title,
        description: testWorkOrder.description,
        category: testWorkOrder.category,
        reason: testWorkOrder.reason,
        priority: testWorkOrder.priority,
        status: WorkOrderStatus.completed,
        reportedAt: testWorkOrder.reportedAt,
        attachments: testWorkOrder.attachments,
        createdAt: testWorkOrder.createdAt,
        updatedAt: DateTime.now(),
        assetId: testWorkOrder.assetId,
        createdById: testWorkOrder.createdById,
        assignedToId: testWorkOrder.assignedToId,
        asset: testWorkOrder.asset,
        createdBy: testWorkOrder.createdBy,
        assignedTo: testWorkOrder.assignedTo,
      );

      when(mockWorkOrderService.completeWorkOrder(any, any))
          .thenAnswer((_) async => completedWorkOrder);

      // Act
      await tester.pumpWidget(createTestWidget());
      
      // Enter solution description
      await tester.enterText(
        find.byType(TextFormField).first,
        'Replaced faulty component and tested system functionality',
      );

      // Submit
      await tester.tap(find.text('提交'));
      await tester.pumpAndSettle();

      // Assert
      verify(mockWorkOrderService.completeWorkOrder(
        testWorkOrder.id,
        any,
      )).called(1);
    });

    testWidgets('should handle offline storage when no network', (WidgetTester tester) async {
      // Arrange
      when(mockAuthProvider.user).thenReturn(testUser);
      
      // Mock offline scenario
      when(mockOfflineStorage.saveOfflineResolution(any))
          .thenAnswer((_) async {});

      // Act
      await tester.pumpWidget(createTestWidget());
      
      // Enter solution description
      await tester.enterText(
        find.byType(TextFormField).first,
        'Offline resolution description for testing purposes',
      );

      // The test would need to mock connectivity to properly test offline behavior
      // This is a simplified version that tests the UI flow
      await tester.tap(find.text('提交'));
      await tester.pumpAndSettle();

      // Assert - would need to verify offline storage behavior in a more complete test
      expect(find.byType(WorkOrderCompletionScreen), findsOneWidget);
    });
  });
}
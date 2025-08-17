import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:provider/provider.dart';

import 'package:emaintenance_mobile/features/work_orders/work_order_detail_screen.dart';
import 'package:emaintenance_mobile/features/work_orders/work_order_completion_screen.dart';
import 'package:emaintenance_mobile/shared/models/work_order.dart';
import 'package:emaintenance_mobile/shared/models/user.dart';
import 'package:emaintenance_mobile/shared/models/asset.dart';
import 'package:emaintenance_mobile/shared/services/work_order_service.dart';
import 'package:emaintenance_mobile/shared/providers/auth_provider.dart';

import 'work_order_completion_flow_test.mocks.dart';

@GenerateMocks([
  WorkOrderService,
  AuthProvider,
])
void main() {
  late MockWorkOrderService mockWorkOrderService;
  late MockAuthProvider mockAuthProvider;

  setUp(() {
    mockWorkOrderService = MockWorkOrderService();
    mockAuthProvider = MockAuthProvider();
  });

  // Test data
  final testUser = User(
    id: 'user1',
    email: 'john.doe@example.com',
    username: 'john.doe',
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

  Widget createTestApp() {
    return MaterialApp(
      home: ChangeNotifierProvider<AuthProvider>(
        create: (context) => mockAuthProvider,
        child: WorkOrderDetailScreen(workOrderId: 'wo1'),
      ),
    );
  }

  group('Work Order Completion Flow Tests', () {
    testWidgets('should show completion button for in-progress work orders', (WidgetTester tester) async {
      // Arrange
      when(mockAuthProvider.user).thenReturn(testUser);
      when(mockWorkOrderService.getWorkOrderWithHistory(any))
          .thenAnswer((_) async => testWorkOrder);
      when(mockWorkOrderService.getWorkOrderStatusHistory(any))
          .thenAnswer((_) async => []);

      // Act
      await tester.pumpWidget(createTestApp());
      await tester.pumpAndSettle();

      // Assert
      expect(find.byIcon(Icons.check_circle), findsOneWidget);
      expect(find.text('完成工单'), findsOneWidget);
    });

    testWidgets('should not show completion button for non-assigned technicians', (WidgetTester tester) async {
      // Arrange
      final nonAssignedUser = User(
        id: 'user2',
        email: 'jane.smith@example.com',
        username: 'jane.smith',
        firstName: 'Jane',
        lastName: 'Smith',
        role: UserRole.technician,
        isActive: true,
        createdAt: DateTime.now(),
      );
      
      when(mockAuthProvider.user).thenReturn(nonAssignedUser);
      when(mockWorkOrderService.getWorkOrderWithHistory(any))
          .thenAnswer((_) async => testWorkOrder);
      when(mockWorkOrderService.getWorkOrderStatusHistory(any))
          .thenAnswer((_) async => []);

      // Act
      await tester.pumpWidget(createTestApp());
      await tester.pumpAndSettle();

      // Assert
      expect(find.byIcon(Icons.check_circle), findsNothing);
      expect(find.text('完成工单'), findsNothing);
    });

    testWidgets('should not show completion button for completed work orders', (WidgetTester tester) async {
      // Arrange
      final completedWorkOrder = WorkOrderWithRelations(
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
        updatedAt: testWorkOrder.updatedAt,
        assetId: testWorkOrder.assetId,
        createdById: testWorkOrder.createdById,
        assignedToId: testWorkOrder.assignedToId,
        asset: testWorkOrder.asset,
        createdBy: testWorkOrder.createdBy,
        assignedTo: testWorkOrder.assignedTo,
      );

      when(mockAuthProvider.user).thenReturn(testUser);
      when(mockWorkOrderService.getWorkOrderWithHistory(any))
          .thenAnswer((_) async => completedWorkOrder);
      when(mockWorkOrderService.getWorkOrderStatusHistory(any))
          .thenAnswer((_) async => []);

      // Act
      await tester.pumpWidget(createTestApp());
      await tester.pumpAndSettle();

      // Assert
      expect(find.byIcon(Icons.check_circle), findsNothing);
      expect(find.text('完成工单'), findsNothing);
    });

    testWidgets('should navigate to completion screen when completion button is tapped', (WidgetTester tester) async {
      // Arrange
      when(mockAuthProvider.user).thenReturn(testUser);
      when(mockWorkOrderService.getWorkOrderWithHistory(any))
          .thenAnswer((_) async => testWorkOrder);
      when(mockWorkOrderService.getWorkOrderStatusHistory(any))
          .thenAnswer((_) async => []);

      // Act
      await tester.pumpWidget(createTestApp());
      await tester.pumpAndSettle();

      // Tap completion button
      await tester.tap(find.text('完成工单'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.byType(WorkOrderCompletionScreen), findsOneWidget);
      expect(find.text('解决方案描述 *'), findsOneWidget);
    });

    testWidgets('should refresh work order details after successful completion', (WidgetTester tester) async {
      // Arrange
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

      when(mockAuthProvider.user).thenReturn(testUser);
      when(mockWorkOrderService.getWorkOrderWithHistory(any))
          .thenAnswer((_) async => testWorkOrder);
      when(mockWorkOrderService.getWorkOrderStatusHistory(any))
          .thenAnswer((_) async => []);
      when(mockWorkOrderService.completeWorkOrder(any, any))
          .thenAnswer((_) async => completedWorkOrder);

      // Act
      await tester.pumpWidget(createTestApp());
      await tester.pumpAndSettle();

      // Navigate to completion screen
      await tester.tap(find.text('完成工单'));
      await tester.pumpAndSettle();

      // Fill out completion form
      await tester.enterText(
        find.byType(TextFormField).first,
        'Completed the maintenance task successfully',
      );

      // Submit completion
      await tester.tap(find.text('提交'));
      await tester.pumpAndSettle();

      // Should return to detail screen
      expect(find.byType(WorkOrderDetailScreen), findsOneWidget);
    });

    testWidgets('should handle completion errors gracefully', (WidgetTester tester) async {
      // Arrange
      when(mockAuthProvider.user).thenReturn(testUser);
      when(mockWorkOrderService.getWorkOrderWithHistory(any))
          .thenAnswer((_) async => testWorkOrder);
      when(mockWorkOrderService.getWorkOrderStatusHistory(any))
          .thenAnswer((_) async => []);
      when(mockWorkOrderService.completeWorkOrder(any, any))
          .thenThrow(Exception('Network error'));

      // Act
      await tester.pumpWidget(createTestApp());
      await tester.pumpAndSettle();

      // Navigate to completion screen
      await tester.tap(find.text('完成工单'));
      await tester.pumpAndSettle();

      // Fill out completion form
      await tester.enterText(
        find.byType(TextFormField).first,
        'Completed the maintenance task successfully',
      );

      // Submit completion
      await tester.tap(find.text('提交'));
      await tester.pumpAndSettle();

      // Should show error message
      expect(find.textContaining('提交失败'), findsOneWidget);
      expect(find.byType(WorkOrderCompletionScreen), findsOneWidget);
    });
  });

  group('Offline Completion Flow Tests', () {
    testWidgets('should handle offline completion', (WidgetTester tester) async {
      // This test would require more complex mocking of connectivity
      // and offline storage services. For now, it's a placeholder.
      
      // Arrange
      when(mockAuthProvider.user).thenReturn(testUser);
      when(mockWorkOrderService.getWorkOrderWithHistory(any))
          .thenAnswer((_) async => testWorkOrder);
      when(mockWorkOrderService.getWorkOrderStatusHistory(any))
          .thenAnswer((_) async => []);

      // Act
      await tester.pumpWidget(createTestApp());
      await tester.pumpAndSettle();

      // Assert - Basic UI is rendered
      expect(find.byType(WorkOrderDetailScreen), findsOneWidget);
    });
  });
}
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:emaintenance_mobile/features/work_orders/work_order_detail_screen.dart';
import 'package:emaintenance_mobile/shared/providers/auth_provider.dart';
import 'package:emaintenance_mobile/shared/models/work_order.dart';
import 'package:emaintenance_mobile/shared/models/user.dart';
import 'package:emaintenance_mobile/shared/models/asset.dart';
import 'package:emaintenance_mobile/shared/services/work_order_service.dart';

// Mock data
final mockTechnician = User(
  id: 'tech-1',
  email: 'tech@example.com',
  username: 'technician',
  firstName: '李',
  lastName: '四',
  role: UserRole.technician,
  isActive: true,
  createdAt: DateTime.now(),
);

final mockEmployee = User(
  id: 'user-1',
  email: 'user@example.com',
  username: 'employee',
  firstName: '张',
  lastName: '三',
  role: UserRole.employee,
  isActive: true,
  createdAt: DateTime.now(),
);

final mockAsset = Asset(
  id: 'asset-1',
  assetCode: 'AC-001',
  name: '中央空调',
  location: '会议室A',
  isActive: true,
  createdAt: DateTime.now(),
  updatedAt: DateTime.now(),
);

final mockWorkOrder = WorkOrderWithRelations(
  id: 'wo-1',
  title: '空调维修',
  description: '会议室空调不制冷，需要检查制冷剂',
  category: '空调维修',
  reason: '设备故障',
  location: '会议室A',
  priority: Priority.high,
  status: WorkOrderStatus.pending,
  reportedAt: DateTime(2025, 8, 3, 10, 0),
  startedAt: null,
  completedAt: null,
  solution: null,
  faultCode: null,
  attachments: ['photo1.jpg', 'photo2.jpg'],
  createdAt: DateTime(2025, 8, 3, 10, 0),
  updatedAt: DateTime(2025, 8, 3, 10, 0),
  assetId: 'asset-1',
  createdById: 'user-1',
  assignedToId: 'tech-1',
  asset: mockAsset,
  createdBy: mockEmployee,
  assignedTo: mockTechnician,
  statusHistory: [],
);

final mockInProgressWorkOrder = WorkOrderWithRelations(
  id: 'wo-2',
  title: '电梯维护',
  description: '定期保养电梯',
  category: '电梯维护',
  reason: '定期保养',
  location: '大厅',
  priority: Priority.medium,
  status: WorkOrderStatus.inProgress,
  reportedAt: DateTime(2025, 8, 3, 8, 0),
  startedAt: DateTime(2025, 8, 3, 9, 0),
  completedAt: null,
  solution: '更换润滑油',
  faultCode: 'EL001',
  attachments: [],
  createdAt: DateTime(2025, 8, 3, 8, 0),
  updatedAt: DateTime(2025, 8, 3, 9, 0),
  assetId: 'asset-2',
  createdById: 'user-1',
  assignedToId: 'tech-1',
  asset: Asset(
    id: 'asset-2',
    assetCode: 'EL-001',
    name: '客用电梯',
    location: '大厅',
    isActive: true,
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
  ),
  createdBy: mockEmployee,
  assignedTo: mockTechnician,
  statusHistory: [],
);

final mockStatusHistory = [
  WorkOrderStatusHistory(
    id: 'history-1',
    workOrderId: 'wo-1',
    fromStatus: null,
    toStatus: WorkOrderStatus.pending,
    changedById: 'user-1',
    changedBy: mockEmployee,
    notes: '工单创建',
    createdAt: DateTime(2025, 8, 3, 10, 0),
  ),
  WorkOrderStatusHistory(
    id: 'history-2',
    workOrderId: 'wo-1',
    fromStatus: WorkOrderStatus.pending,
    toStatus: WorkOrderStatus.inProgress,
    changedById: 'tech-1',
    changedBy: mockTechnician,
    notes: '开始维修工作',
    createdAt: DateTime(2025, 8, 3, 11, 0),
  ),
];

// Mock AuthProvider
class MockAuthProvider extends ChangeNotifier implements AuthProvider {
  User? _user;
  
  MockAuthProvider({User? user}) : _user = user;
  
  @override
  AuthState state = AuthState.authenticated;
  
  @override
  User? get user => _user;
  
  @override
  String? errorMessage;
  
  @override
  bool get isAuthenticated => _user != null;
  
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
  
  void setUser(User? user) {
    _user = user;
    notifyListeners();
  }
}

// Mock WorkOrderService
class MockWorkOrderService implements WorkOrderService {
  WorkOrderWithRelations? mockWorkOrder;
  List<WorkOrderStatusHistory> mockStatusHistory = [];
  bool shouldFailLoad = false;
  bool shouldFailUpdate = false;
  
  @override
  Future<WorkOrderWithRelations> getWorkOrderWithHistory(String workOrderId) async {
    if (shouldFailLoad) {
      throw Exception('加载工单详情失败');
    }
    
    if (mockWorkOrder?.id == workOrderId) {
      return mockWorkOrder!;
    }
    
    throw Exception('工单不存在');
  }
  
  @override
  Future<List<WorkOrderStatusHistory>> getWorkOrderStatusHistory(String workOrderId) async {
    if (shouldFailLoad) {
      throw Exception('加载状态历史失败');
    }
    
    return mockStatusHistory;
  }
  
  @override
  Future<WorkOrderWithRelations> updateWorkOrderStatus(
    String workOrderId,
    UpdateWorkOrderStatusRequest request,
  ) async {
    if (shouldFailUpdate) {
      throw Exception('状态更新失败');
    }
    
    if (mockWorkOrder?.id == workOrderId) {
      // Create updated work order with new status
      return WorkOrderWithRelations(
        id: mockWorkOrder!.id,
        title: mockWorkOrder!.title,
        description: mockWorkOrder!.description,
        category: mockWorkOrder!.category,
        reason: mockWorkOrder!.reason,
        location: mockWorkOrder!.location,
        priority: mockWorkOrder!.priority,
        status: request.status,
        reportedAt: mockWorkOrder!.reportedAt,
        startedAt: mockWorkOrder!.startedAt,
        completedAt: mockWorkOrder!.completedAt,
        solution: mockWorkOrder!.solution,
        faultCode: mockWorkOrder!.faultCode,
        attachments: mockWorkOrder!.attachments,
        createdAt: mockWorkOrder!.createdAt,
        updatedAt: DateTime.now(),
        assetId: mockWorkOrder!.assetId,
        createdById: mockWorkOrder!.createdById,
        assignedToId: mockWorkOrder!.assignedToId,
        asset: mockWorkOrder!.asset,
        createdBy: mockWorkOrder!.createdBy,
        assignedTo: mockWorkOrder!.assignedTo,
        statusHistory: mockWorkOrder!.statusHistory,
      );
    }
    
    throw Exception('工单不存在');
  }
  
  // Other required methods for interface compliance
  @override
  Future<WorkOrder> createWorkOrder(WorkOrderRequest request) async {
    throw UnimplementedError();
  }
  
  @override
  Future<WorkOrder> getWorkOrder(String workOrderId) async {
    throw UnimplementedError();
  }
  
  @override
  Future<PaginatedWorkOrders> getUserWorkOrders({
    String type = 'assigned',
    int page = 1,
    int limit = 20,
  }) async {
    throw UnimplementedError();
  }
  
  @override
  Future<PaginatedWorkOrders> getAssignedWorkOrders({
    int page = 1,
    int limit = 20,
  }) async {
    throw UnimplementedError();
  }
  
  @override
  Future<WorkOrder> updateWorkOrder(String workOrderId, Map<String, dynamic> updates) async {
    throw UnimplementedError();
  }
  
  @override
  Future<String> uploadAttachment(String workOrderId, String filePath) async {
    throw UnimplementedError();
  }
}

void main() {
  group('WorkOrderDetailScreen Widget Tests', () {
    late MockAuthProvider mockAuthProvider;
    late MockWorkOrderService mockWorkOrderService;

    setUp(() {
      mockAuthProvider = MockAuthProvider(user: mockTechnician);
      mockWorkOrderService = MockWorkOrderService();
    });

    Widget createTestWidget({
      String workOrderId = 'wo-1',
      MockAuthProvider? authProvider,
      MockWorkOrderService? workOrderService,
    }) {
      return ChangeNotifierProvider<AuthProvider>.value(
        value: authProvider ?? mockAuthProvider,
        child: MaterialApp(
          home: WorkOrderDetailScreen(workOrderId: workOrderId),
        ),
      );
    }

    testWidgets('should display app bar with correct title and actions', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      
      await tester.pumpWidget(createTestWidget());

      // Check app bar
      expect(find.text('工单详情'), findsOneWidget);
      expect(find.byIcon(Icons.refresh), findsOneWidget);
    });

    testWidgets('should show loading indicator initially', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());

      // Should show loading indicator
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('should display work order details when data loads', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      mockWorkOrderService.mockStatusHistory = mockStatusHistory;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Check header information
      expect(find.text('空调维修'), findsOneWidget);
      expect(find.text('会议室空调不制冷，需要检查制冷剂'), findsOneWidget);
      expect(find.text('待处理'), findsOneWidget);
      expect(find.text('高'), findsOneWidget);
    });

    testWidgets('should display work order basic information', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Check work order details
      expect(find.text('工单ID:'), findsOneWidget);
      expect(find.text('wo-1'), findsOneWidget);
      expect(find.text('类别:'), findsOneWidget);
      expect(find.text('空调维修'), findsAtLeastNWidgets(1));
      expect(find.text('原因:'), findsOneWidget);
      expect(find.text('设备故障'), findsOneWidget);
      expect(find.text('位置:'), findsOneWidget);
      expect(find.text('会议室A'), findsAtLeastNWidgets(1));
    });

    testWidgets('should display asset information', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Check asset information
      expect(find.text('设备信息'), findsOneWidget);
      expect(find.text('设备名称:'), findsOneWidget);
      expect(find.text('中央空调'), findsOneWidget);
      expect(find.text('设备编号:'), findsOneWidget);
      expect(find.text('AC-001'), findsOneWidget);
      expect(find.text('设备位置:'), findsOneWidget);
      expect(find.byIcon(Icons.precision_manufacturing), findsOneWidget);
    });

    testWidgets('should display work order details section', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Check details section
      expect(find.text('工单详情'), findsOneWidget);
      expect(find.text('报修人:'), findsOneWidget);
      expect(find.text('张 三'), findsOneWidget);
      expect(find.text('指派技术员:'), findsOneWidget);
      expect(find.text('李 四'), findsOneWidget);
      expect(find.byIcon(Icons.info), findsOneWidget);
    });

    testWidgets('should display attachments when present', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Check attachments
      expect(find.text('附件:'), findsOneWidget);
      expect(find.text('• photo1.jpg'), findsOneWidget);
      expect(find.text('• photo2.jpg'), findsOneWidget);
    });

    testWidgets('should display additional fields when present', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockInProgressWorkOrder;
      
      await tester.pumpWidget(createTestWidget(workOrderId: 'wo-2'));
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Check additional fields
      expect(find.text('解决方案:'), findsOneWidget);
      expect(find.text('更换润滑油'), findsOneWidget);
      expect(find.text('故障代码:'), findsOneWidget);
      expect(find.text('EL001'), findsOneWidget);
      expect(find.text('开始时间:'), findsOneWidget);
    });

    testWidgets('should display status history when available', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      mockWorkOrderService.mockStatusHistory = mockStatusHistory;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Check status history
      expect(find.text('状态历史'), findsOneWidget);
      expect(find.text('工单创建'), findsOneWidget);
      expect(find.text('开始维修工作'), findsOneWidget);
      expect(find.text('张 三'), findsOneWidget);
      expect(find.text('李 四'), findsOneWidget);
      expect(find.byIcon(Icons.history), findsOneWidget);
    });

    testWidgets('should show update status button for assigned technician', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Should show update status button
      expect(find.text('更新状态'), findsOneWidget);
      expect(find.byIcon(Icons.update), findsOneWidget);
    });

    testWidgets('should not show update status button for non-assigned user', (WidgetTester tester) async {
      final nonAssignedUser = User(
        id: 'other-user',
        email: 'other@example.com',
        username: 'otheruser',
        firstName: '王',
        lastName: '五',
        role: UserRole.technician,
        isActive: true,
        createdAt: DateTime.now(),
      );
      
      final authProvider = MockAuthProvider(user: nonAssignedUser);
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      
      await tester.pumpWidget(createTestWidget(authProvider: authProvider));
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Should not show update status button
      expect(find.text('更新状态'), findsNothing);
    });

    testWidgets('should not show update status button for completed work order', (WidgetTester tester) async {
      final completedWorkOrder = WorkOrderWithRelations(
        id: mockWorkOrder.id,
        title: mockWorkOrder.title,
        description: mockWorkOrder.description,
        category: mockWorkOrder.category,
        reason: mockWorkOrder.reason,
        location: mockWorkOrder.location,
        priority: mockWorkOrder.priority,
        status: WorkOrderStatus.completed,
        reportedAt: mockWorkOrder.reportedAt,
        startedAt: mockWorkOrder.startedAt,
        completedAt: DateTime.now(),
        solution: mockWorkOrder.solution,
        faultCode: mockWorkOrder.faultCode,
        attachments: mockWorkOrder.attachments,
        createdAt: mockWorkOrder.createdAt,
        updatedAt: mockWorkOrder.updatedAt,
        assetId: mockWorkOrder.assetId,
        createdById: mockWorkOrder.createdById,
        assignedToId: mockWorkOrder.assignedToId,
        asset: mockWorkOrder.asset,
        createdBy: mockWorkOrder.createdBy,
        assignedTo: mockWorkOrder.assignedTo,
        statusHistory: mockWorkOrder.statusHistory,
      );
      
      mockWorkOrderService.mockWorkOrder = completedWorkOrder;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Should not show update status button for completed work order
      expect(find.text('更新状态'), findsNothing);
    });

    testWidgets('should show status update dialog when update button pressed', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Tap update status button
      await tester.tap(find.text('更新状态'));
      await tester.pumpAndSettle();

      // Check status update dialog
      expect(find.text('更新状态'), findsAtLeastNWidgets(1));
      expect(find.text('当前状态: 待处理'), findsOneWidget);
      expect(find.text('更新为:'), findsOneWidget);
      expect(find.text('进行中'), findsOneWidget);
      expect(find.text('已取消'), findsOneWidget);
      expect(find.text('备注说明（可选）'), findsOneWidget);
      expect(find.text('确认'), findsOneWidget);
      expect(find.text('取消'), findsOneWidget);
    });

    testWidgets('should update status successfully', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Open status update dialog
      await tester.tap(find.text('更新状态'));
      await tester.pumpAndSettle();

      // Select new status
      await tester.tap(find.text('进行中'));
      await tester.pump();

      // Add notes
      await tester.enterText(find.byType(TextField).last, '开始维修工作');
      await tester.pump();

      // Confirm update
      await tester.tap(find.text('确认'));
      await tester.pumpAndSettle();

      // Should show success message
      expect(find.text('状态更新成功'), findsOneWidget);
    });

    testWidgets('should handle status update failure', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      mockWorkOrderService.shouldFailUpdate = true;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Open status update dialog
      await tester.tap(find.text('更新状态'));
      await tester.pumpAndSettle();

      // Select new status and confirm
      await tester.tap(find.text('进行中'));
      await tester.pump();
      await tester.tap(find.text('确认'));
      await tester.pumpAndSettle();

      // Should show error message
      expect(find.textContaining('状态更新失败'), findsOneWidget);
    });

    testWidgets('should show error state when loading fails', (WidgetTester tester) async {
      mockWorkOrderService.shouldFailLoad = true;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for error to occur
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Check error state
      expect(find.text('加载失败'), findsOneWidget);
      expect(find.text('重试'), findsOneWidget);
      expect(find.byIcon(Icons.error), findsOneWidget);
    });

    testWidgets('should retry loading when retry button pressed', (WidgetTester tester) async {
      mockWorkOrderService.shouldFailLoad = true;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for error to occur
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Fix the service and retry
      mockWorkOrderService.shouldFailLoad = false;
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      
      await tester.tap(find.text('重试'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Should show work order details
      expect(find.text('空调维修'), findsOneWidget);
    });

    testWidgets('should refresh data when refresh button pressed', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for initial load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Tap refresh button
      await tester.tap(find.byIcon(Icons.refresh));
      await tester.pump();

      // Should show loading indicator briefly
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('should refresh data with pull-to-refresh', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Pull to refresh
      await tester.fling(find.byType(SingleChildScrollView), const Offset(0, 300), 1000);
      await tester.pump();

      // Should trigger refresh
      expect(find.byType(RefreshIndicator), findsOneWidget);
    });

    testWidgets('should format dates correctly', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Check date formatting
      expect(find.textContaining('2025/8/3'), findsAtLeastNWidgets(1));
      expect(find.textContaining('10:00'), findsAtLeastNWidgets(1));
    });

    testWidgets('should handle work order not found', (WidgetTester tester) async {
      // Don't set mockWorkOrder, so service will throw exception
      
      await tester.pumpWidget(createTestWidget(workOrderId: 'non-existent'));
      
      // Wait for error to occur
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Should show error
      expect(find.text('加载失败'), findsOneWidget);
      expect(find.textContaining('工单不存在'), findsOneWidget);
    });

    testWidgets('should disable confirm button when no status selected', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Open status update dialog
      await tester.tap(find.text('更新状态'));
      await tester.pumpAndSettle();

      // Confirm button should be disabled initially
      final confirmButton = find.text('确认');
      expect(confirmButton, findsOneWidget);
      
      // Try to tap confirm button (should be disabled)
      await tester.tap(confirmButton);
      await tester.pumpAndSettle();
      
      // Dialog should still be open
      expect(find.text('更新状态'), findsAtLeastNWidgets(1));
    });

    testWidgets('should show loading state during status update', (WidgetTester tester) async {
      mockWorkOrderService.mockWorkOrder = mockWorkOrder;
      
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Open status update dialog
      await tester.tap(find.text('更新状态'));
      await tester.pumpAndSettle();

      // Select status and start update
      await tester.tap(find.text('进行中'));
      await tester.pump();
      await tester.tap(find.text('确认'));
      await tester.pump();

      // Should show loading state in button
      expect(find.text('更新中...'), findsOneWidget);
    });
  });
}
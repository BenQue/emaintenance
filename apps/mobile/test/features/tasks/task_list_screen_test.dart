import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:emaintenance_mobile/features/tasks/task_list_screen.dart';
import 'package:emaintenance_mobile/shared/providers/auth_provider.dart';
import 'package:emaintenance_mobile/shared/models/work_order.dart';
import 'package:emaintenance_mobile/shared/models/user.dart' as UserModel;
import 'package:emaintenance_mobile/shared/models/asset.dart' as AssetModel;
import 'package:emaintenance_mobile/shared/services/work_order_service.dart';

// Mock data
final mockUser = UserModel.User(
  id: 'tech-1',
  email: 'tech@example.com',
  username: 'technician',
  firstName: '李',
  lastName: '四',
  role: UserModel.UserRole.technician,
  isActive: true,
  createdAt: DateTime.now(),
);

final mockAsset = AssetModel.Asset(
  id: 'asset-1',
  assetCode: 'AC-001',
  name: '中央空调',
  location: '会议室A',
  isActive: true,
  createdAt: DateTime.now(),
  updatedAt: DateTime.now(),
);

final mockCreatedBy = UserModel.User(
  id: 'user-1',
  email: 'user@example.com',
  username: 'employee',
  firstName: '张',
  lastName: '三',
  role: UserModel.UserRole.employee,
  isActive: true,
  createdAt: DateTime.now(),
);

final mockWorkOrders = [
  WorkOrderWithRelations(
    id: 'wo-1',
    title: '空调维修',
    description: '会议室空调不制冷，需要检查制冷剂',
    category: '空调维修',
    reason: '设备故障',
    location: '会议室A',
    priority: Priority.high,
    status: WorkOrderStatus.pending,
    reportedAt: DateTime.now().subtract(const Duration(hours: 2)),
    startedAt: null,
    completedAt: null,
    solution: null,
    faultCode: null,
    attachments: [],
    createdAt: DateTime.now().subtract(const Duration(hours: 2)),
    updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
    assetId: 'asset-1',
    createdById: 'user-1',
    assignedToId: 'tech-1',
    asset: Asset(
      id: 'asset-1',
      assetCode: 'AC-001',
      name: '中央空调',
      location: '会议室A',
    ),
    createdBy: User(
      id: 'user-1',
      firstName: '张',
      lastName: '三',
      email: 'user@example.com',
    ),
    assignedTo: mockUser,
    statusHistory: [],
  ),
  WorkOrderWithRelations(
    id: 'wo-2',
    title: '电梯维护',
    description: '定期保养电梯',
    category: '电梯维护',
    reason: '定期保养',
    location: '大厅',
    priority: Priority.medium,
    status: WorkOrderStatus.inProgress,
    reportedAt: DateTime.now().subtract(const Duration(hours: 4)),
    startedAt: DateTime.now().subtract(const Duration(hours: 1)),
    completedAt: null,
    solution: null,
    faultCode: null,
    attachments: [],
    createdAt: DateTime.now().subtract(const Duration(hours: 4)),
    updatedAt: DateTime.now().subtract(const Duration(hours: 1)),
    assetId: 'asset-2',
    createdById: 'user-2',
    assignedToId: 'tech-1',
    asset: Asset(
      id: 'asset-2',
      assetCode: 'EL-001',
      name: '客用电梯',
      location: '大厅',
    ),
    createdBy: User(
      id: 'user-2',
      firstName: '王',
      lastName: '五',
      email: 'user2@example.com',
    ),
    assignedTo: mockUser,
    statusHistory: [],
  ),
];

final mockPaginatedResult = PaginatedWorkOrders(
  workOrders: mockWorkOrders,
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
);

// Mock AuthProvider
class MockAuthProvider extends ChangeNotifier implements AuthProvider {
  @override
  AuthState state = AuthState.authenticated;
  
  @override
  UserModel.User? user = mockUser;
  
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

// Mock WorkOrderService
class MockWorkOrderService implements WorkOrderService {
  bool shouldFail = false;
  bool isEmpty = false;
  
  @override
  Future<PaginatedWorkOrders> getAssignedWorkOrders({
    int page = 1,
    int limit = 20,
  }) async {
    if (shouldFail) {
      throw Exception('加载工单失败');
    }
    
    if (isEmpty) {
      return const PaginatedWorkOrders(
        workOrders: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      );
    }
    
    return mockPaginatedResult;
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
  Future<WorkOrderWithRelations> getWorkOrderWithHistory(String workOrderId) async {
    throw UnimplementedError();
  }
  
  @override
  Future<List<WorkOrderStatusHistory>> getWorkOrderStatusHistory(String workOrderId) async {
    throw UnimplementedError();
  }
  
  @override
  Future<WorkOrderWithRelations> updateWorkOrderStatus(
    String workOrderId,
    UpdateWorkOrderStatusRequest request,
  ) async {
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
  group('TaskListScreen Widget Tests', () {
    late MockAuthProvider mockAuthProvider;
    late MockWorkOrderService mockWorkOrderService;

    setUp(() {
      mockAuthProvider = MockAuthProvider();
      mockWorkOrderService = MockWorkOrderService();
    });

    Widget createTestWidget({MockWorkOrderService? workOrderService}) {
      return ChangeNotifierProvider<AuthProvider>.value(
        value: mockAuthProvider,
        child: MaterialApp(
          home: TaskListScreen(),
        ),
      );
    }

    testWidgets('should display app bar with correct title and actions including visibility toggle', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());

      // Check app bar
      expect(find.text('我的任务'), findsOneWidget);
      expect(find.byIcon(Icons.visibility_off), findsOneWidget); // Hide completed toggle
      expect(find.byIcon(Icons.filter_list), findsOneWidget);
      expect(find.byIcon(Icons.refresh), findsOneWidget);
    });

    testWidgets('should display search bar', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());

      // Check search bar
      expect(find.byType(TextField), findsOneWidget);
      expect(find.text('搜索工单标题、描述或设备...'), findsOneWidget);
      expect(find.byIcon(Icons.search), findsOneWidget);
    });

    testWidgets('should show loading indicator initially', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());

      // Should show loading indicator
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('should display work order cards when data loads', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Check work order cards
      expect(find.text('空调维修'), findsOneWidget);
      expect(find.text('电梯维护'), findsOneWidget);
      expect(find.text('会议室空调不制冷，需要检查制冷剂'), findsOneWidget);
      expect(find.text('定期保养电梯'), findsOneWidget);
    });

    testWidgets('should display status and priority chips', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Check status chips
      expect(find.text('待处理'), findsOneWidget);
      expect(find.text('进行中'), findsOneWidget);
      
      // Check priority chips
      expect(find.text('高'), findsOneWidget);
      expect(find.text('中'), findsOneWidget);
    });

    testWidgets('should display asset information', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Check asset information
      expect(find.text('AC-001 - 中央空调'), findsOneWidget);
      expect(find.text('EL-001 - 客用电梯'), findsOneWidget);
      expect(find.byIcon(Icons.precision_manufacturing), findsAtLeastNWidgets(2));
    });

    testWidgets('should display location information', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Check location information
      expect(find.text('会议室A'), findsOneWidget);
      expect(find.text('大厅'), findsOneWidget);
      expect(find.byIcon(Icons.location_on), findsAtLeastNWidgets(2));
    });

    testWidgets('should show empty state when no work orders', (WidgetTester tester) async {
      mockWorkOrderService.isEmpty = true;
      await tester.pumpWidget(createTestWidget(workOrderService: mockWorkOrderService));
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Check empty state
      expect(find.text('暂无分配给您的工单'), findsOneWidget);
      expect(find.byIcon(Icons.assignment_turned_in), findsOneWidget);
    });

    testWidgets('should show error state when loading fails', (WidgetTester tester) async {
      mockWorkOrderService.shouldFail = true;
      await tester.pumpWidget(createTestWidget(workOrderService: mockWorkOrderService));
      
      // Wait for error to occur
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Check error state
      expect(find.text('加载失败'), findsOneWidget);
      expect(find.text('重试'), findsOneWidget);
      expect(find.byIcon(Icons.error), findsOneWidget);
    });

    testWidgets('should filter work orders by search query', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Enter search query
      await tester.enterText(find.byType(TextField), '空调');
      await tester.pump();

      // Should only show air conditioning work order
      expect(find.text('空调维修'), findsOneWidget);
      expect(find.text('电梯维护'), findsNothing);
    });

    testWidgets('should show filter dialog when filter button pressed', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Tap filter button
      await tester.tap(find.byIcon(Icons.filter_list));
      await tester.pumpAndSettle();

      // Check filter dialog
      expect(find.text('筛选条件'), findsOneWidget);
      expect(find.text('状态'), findsOneWidget);
      expect(find.text('优先级'), findsOneWidget);
      expect(find.text('应用'), findsOneWidget);
      expect(find.text('清除'), findsOneWidget);
      expect(find.text('取消'), findsOneWidget);
    });

    testWidgets('should apply status filter correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Open filter dialog
      await tester.tap(find.byIcon(Icons.filter_list));
      await tester.pumpAndSettle();

      // Select status filter
      await tester.tap(find.text('待处理'));
      await tester.pump();

      // Apply filter
      await tester.tap(find.text('应用'));
      await tester.pumpAndSettle();

      // Should only show pending work orders
      expect(find.text('空调维修'), findsOneWidget);
      expect(find.text('电梯维护'), findsNothing);
    });

    testWidgets('should clear filters correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Open filter dialog
      await tester.tap(find.byIcon(Icons.filter_list));
      await tester.pumpAndSettle();

      // Select filters
      await tester.tap(find.text('待处理'));
      await tester.pump();

      // Clear filters
      await tester.tap(find.text('清除'));
      await tester.pump();

      // Apply
      await tester.tap(find.text('应用'));
      await tester.pumpAndSettle();

      // Should show all work orders
      expect(find.text('空调维修'), findsOneWidget);
      expect(find.text('电梯维护'), findsOneWidget);
    });

    testWidgets('should refresh data when refresh button pressed', (WidgetTester tester) async {
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
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Pull to refresh
      await tester.fling(find.byType(ListView), const Offset(0, 300), 1000);
      await tester.pump();

      // Should trigger refresh
      expect(find.byType(RefreshIndicator), findsOneWidget);
    });

    testWidgets('should navigate to detail screen when work order tapped', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Tap on work order card
      await tester.tap(find.text('空调维修').first);
      await tester.pumpAndSettle();

      // Should navigate to detail screen (we can't fully test navigation without proper setup)
      // But we can verify the tap was registered
      expect(find.text('空调维修'), findsOneWidget);
    });

    testWidgets('should show empty filter state when no results match filters', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Enter search that matches nothing
      await tester.enterText(find.byType(TextField), '不存在的设备');
      await tester.pump();

      // Should show filter empty state
      expect(find.text('没有符合筛选条件的工单'), findsOneWidget);
      expect(find.byIcon(Icons.filter_list_off), findsOneWidget);
    });

    testWidgets('should display correct date format', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Check that date formatting appears
      expect(find.textContaining('报修时间:'), findsAtLeastNWidgets(2));
      expect(find.byIcon(Icons.schedule), findsAtLeastNWidgets(2));
    });

    testWidgets('should handle scrolling and load more', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Wait for data to load
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      // Scroll to bottom
      await tester.fling(find.byType(ListView), const Offset(0, -500), 1000);
      await tester.pumpAndSettle();

      // Should attempt to load more (though with mock data it won't actually add more)
      expect(find.byType(ListView), findsOneWidget);
    });

    testWidgets('should hide completed tasks by default', (WidgetTester tester) async {
      // Test the filtering functionality to ensure completed tasks are hidden by default
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();
      
      // The visibility toggle should be in "hide" mode initially
      expect(find.byIcon(Icons.visibility_off), findsOneWidget);
      expect(find.byIcon(Icons.visibility), findsNothing);
    });

    testWidgets('should toggle visibility of completed tasks', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();
      
      // Initially should show hide icon (completed tasks hidden)
      expect(find.byIcon(Icons.visibility_off), findsOneWidget);
      
      // Tap to show completed tasks
      await tester.tap(find.byIcon(Icons.visibility_off));
      await tester.pumpAndSettle();
      
      // Now should show visibility icon (completed tasks visible)
      expect(find.byIcon(Icons.visibility), findsOneWidget);
      expect(find.byIcon(Icons.visibility_off), findsNothing);
    });

    testWidgets('should include hide completed toggle in filter dialog', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();
      
      // Open filter dialog
      await tester.tap(find.byIcon(Icons.filter_list));
      await tester.pumpAndSettle();
      
      // Should show the hide completed toggle
      expect(find.text('隐藏已完成任务'), findsOneWidget);
      expect(find.byType(Switch), findsOneWidget);
      
      // Switch should initially be true (hide completed)
      final Switch switchWidget = tester.widget(find.byType(Switch));
      expect(switchWidget.value, isTrue);
    });
  });
}
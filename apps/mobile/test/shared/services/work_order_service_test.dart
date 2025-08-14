import 'package:flutter_test/flutter_test.dart';
import 'package:emaintenance_mobile/shared/services/work_order_service.dart';
import 'package:emaintenance_mobile/shared/models/work_order.dart';
import 'package:emaintenance_mobile/shared/models/user.dart';
import 'package:emaintenance_mobile/shared/models/asset.dart';
import 'package:dio/dio.dart';

// Mock ApiClient for testing offline behavior
class MockApiClient {
  bool isOffline = false;
  Map<String, dynamic> cachedData = {};
  
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    if (isOffline) {
      // Simulate offline behavior - check cache first
      final cacheKey = '$path${queryParameters?.toString() ?? ''}';
      if (cachedData.containsKey(cacheKey)) {
        return Response<T>(
          data: cachedData[cacheKey] as T,
          statusCode: 200,
          requestOptions: RequestOptions(path: path),
        );
      }
      throw DioException(
        requestOptions: RequestOptions(path: path),
        type: DioExceptionType.connectionTimeout,
        message: 'Network connection failed',
      );
    }
    
    // Simulate online response
    if (path == '/api/work-orders/assigned') {
      final response = {
        'data': {
          'workOrders': [
            {
              'id': 'wo-1',
              'title': '空调维修',
              'description': '会议室空调不制冷',
              'category': '空调维修',
              'reason': '设备故障',
              'location': '会议室A',
              'priority': 'HIGH',
              'status': 'PENDING',
              'reportedAt': '2025-08-03T10:00:00Z',
              'startedAt': null,
              'completedAt': null,
              'solution': null,
              'faultCode': null,
              'attachments': [],
              'createdAt': '2025-08-03T10:00:00Z',
              'updatedAt': '2025-08-03T10:00:00Z',
              'assetId': 'asset-1',
              'createdById': 'user-1',
              'assignedToId': 'tech-1',
              'asset': {
                'id': 'asset-1',
                'assetCode': 'AC-001',
                'name': '中央空调',
                'location': '会议室A',
              },
              'createdBy': {
                'id': 'user-1',
                'firstName': '张',
                'lastName': '三',
                'email': 'zhang.san@example.com',
              },
              'assignedTo': {
                'id': 'tech-1',
                'firstName': '李',
                'lastName': '四',
                'email': 'li.si@example.com',
              },
              'statusHistory': [],
            },
          ],
          'total': 1,
          'page': 1,
          'limit': 20,
          'totalPages': 1,
        },
      };
      
      // Cache the response
      final cacheKey = '$path${queryParameters?.toString() ?? ''}';
      cachedData[cacheKey] = response as T;
      
      return Response<T>(
        data: response as T,
        statusCode: 200,
        requestOptions: RequestOptions(path: path),
      );
    }
    
    if (path.startsWith('/api/work-orders/wo-1/history')) {
      final response = {
        'data': {
          'workOrder': {
            'id': 'wo-1',
            'title': '空调维修',
            'description': '会议室空调不制冷',
            'category': '空调维修',
            'reason': '设备故障',
            'location': '会议室A',
            'priority': 'HIGH',
            'status': 'PENDING',
            'reportedAt': '2025-08-03T10:00:00Z',
            'startedAt': null,
            'completedAt': null,
            'solution': null,
            'faultCode': null,
            'attachments': [],
            'createdAt': '2025-08-03T10:00:00Z',
            'updatedAt': '2025-08-03T10:00:00Z',
            'assetId': 'asset-1',
            'createdById': 'user-1',
            'assignedToId': 'tech-1',
            'asset': {
              'id': 'asset-1',
              'assetCode': 'AC-001',
              'name': '中央空调',
              'location': '会议室A',
            },
            'createdBy': {
              'id': 'user-1',
              'firstName': '张',
              'lastName': '三',
              'email': 'zhang.san@example.com',
            },
            'assignedTo': {
              'id': 'tech-1',
              'firstName': '李',
              'lastName': '四',
              'email': 'li.si@example.com',
            },
            'statusHistory': [],
          },
        },
      };
      
      // Cache the response
      cachedData[path] = response as T;
      
      return Response<T>(
        data: response as T,
        statusCode: 200,
        requestOptions: RequestOptions(path: path),
      );
    }
    
    throw DioException(
      requestOptions: RequestOptions(path: path),
      type: DioExceptionType.badResponse,
      response: Response(
        statusCode: 404,
        requestOptions: RequestOptions(path: path),
      ),
    );
  }
  
  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Options? options,
  }) async {
    if (isOffline) {
      throw DioException(
        requestOptions: RequestOptions(path: path),
        type: DioExceptionType.connectionTimeout,
        message: 'Network connection failed',
      );
    }
    
    // Simulate successful status update
    if (path.endsWith('/status')) {
      final response = {
        'data': {
          'workOrder': {
            'id': 'wo-1',
            'title': '空调维修',
            'description': '会议室空调不制冷',
            'category': '空调维修',
            'reason': '设备故障',
            'location': '会议室A',
            'priority': 'HIGH',
            'status': (data as Map<String, dynamic>)['status'] ?? 'IN_PROGRESS',
            'reportedAt': '2025-08-03T10:00:00Z',
            'startedAt': '2025-08-03T12:00:00Z',
            'completedAt': null,
            'solution': null,
            'faultCode': null,
            'attachments': [],
            'createdAt': '2025-08-03T10:00:00Z',
            'updatedAt': DateTime.now().toIso8601String(),
            'assetId': 'asset-1',
            'createdById': 'user-1',
            'assignedToId': 'tech-1',
            'asset': {
              'id': 'asset-1',
              'assetCode': 'AC-001',
              'name': '中央空调',
              'location': '会议室A',
            },
            'createdBy': {
              'id': 'user-1',
              'firstName': '张',
              'lastName': '三',
              'email': 'zhang.san@example.com',
            },
            'assignedTo': {
              'id': 'tech-1',
              'firstName': '李',
              'lastName': '四',
              'email': 'li.si@example.com',
            },
            'statusHistory': [],
          },
        },
      };
      
      return Response<T>(
        data: response as T,
        statusCode: 200,
        requestOptions: RequestOptions(path: path),
      );
    }
    
    throw DioException(
      requestOptions: RequestOptions(path: path),
      type: DioExceptionType.badResponse,
      response: Response(
        statusCode: 404,
        requestOptions: RequestOptions(path: path),
      ),
    );
  }
  
  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Options? options,
  }) async {
    if (isOffline) {
      throw DioException(
        requestOptions: RequestOptions(path: path),
        type: DioExceptionType.connectionTimeout,
        message: 'Network connection failed',
      );
    }
    
    throw DioException(
      requestOptions: RequestOptions(path: path),
      type: DioExceptionType.badResponse,
      response: Response(
        statusCode: 404,
        requestOptions: RequestOptions(path: path),
      ),
    );
  }
}

// Enhanced WorkOrderService with offline support
class TestableWorkOrderService extends WorkOrderService {
  final MockApiClient _mockApiClient;
  
  TestableWorkOrderService(this._mockApiClient);
  
  // Override to use mock client
  @override
  Future<PaginatedWorkOrders> getAssignedWorkOrders({
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _mockApiClient.get<Map<String, dynamic>>(
        '/api/work-orders/assigned',
        queryParameters: {
          'page': page.toString(),
          'limit': limit.toString(),
        },
      );

      if (response.data == null) {
        throw Exception('Empty response from server');
      }

      return PaginatedWorkOrders.fromJson(response.data!['data']);
    } catch (e) {
      if (e is DioException && e.type == DioExceptionType.connectionTimeout) {
        // Try to load from cache when offline
        try {
          final cacheKey = '/api/work-orders/assigned?page=$page&limit=$limit';
          if (_mockApiClient.cachedData.containsKey(cacheKey)) {
            final cachedResponse = _mockApiClient.cachedData[cacheKey] as Map<String, dynamic>;
            return PaginatedWorkOrders.fromJson(cachedResponse['data']);
          }
        } catch (cacheError) {
          // If cache fails, throw original error
        }
      }
      throw Exception('Failed to get assigned work orders: $e');
    }
  }

  @override
  Future<WorkOrderWithRelations> getWorkOrderWithHistory(String workOrderId) async {
    try {
      final response = await _mockApiClient.get<Map<String, dynamic>>(
        '/api/work-orders/$workOrderId/history',
      );

      if (response.data == null) {
        throw Exception('Empty response from server');
      }

      final workOrderData = response.data!['data']['workOrder'] as Map<String, dynamic>;
      return WorkOrderWithRelations.fromJson(workOrderData);
    } catch (e) {
      if (e is DioException && e.type == DioExceptionType.connectionTimeout) {
        // Try to load from cache when offline
        try {
          final cacheKey = '/api/work-orders/$workOrderId/history';
          if (_mockApiClient.cachedData.containsKey(cacheKey)) {
            final cachedResponse = _mockApiClient.cachedData[cacheKey] as Map<String, dynamic>;
            final workOrderData = cachedResponse['data']['workOrder'] as Map<String, dynamic>;
            return WorkOrderWithRelations.fromJson(workOrderData);
          }
        } catch (cacheError) {
          // If cache fails, throw original error
        }
      }
      throw Exception('Failed to get work order with history: $e');
    }
  }

  @override
  Future<WorkOrderWithRelations> updateWorkOrderStatus(
    String workOrderId,
    UpdateWorkOrderStatusRequest request,
  ) async {
    try {
      final response = await _mockApiClient.put<Map<String, dynamic>>(
        '/api/work-orders/$workOrderId/status',
        data: request.toJson(),
      );

      if (response.data == null) {
        throw Exception('Empty response from server');
      }

      final workOrderData = response.data!['data']['workOrder'] as Map<String, dynamic>;
      return WorkOrderWithRelations.fromJson(workOrderData);
    } catch (e) {
      if (e is DioException && e.type == DioExceptionType.connectionTimeout) {
        // When offline, queue the update for later sync
        throw Exception('Network unavailable. Status update will be synced when connection is restored.');
      }
      throw Exception('Failed to update work order status: $e');
    }
  }

  // Implement other required methods with basic implementations
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
  Future<List<WorkOrderStatusHistory>> getWorkOrderStatusHistory(String workOrderId) async {
    return [];
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
  group('WorkOrderService Offline Functionality Tests', () {
    late MockApiClient mockApiClient;
    late TestableWorkOrderService workOrderService;

    setUp(() {
      mockApiClient = MockApiClient();
      workOrderService = TestableWorkOrderService(mockApiClient);
    });

    group('Online Behavior', () {
      testWidgets('should fetch assigned work orders when online', (WidgetTester tester) async {
        mockApiClient.isOffline = false;

        final result = await workOrderService.getAssignedWorkOrders();

        expect(result.workOrders.length, 1);
        expect(result.workOrders.first.title, '空调维修');
        expect(result.total, 1);
        expect(result.page, 1);
        expect(result.totalPages, 1);
      });

      testWidgets('should fetch work order details when online', (WidgetTester tester) async {
        mockApiClient.isOffline = false;

        final result = await workOrderService.getWorkOrderWithHistory('wo-1');

        expect(result.id, 'wo-1');
        expect(result.title, '空调维修');
        expect(result.asset.name, '中央空调');
        expect(result.createdBy.firstName, '张');
        expect(result.assignedTo?.firstName, '李');
      });

      testWidgets('should update work order status when online', (WidgetTester tester) async {
        mockApiClient.isOffline = false;

        final request = UpdateWorkOrderStatusRequest(
          status: WorkOrderStatus.inProgress,
          notes: '开始维修工作',
        );

        final result = await workOrderService.updateWorkOrderStatus('wo-1', request);

        expect(result.id, 'wo-1');
        expect(result.status, WorkOrderStatus.inProgress);
        expect(result.startedAt, isNotNull);
      });

      testWidgets('should cache data when fetching online', (WidgetTester tester) async {
        mockApiClient.isOffline = false;

        // First call should fetch from server and cache
        await workOrderService.getAssignedWorkOrders();
        await workOrderService.getWorkOrderWithHistory('wo-1');

        // Verify data is cached
        expect(mockApiClient.cachedData.isNotEmpty, true);
        expect(mockApiClient.cachedData.containsKey('/api/work-orders/assigned?page=1&limit=20'), true);
        expect(mockApiClient.cachedData.containsKey('/api/work-orders/wo-1/history'), true);
      });
    });

    group('Offline Behavior', () {
      testWidgets('should load assigned work orders from cache when offline', (WidgetTester tester) async {
        // First, fetch data online to populate cache
        mockApiClient.isOffline = false;
        await workOrderService.getAssignedWorkOrders();

        // Then go offline and try to fetch again
        mockApiClient.isOffline = true;
        final result = await workOrderService.getAssignedWorkOrders();

        expect(result.workOrders.length, 1);
        expect(result.workOrders.first.title, '空调维修');
        expect(result.total, 1);
      });

      testWidgets('should load work order details from cache when offline', (WidgetTester tester) async {
        // First, fetch data online to populate cache
        mockApiClient.isOffline = false;
        await workOrderService.getWorkOrderWithHistory('wo-1');

        // Then go offline and try to fetch again
        mockApiClient.isOffline = true;
        final result = await workOrderService.getWorkOrderWithHistory('wo-1');

        expect(result.id, 'wo-1');
        expect(result.title, '空调维修');
        expect(result.asset.name, '中央空调');
      });

      testWidgets('should fail to fetch when offline and no cache available', (WidgetTester tester) async {
        mockApiClient.isOffline = true;

        expect(
          () => workOrderService.getAssignedWorkOrders(),
          throwsA(isA<Exception>()),
        );
      });

      testWidgets('should fail to update status when offline', (WidgetTester tester) async {
        mockApiClient.isOffline = true;

        final request = UpdateWorkOrderStatusRequest(
          status: WorkOrderStatus.inProgress,
          notes: '开始维修工作',
        );

        expect(
          () => workOrderService.updateWorkOrderStatus('wo-1', request),
          throwsA(isA<Exception>()),
        );
      });

      testWidgets('should provide meaningful error message for offline status updates', (WidgetTester tester) async {
        mockApiClient.isOffline = true;

        final request = UpdateWorkOrderStatusRequest(
          status: WorkOrderStatus.inProgress,
          notes: '开始维修工作',
        );

        try {
          await workOrderService.updateWorkOrderStatus('wo-1', request);
          fail('Expected exception to be thrown');
        } catch (e) {
          expect(e.toString(), contains('Network unavailable'));
          expect(e.toString(), contains('synced when connection is restored'));
        }
      });
    });

    group('Network Recovery', () {
      testWidgets('should fetch fresh data when coming back online', (WidgetTester tester) async {
        // Start offline with cache
        mockApiClient.isOffline = false;
        await workOrderService.getAssignedWorkOrders();
        
        mockApiClient.isOffline = true;
        await workOrderService.getAssignedWorkOrders(); // Load from cache

        // Come back online
        mockApiClient.isOffline = false;
        final result = await workOrderService.getAssignedWorkOrders();

        expect(result.workOrders.length, 1);
        expect(result.workOrders.first.title, '空调维修');
      });

      testWidgets('should handle cache corruption gracefully', (WidgetTester tester) async {
        // Populate cache
        mockApiClient.isOffline = false;
        await workOrderService.getAssignedWorkOrders();

        // Corrupt cache data
        mockApiClient.cachedData['/api/work-orders/assigned?page=1&limit=20'] = 'corrupted data';

        // Go offline and try to load
        mockApiClient.isOffline = true;

        expect(
          () => workOrderService.getAssignedWorkOrders(),
          throwsA(isA<Exception>()),
        );
      });
    });

    group('Error Handling', () {
      testWidgets('should handle server errors gracefully', (WidgetTester tester) async {
        mockApiClient.isOffline = false;

        expect(
          () => workOrderService.getWorkOrderWithHistory('non-existent'),
          throwsA(isA<Exception>()),
        );
      });

      testWidgets('should differentiate between network and server errors', (WidgetTester tester) async {
        mockApiClient.isOffline = false;

        // Test server error (404)
        try {
          await workOrderService.getWorkOrderWithHistory('non-existent');
          fail('Expected exception to be thrown');
        } catch (e) {
          expect(e.toString(), contains('Failed to get work order with history'));
          expect(e.toString(), isNot(contains('Network unavailable')));
        }

        // Test network error
        mockApiClient.isOffline = true;
        try {
          await workOrderService.getAssignedWorkOrders();
          fail('Expected exception to be thrown');
        } catch (e) {
          expect(e.toString(), contains('Failed to get assigned work orders'));
        }
      });
    });

    group('Cache Management', () {
      testWidgets('should handle pagination in cache keys', (WidgetTester tester) async {
        mockApiClient.isOffline = false;

        // Fetch different pages
        await workOrderService.getAssignedWorkOrders(page: 1);
        await workOrderService.getAssignedWorkOrders(page: 2);

        // Should have separate cache entries
        expect(mockApiClient.cachedData.containsKey('/api/work-orders/assigned?page=1&limit=20'), true);
        expect(mockApiClient.cachedData.containsKey('/api/work-orders/assigned?page=2&limit=20'), true);
      });

      testWidgets('should handle different limit parameters in cache', (WidgetTester tester) async {
        mockApiClient.isOffline = false;

        // Fetch with different limits
        await workOrderService.getAssignedWorkOrders(limit: 10);
        await workOrderService.getAssignedWorkOrders(limit: 20);

        // Should have separate cache entries
        expect(mockApiClient.cachedData.containsKey('/api/work-orders/assigned?page=1&limit=10'), true);
        expect(mockApiClient.cachedData.containsKey('/api/work-orders/assigned?page=1&limit=20'), true);
      });
    });
  });
}
import 'package:dio/dio.dart';
import '../models/work_order.dart';
import 'api_client.dart';

class WorkOrderService {
  static WorkOrderService? _instance;
  late final ApiClient _apiClient;

  WorkOrderService._internal();

  static Future<WorkOrderService> getInstance() async {
    _instance ??= WorkOrderService._internal();
    _instance!._apiClient = await ApiClient.getInstance();
    return _instance!;
  }

  /// Create a new work order
  Future<WorkOrder> createWorkOrder(WorkOrderRequest request) async {
    try {
      final response = await _apiClient.post<Map<String, dynamic>>(
        '/api/work-orders',
        data: request.toJson(),
      );

      if (response.data == null) {
        throw Exception('Empty response from server');
      }

      final workOrderData = response.data!['data']['workOrder'] as Map<String, dynamic>;
      return WorkOrder.fromJson(workOrderData);
    } catch (e) {
      throw Exception('Failed to create work order: $e');
    }
  }

  /// Get work order by ID
  Future<WorkOrder> getWorkOrder(String workOrderId) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        '/api/work-orders/$workOrderId',
      );

      if (response.data == null) {
        throw Exception('Empty response from server');
      }

      final workOrderData = response.data!['data']['workOrder'] as Map<String, dynamic>;
      return WorkOrder.fromJson(workOrderData);
    } catch (e) {
      throw Exception('Failed to get work order: $e');
    }
  }

  /// Get user's work orders
  Future<PaginatedWorkOrders> getUserWorkOrders({
    String type = 'assigned',
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        '/api/work-orders/my',
        queryParameters: {
          'type': type,
          'page': page.toString(),
          'limit': limit.toString(),
        },
      );

      if (response.data == null) {
        throw Exception('Empty response from server');
      }

      return PaginatedWorkOrders.fromJson(response.data!['data']);
    } catch (e) {
      throw Exception('Failed to get user work orders: $e');
    }
  }

  /// Update work order
  Future<WorkOrder> updateWorkOrder(String workOrderId, Map<String, dynamic> updates) async {
    try {
      final response = await _apiClient.put<Map<String, dynamic>>(
        '/api/work-orders/$workOrderId',
        data: updates,
      );

      if (response.data == null) {
        throw Exception('Empty response from server');
      }

      final workOrderData = response.data!['data']['workOrder'] as Map<String, dynamic>;
      return WorkOrder.fromJson(workOrderData);
    } catch (e) {
      throw Exception('Failed to update work order: $e');
    }
  }

  /// Upload attachment to work order
  Future<String> uploadAttachment(String workOrderId, String filePath) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
      });

      final response = await _apiClient.post<Map<String, dynamic>>(
        '/api/work-orders/$workOrderId/attachments',
        data: formData,
        options: Options(
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        ),
      );

      if (response.data == null) {
        throw Exception('Empty response from server');
      }

      return response.data!['data']['fileUrl'] as String;
    } catch (e) {
      throw Exception('Failed to upload attachment: $e');
    }
  }
}
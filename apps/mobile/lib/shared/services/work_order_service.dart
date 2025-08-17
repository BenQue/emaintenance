import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:http_parser/http_parser.dart';
import '../models/work_order.dart';
import 'api_client.dart';

class WorkOrderService {
  static WorkOrderService? _instance;
  ApiClient? _apiClient;

  WorkOrderService._internal();

  static Future<WorkOrderService> getInstance() async {
    if (_instance == null) {
      _instance = WorkOrderService._internal();
      // 使用工单服务客户端，因为work-order相关API在work-order-service中
      _instance!._apiClient = await ApiClient.getWorkOrderServiceClient();
    }
    return _instance!;
  }

  /// Create a new work order
  Future<WorkOrder> createWorkOrder(WorkOrderRequest request) async {
    try {
      
      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }
      
      final response = await _apiClient!.post<Map<String, dynamic>>(
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
      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }
      
      final response = await _apiClient!.get<Map<String, dynamic>>(
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
      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }
      
      final response = await _apiClient!.get<Map<String, dynamic>>(
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

  /// Get assigned work orders for current technician
  Future<PaginatedWorkOrders> getAssignedWorkOrders({
    int page = 1,
    int limit = 20,
  }) async {
    try {
      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }
      
      final response = await _apiClient!.get<Map<String, dynamic>>(
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
      throw Exception('Failed to get assigned work orders: $e');
    }
  }

  /// Get work order with status history
  Future<WorkOrderWithRelations> getWorkOrderWithHistory(String workOrderId) async {
    try {
      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }
      
      final response = await _apiClient!.get<Map<String, dynamic>>(
        '/api/work-orders/$workOrderId/history',
      );

      if (response.data == null) {
        throw Exception('Empty response from server');
      }

      final workOrderData = response.data!['data']['workOrder'] as Map<String, dynamic>;
      return WorkOrderWithRelations.fromJson(workOrderData);
    } catch (e) {
      throw Exception('Failed to get work order with history: $e');
    }
  }

  /// Get work order status history
  Future<List<WorkOrderStatusHistory>> getWorkOrderStatusHistory(String workOrderId) async {
    try {
      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }
      
      final response = await _apiClient!.get<Map<String, dynamic>>(
        '/api/work-orders/$workOrderId/status-history',
      );

      if (response.data == null) {
        throw Exception('Empty response from server');
      }

      final historyData = response.data!['data']['statusHistory'] as List;
      return historyData
          .map((item) => WorkOrderStatusHistory.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw Exception('Failed to get work order status history: $e');
    }
  }

  /// Update work order status
  Future<WorkOrderWithRelations> updateWorkOrderStatus(
    String workOrderId,
    UpdateWorkOrderStatusRequest request,
  ) async {
    try {
      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }
      
      final requestData = request.toJson();
      debugPrint('Updating work order status: $requestData');
      
      final response = await _apiClient!.put<Map<String, dynamic>>(
        '/api/work-orders/$workOrderId/status',
        data: requestData,
      );

      if (response.data == null) {
        throw Exception('Empty response from server');
      }

      final workOrderData = response.data!['data']['workOrder'] as Map<String, dynamic>;
      return WorkOrderWithRelations.fromJson(workOrderData);
    } catch (e) {
      throw Exception('Failed to update work order status: $e');
    }
  }

  /// Update work order
  Future<WorkOrder> updateWorkOrder(String workOrderId, Map<String, dynamic> updates) async {
    try {
      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }
      
      final response = await _apiClient!.put<Map<String, dynamic>>(
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

      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }
      
      final response = await _apiClient!.post<Map<String, dynamic>>(
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

  /// Upload photos to work order (for fault documentation and resolution)
  Future<Map<String, dynamic>> uploadWorkOrderPhotos(
    String workOrderId,
    List<String> photoPaths,
  ) async {
    try {
      
      // 检查照片文件是否存在
      for (String photoPath in photoPaths) {
        final file = File(photoPath);
      }

      final formData = FormData();
      for (int i = 0; i < photoPaths.length; i++) {
        final file = File(photoPaths[i]);
        if (await file.exists()) {
          // 显式指定MIME类型为image/jpeg
          final multipartFile = await MultipartFile.fromFile(
            photoPaths[i],
            contentType: MediaType('image', 'jpeg'),
          );
          formData.files.add(MapEntry('photos', multipartFile));
        } else {
        }
      }

      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }
      
      
      final response = await _apiClient!.post<Map<String, dynamic>>(
        '/api/work-orders/$workOrderId/work-order-photos',
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

      return response.data!['data'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Failed to upload work order photos: $e');
    }
  }

  /// Get photos for a work order
  Future<List<Map<String, dynamic>>> getWorkOrderPhotos(String workOrderId) async {
    try {
      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }
      
      final response = await _apiClient!.get<Map<String, dynamic>>(
        '/api/work-orders/$workOrderId/work-order-photos',
      );

      if (response.data == null) {
        throw Exception('Empty response from server');
      }

      final photosData = response.data!['data']['photos'] as List;
      return photosData.cast<Map<String, dynamic>>();
    } catch (e) {
      throw Exception('Failed to get work order photos: $e');
    }
  }

  /// Get photo URL for display
  String getPhotoUrl(String workOrderId, String photoId) {
    return '/api/work-orders/$workOrderId/work-order-photos/$photoId';
  }

  /// Get thumbnail URL for display
  String getThumbnailUrl(String workOrderId, String photoId) {
    return '/api/work-orders/$workOrderId/work-order-photos/$photoId/thumbnail';
  }

  /// Complete work order with resolution record
  Future<WorkOrderWithResolution> completeWorkOrder(
    String workOrderId,
    CreateResolutionRequest request,
  ) async {
    try {
      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }
      
      final requestData = request.toJson();
      debugPrint('Completing work order: $requestData');
      
      final response = await _apiClient!.post<Map<String, dynamic>>(
        '/api/work-orders/$workOrderId/complete',
        data: requestData,
      );

      if (response.data == null) {
        throw Exception('Empty response from server');
      }

      final workOrderData = response.data!['data']['workOrder'] as Map<String, dynamic>;
      return WorkOrderWithResolution.fromJson(workOrderData);
    } catch (e) {
      throw Exception('Failed to complete work order: $e');
    }
  }

  /// Get work order with resolution record
  Future<WorkOrderWithResolution> getWorkOrderWithResolution(String workOrderId) async {
    try {
      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }
      
      final response = await _apiClient!.get<Map<String, dynamic>>(
        '/api/work-orders/$workOrderId/resolution',
      );

      if (response.data == null) {
        throw Exception('Empty response from server');
      }

      final workOrderData = response.data!['data']['workOrder'] as Map<String, dynamic>;
      return WorkOrderWithResolution.fromJson(workOrderData);
    } catch (e) {
      throw Exception('Failed to get work order with resolution: $e');
    }
  }

  /// Upload resolution photos
  Future<ResolutionRecord> uploadResolutionPhotos(
    String workOrderId,
    List<String> photoPaths,
  ) async {
    try {
      final formData = FormData.fromMap({
        for (int i = 0; i < photoPaths.length; i++)
          'attachments': await MultipartFile.fromFile(photoPaths[i]),
      });

      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }
      
      final response = await _apiClient!.post<Map<String, dynamic>>(
        '/api/work-orders/$workOrderId/photos',
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

      final resolutionData = response.data!['data']['resolutionRecord'] as Map<String, dynamic>;
      return ResolutionRecord.fromJson(resolutionData);
    } catch (e) {
      throw Exception('Failed to upload resolution photos: $e');
    }
  }
}
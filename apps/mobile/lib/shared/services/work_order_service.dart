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

  /// 上传照片到工单
  Future<List<String>> uploadWorkOrderPhotos(String workOrderId, List<String> imagePaths) async {
    try {
      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }

      final List<String> photoUrls = [];

      for (String imagePath in imagePaths) {
        if (kDebugMode) {
          print('Uploading photo: $imagePath');
        }

        // Create multipart file
        final file = await MultipartFile.fromFile(
          imagePath,
          filename: imagePath.split('/').last,
          contentType: MediaType('image', 'jpeg'),
        );

        final formData = FormData.fromMap({
          'photo': file,
          'workOrderId': workOrderId,
        });

        final response = await _apiClient!.post<Map<String, dynamic>>(
          '/api/work-orders/$workOrderId/photos',
          data: formData,
        );

        if (response.data != null && response.data!['data'] != null) {
          final photoUrl = response.data!['data']['photoUrl'] as String;
          photoUrls.add(photoUrl);

          if (kDebugMode) {
            print('Photo uploaded successfully: $photoUrl');
          }
        }
      }

      return photoUrls;
    } catch (e) {
      if (kDebugMode) {
        print('Error uploading photos: $e');
      }
      throw Exception('Failed to upload photos: $e');
    }
  }

  /// 获取工单照片URL
  Future<List<String>> getWorkOrderPhotos(String workOrderId) async {
    try {
      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }

      final response = await _apiClient!.get<Map<String, dynamic>>(
        '/api/work-orders/$workOrderId/photos',
      );

      if (response.data == null) {
        return [];
      }

      final photosData = response.data!['data']['photos'] as List<dynamic>;
      return photosData.map((photo) => photo['url'] as String).toList();
    } catch (e) {
      if (kDebugMode) {
        print('Error getting work order photos: $e');
      }
      return [];
    }
  }

  /// 获取照片的缩略图URL
  String getThumbnailUrl(String photoUrl) {
    if (photoUrl.contains('?')) {
      return '$photoUrl&thumbnail=true';
    } else {
      return '$photoUrl?thumbnail=true';
    }
  }

  /// 获取照片的完整URL
  String getPhotoUrl(String photoUrl) {
    return photoUrl;
  }

  /// 获取分配给当前技术员的工单
  Future<List<WorkOrder>> getAssignedWorkOrders({
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

      final workOrdersData = response.data!['data']['workOrders'] as List<dynamic>;
      return workOrdersData.map((json) => WorkOrder.fromJson(json as Map<String, dynamic>)).toList();
    } catch (e) {
      throw Exception('Failed to get assigned work orders: $e');
    }
  }

  /// 更新工单状态
  Future<WorkOrder> updateWorkOrderStatus(
    String workOrderId,
    String status,
    {String? comment}
  ) async {
    try {
      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }

      final requestData = {
        'status': status,
        if (comment != null) 'comment': comment,
      };

      if (kDebugMode) {
        print('Updating work order status: $requestData');
      }

      final response = await _apiClient!.put<Map<String, dynamic>>(
        '/api/work-orders/$workOrderId/status',
        data: requestData,
      );

      if (response.data == null) {
        throw Exception('Empty response from server');
      }

      final workOrderData = response.data!['data']['workOrder'] as Map<String, dynamic>;
      return WorkOrder.fromJson(workOrderData);
    } catch (e) {
      throw Exception('Failed to update work order status: $e');
    }
  }

  /// 完成工单并记录解决方案
  Future<WorkOrder> completeWorkOrder(
    String workOrderId,
    Map<String, dynamic> completionData,
  ) async {
    try {
      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }

      if (kDebugMode) {
        print('Completing work order: $completionData');
      }

      final response = await _apiClient!.post<Map<String, dynamic>>(
        '/api/work-orders/$workOrderId/complete',
        data: completionData,
      );

      if (response.data == null) {
        throw Exception('Empty response from server');
      }

      final workOrderData = response.data!['data']['workOrder'] as Map<String, dynamic>;
      return WorkOrder.fromJson(workOrderData);
    } catch (e) {
      throw Exception('Failed to complete work order: $e');
    }
  }

  /// 获取用户的工单列表
  Future<List<WorkOrder>> getUserWorkOrders({
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

      final workOrdersData = response.data!['data']['workOrders'] as List<dynamic>;
      return workOrdersData.map((json) => WorkOrder.fromJson(json as Map<String, dynamic>)).toList();
    } catch (e) {
      throw Exception('Failed to get user work orders: $e');
    }
  }

  /// 上传解决方案照片
  Future<List<String>> uploadResolutionPhotos(
    String workOrderId,
    List<String> photoPaths,
  ) async {
    try {
      if (_apiClient == null) {
        throw Exception('API client not initialized');
      }

      final List<String> photoUrls = [];

      for (String photoPath in photoPaths) {
        if (kDebugMode) {
          print('Uploading resolution photo: $photoPath');
        }

        final file = await MultipartFile.fromFile(
          photoPath,
          filename: photoPath.split('/').last,
          contentType: MediaType('image', 'jpeg'),
        );

        final formData = FormData.fromMap({
          'photo': file,
          'workOrderId': workOrderId,
          'type': 'resolution',
        });

        final response = await _apiClient!.post<Map<String, dynamic>>(
          '/api/work-orders/$workOrderId/photos',
          data: formData,
        );

        if (response.data != null && response.data!['data'] != null) {
          final photoUrl = response.data!['data']['photoUrl'] as String;
          photoUrls.add(photoUrl);

          if (kDebugMode) {
            print('Resolution photo uploaded successfully: $photoUrl');
          }
        }
      }

      return photoUrls;
    } catch (e) {
      if (kDebugMode) {
        print('Error uploading resolution photos: $e');
      }
      throw Exception('Failed to upload resolution photos: $e');
    }
  }
}
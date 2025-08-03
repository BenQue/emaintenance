import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/work_order.dart';

class OfflineStorageService {
  static const String _offlineResolutionsKey = 'offline_resolutions';
  static OfflineStorageService? _instance;
  
  OfflineStorageService._internal();
  
  static OfflineStorageService getInstance() {
    _instance ??= OfflineStorageService._internal();
    return _instance!;
  }

  /// 保存离线解决方案记录
  Future<void> saveOfflineResolution(OfflineResolutionRecord resolution) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final existingData = prefs.getString(_offlineResolutionsKey);
      
      List<OfflineResolutionRecord> resolutions = [];
      if (existingData != null) {
        final jsonList = jsonDecode(existingData) as List;
        resolutions = jsonList
            .map((item) => OfflineResolutionRecord.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      
      // 更新或添加记录
      final existingIndex = resolutions.indexWhere((r) => r.id == resolution.id);
      if (existingIndex >= 0) {
        resolutions[existingIndex] = resolution;
      } else {
        resolutions.add(resolution);
      }
      
      final jsonString = jsonEncode(resolutions.map((r) => r.toJson()).toList());
      await prefs.setString(_offlineResolutionsKey, jsonString);
    } catch (e) {
      throw Exception('Failed to save offline resolution: $e');
    }
  }

  /// 获取所有离线解决方案记录
  Future<List<OfflineResolutionRecord>> getOfflineResolutions() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = prefs.getString(_offlineResolutionsKey);
      
      if (data == null) return [];
      
      final jsonList = jsonDecode(data) as List;
      return jsonList
          .map((item) => OfflineResolutionRecord.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw Exception('Failed to get offline resolutions: $e');
    }
  }

  /// 获取指定工单的离线解决方案记录
  Future<OfflineResolutionRecord?> getOfflineResolutionByWorkOrderId(String workOrderId) async {
    try {
      final resolutions = await getOfflineResolutions();
      final matchingResolutions = resolutions.where((r) => r.workOrderId == workOrderId);
      return matchingResolutions.isNotEmpty ? matchingResolutions.first : null;
    } catch (e) {
      return null;
    }
  }

  /// 获取未同步的离线解决方案记录
  Future<List<OfflineResolutionRecord>> getUnsyncedResolutions() async {
    try {
      final resolutions = await getOfflineResolutions();
      return resolutions.where((r) => !r.isSynced).toList();
    } catch (e) {
      throw Exception('Failed to get unsynced resolutions: $e');
    }
  }

  /// 标记解决方案记录为已同步
  Future<void> markResolutionAsSynced(String resolutionId) async {
    try {
      final resolutions = await getOfflineResolutions();
      final index = resolutions.indexWhere((r) => r.id == resolutionId);
      
      if (index >= 0) {
        final updatedResolution = resolutions[index].copyWith(isSynced: true);
        resolutions[index] = updatedResolution;
        
        final prefs = await SharedPreferences.getInstance();
        final jsonString = jsonEncode(resolutions.map((r) => r.toJson()).toList());
        await prefs.setString(_offlineResolutionsKey, jsonString);
      }
    } catch (e) {
      throw Exception('Failed to mark resolution as synced: $e');
    }
  }

  /// 删除已同步的离线解决方案记录
  Future<void> deleteSyncedResolutions() async {
    try {
      final resolutions = await getOfflineResolutions();
      final unsyncedResolutions = resolutions.where((r) => !r.isSynced).toList();
      
      final prefs = await SharedPreferences.getInstance();
      if (unsyncedResolutions.isEmpty) {
        await prefs.remove(_offlineResolutionsKey);
      } else {
        final jsonString = jsonEncode(unsyncedResolutions.map((r) => r.toJson()).toList());
        await prefs.setString(_offlineResolutionsKey, jsonString);
      }
    } catch (e) {
      throw Exception('Failed to delete synced resolutions: $e');
    }
  }

  /// 删除特定的离线解决方案记录
  Future<void> deleteOfflineResolution(String resolutionId) async {
    try {
      final resolutions = await getOfflineResolutions();
      resolutions.removeWhere((r) => r.id == resolutionId);
      
      final prefs = await SharedPreferences.getInstance();
      if (resolutions.isEmpty) {
        await prefs.remove(_offlineResolutionsKey);
      } else {
        final jsonString = jsonEncode(resolutions.map((r) => r.toJson()).toList());
        await prefs.setString(_offlineResolutionsKey, jsonString);
      }
    } catch (e) {
      throw Exception('Failed to delete offline resolution: $e');
    }
  }

  /// 保存照片到本地目录
  Future<String> savePhotoToLocal(String sourceFilePath, String workOrderId) async {
    try {
      final appDir = await getApplicationDocumentsDirectory();
      final photosDir = Directory('${appDir.path}/resolution_photos/$workOrderId');
      
      if (!await photosDir.exists()) {
        await photosDir.create(recursive: true);
      }
      
      final sourceFile = File(sourceFilePath);
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_${sourceFile.uri.pathSegments.last}';
      final destinationPath = '${photosDir.path}/$fileName';
      
      await sourceFile.copy(destinationPath);
      return destinationPath;
    } catch (e) {
      throw Exception('Failed to save photo to local: $e');
    }
  }

  /// 获取本地照片列表
  Future<List<String>> getLocalPhotos(String workOrderId) async {
    try {
      final appDir = await getApplicationDocumentsDirectory();
      final photosDir = Directory('${appDir.path}/resolution_photos/$workOrderId');
      
      if (!await photosDir.exists()) {
        return [];
      }
      
      final files = await photosDir.list().where((entity) => entity is File).toList();
      return files.map((file) => file.path).toList();
    } catch (e) {
      return [];
    }
  }

  /// 删除本地照片目录
  Future<void> deleteLocalPhotos(String workOrderId) async {
    try {
      final appDir = await getApplicationDocumentsDirectory();
      final photosDir = Directory('${appDir.path}/resolution_photos/$workOrderId');
      
      if (await photosDir.exists()) {
        await photosDir.delete(recursive: true);
      }
    } catch (e) {
      // 忽略删除错误
    }
  }

  /// 清理所有已同步的本地数据
  Future<void> cleanupSyncedData() async {
    try {
      // 删除已同步的解决方案记录
      await deleteSyncedResolutions();
      
      // 删除已同步工单的本地照片
      final syncedResolutions = await getOfflineResolutions();
      final syncedWorkOrderIds = syncedResolutions
          .where((r) => r.isSynced)
          .map((r) => r.workOrderId)
          .toSet();
      
      for (final workOrderId in syncedWorkOrderIds) {
        await deleteLocalPhotos(workOrderId);
      }
    } catch (e) {
      // 忽略清理错误
    }
  }

  /// 检查是否有未同步的数据
  Future<bool> hasUnsyncedData() async {
    try {
      final unsyncedResolutions = await getUnsyncedResolutions();
      return unsyncedResolutions.isNotEmpty;
    } catch (e) {
      return false;
    }
  }

  /// 获取未同步数据的数量
  Future<int> getUnsyncedDataCount() async {
    try {
      final unsyncedResolutions = await getUnsyncedResolutions();
      return unsyncedResolutions.length;
    } catch (e) {
      return 0;
    }
  }
}
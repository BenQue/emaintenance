import 'dart:async';
import 'package:flutter/foundation.dart';
import 'work_order_service.dart';
import 'offline_storage_service.dart';
import '../models/work_order.dart';
import '../utils/connectivity_helper.dart';

class SyncService {
  static SyncService? _instance;
  late final WorkOrderService _workOrderService;
  late final OfflineStorageService _offlineStorage;
  
  Timer? _syncTimer;
  bool _isSyncing = false;
  
  SyncService._internal();
  
  static Future<SyncService> getInstance() async {
    _instance ??= SyncService._internal();
    _instance!._workOrderService = await WorkOrderService.getInstance();
    _instance!._offlineStorage = OfflineStorageService.getInstance();
    return _instance!;
  }

  /// Start automatic sync when connectivity is available
  void startAutoSync({Duration interval = const Duration(minutes: 5)}) {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(interval, (_) {
      _syncIfConnected();
    });
  }

  /// Stop automatic sync
  void stopAutoSync() {
    _syncTimer?.cancel();
    _syncTimer = null;
  }

  /// Manually trigger sync
  Future<SyncResult> syncNow() async {
    if (_isSyncing) {
      return SyncResult(
        success: false,
        message: '同步正在进行中',
        syncedCount: 0,
        failedCount: 0,
      );
    }

    return _performSync();
  }

  /// Check connectivity and sync if online
  Future<void> _syncIfConnected() async {
    if (await ConnectivityHelper.isConnected()) {
      await _performSync();
    }
  }

  /// Perform the actual sync operation
  Future<SyncResult> _performSync() async {
    if (_isSyncing) {
      return SyncResult(
        success: false,
        message: '同步正在进行中',
        syncedCount: 0,
        failedCount: 0,
      );
    }

    _isSyncing = true;
    int syncedCount = 0;
    int failedCount = 0;
    String? lastError;

    try {
      // Get all unsynced resolution records
      final unsyncedResolutions = await _offlineStorage.getUnsyncedResolutions();
      
      if (unsyncedResolutions.isEmpty) {
        return SyncResult(
          success: true,
          message: '没有需要同步的数据',
          syncedCount: 0,
          failedCount: 0,
        );
      }

      for (final resolution in unsyncedResolutions) {
        try {
          await _syncResolutionRecord(resolution);
          syncedCount++;
        } catch (e) {
          failedCount++;
          lastError = e.toString();
          debugPrint('Failed to sync resolution ${resolution.id}: $e');
        }
      }

      // Clean up synced data
      await _offlineStorage.cleanupSyncedData();

      final success = failedCount == 0;
      return SyncResult(
        success: success,
        message: success 
            ? '同步完成，已同步 $syncedCount 条记录'
            : '部分同步失败，已同步 $syncedCount 条，失败 $failedCount 条。最后错误: $lastError',
        syncedCount: syncedCount,
        failedCount: failedCount,
      );

    } catch (e) {
      debugPrint('Sync operation failed: $e');
      return SyncResult(
        success: false,
        message: '同步失败: $e',
        syncedCount: syncedCount,
        failedCount: failedCount + 1,
      );
    } finally {
      _isSyncing = false;
    }
  }

  /// Sync a single resolution record
  Future<void> _syncResolutionRecord(OfflineResolutionRecord resolution) async {
    try {
      // Create resolution request
      final request = CreateResolutionRequest(
        solutionDescription: resolution.solutionDescription,
        faultCode: resolution.faultCode,
      );

      // Complete work order
      await _workOrderService.completeWorkOrder(resolution.workOrderId, request);

      // Upload photos if any
      if (resolution.photoLocalPaths.isNotEmpty) {
        await _workOrderService.uploadResolutionPhotos(
          resolution.workOrderId,
          resolution.photoLocalPaths,
        );
      }

      // Mark as synced
      await _offlineStorage.markResolutionAsSynced(resolution.id);

    } catch (e) {
      // Log error but don't mark as synced
      debugPrint('Failed to sync resolution record ${resolution.id}: $e');
      rethrow;
    }
  }

  /// Check if there's unsynced data
  Future<bool> hasUnsyncedData() async {
    return await _offlineStorage.hasUnsyncedData();
  }

  /// Get count of unsynced data
  Future<int> getUnsyncedDataCount() async {
    return await _offlineStorage.getUnsyncedDataCount();
  }

  /// Get sync status
  bool get isSyncing => _isSyncing;

  /// Dispose resources
  void dispose() {
    stopAutoSync();
  }
}

class SyncResult {
  final bool success;
  final String message;
  final int syncedCount;
  final int failedCount;

  const SyncResult({
    required this.success,
    required this.message,
    required this.syncedCount,
    required this.failedCount,
  });

  @override
  String toString() {
    return 'SyncResult(success: $success, message: $message, synced: $syncedCount, failed: $failedCount)';
  }
}
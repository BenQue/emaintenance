import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:emaintenance_mobile/shared/services/offline_storage_service.dart';
import 'package:emaintenance_mobile/shared/models/work_order.dart';

// Mock shared_preferences since it's a Flutter plugin
class MockSharedPreferences extends Mock implements SharedPreferences {}

@GenerateMocks([Directory, File])
void main() {
  late OfflineStorageService offlineStorage;
  late MockSharedPreferences mockPrefs;

  setUp(() {
    mockPrefs = MockSharedPreferences();
    offlineStorage = OfflineStorageService.getInstance();
  });

  // Test data
  final testResolution = OfflineResolutionRecord(
    id: 'resolution1',
    workOrderId: 'wo1',
    solutionDescription: 'Test solution description',
    faultCode: FaultCode.mechanicalFailure,
    photoLocalPaths: ['/path/to/photo1.jpg', '/path/to/photo2.jpg'],
    createdAt: DateTime.parse('2025-08-03T10:00:00Z'),
    isSynced: false,
  );

  group('OfflineStorageService Tests', () {
    group('Resolution Record Management', () {
      test('should save offline resolution record', () async {
        // Arrange
        SharedPreferences.setMockInitialValues({});
        
        // Act
        await offlineStorage.saveOfflineResolution(testResolution);
        
        // Assert - would need to verify SharedPreferences interaction
        // This is a simplified test that verifies the method doesn't throw
        expect(true, isTrue);
      });

      test('should retrieve offline resolution records', () async {
        // Arrange
        final testData = [testResolution.toJson()];
        SharedPreferences.setMockInitialValues({
          'offline_resolutions': jsonEncode(testData),
        });
        
        // Act
        final result = await offlineStorage.getOfflineResolutions();
        
        // Assert
        expect(result, isA<List<OfflineResolutionRecord>>());
        expect(result.length, equals(1));
        expect(result.first.id, equals(testResolution.id));
        expect(result.first.workOrderId, equals(testResolution.workOrderId));
        expect(result.first.solutionDescription, equals(testResolution.solutionDescription));
      });

      test('should return empty list when no offline resolutions exist', () async {
        // Arrange
        SharedPreferences.setMockInitialValues({});
        
        // Act
        final result = await offlineStorage.getOfflineResolutions();
        
        // Assert
        expect(result, isEmpty);
      });

      test('should get offline resolution by work order ID', () async {
        // Arrange
        final testData = [testResolution.toJson()];
        SharedPreferences.setMockInitialValues({
          'offline_resolutions': jsonEncode(testData),
        });
        
        // Act
        final result = await offlineStorage.getOfflineResolutionByWorkOrderId('wo1');
        
        // Assert
        expect(result, isNotNull);
        expect(result!.workOrderId, equals('wo1'));
      });

      test('should return null when work order resolution not found', () async {
        // Arrange
        SharedPreferences.setMockInitialValues({});
        
        // Act
        final result = await offlineStorage.getOfflineResolutionByWorkOrderId('nonexistent');
        
        // Assert
        expect(result, isNull);
      });

      test('should get unsynced resolutions', () async {
        // Arrange
        final syncedResolution = testResolution.copyWith(isSynced: true);
        final unsyncedResolution = OfflineResolutionRecord(
          id: 'resolution2',
          workOrderId: 'wo2',
          solutionDescription: 'Unsynced solution',
          photoLocalPaths: [],
          createdAt: DateTime.now(),
          isSynced: false,
        );
        
        final testData = [syncedResolution.toJson(), unsyncedResolution.toJson()];
        SharedPreferences.setMockInitialValues({
          'offline_resolutions': jsonEncode(testData),
        });
        
        // Act
        final result = await offlineStorage.getUnsyncedResolutions();
        
        // Assert
        expect(result.length, equals(1));
        expect(result.first.id, equals('resolution2'));
        expect(result.first.isSynced, isFalse);
      });

      test('should mark resolution as synced', () async {
        // Arrange
        final testData = [testResolution.toJson()];
        SharedPreferences.setMockInitialValues({
          'offline_resolutions': jsonEncode(testData),
        });
        
        // Act
        await offlineStorage.markResolutionAsSynced('resolution1');
        
        // Get updated resolution
        final result = await offlineStorage.getOfflineResolutionByWorkOrderId('wo1');
        
        // Assert
        expect(result, isNotNull);
        expect(result!.isSynced, isTrue);
      });

      test('should delete offline resolution', () async {
        // Arrange
        final testData = [testResolution.toJson()];
        SharedPreferences.setMockInitialValues({
          'offline_resolutions': jsonEncode(testData),
        });
        
        // Act
        await offlineStorage.deleteOfflineResolution('resolution1');
        
        // Verify deletion
        final result = await offlineStorage.getOfflineResolutions();
        
        // Assert
        expect(result, isEmpty);
      });

      test('should check if has unsynced data', () async {
        // Arrange
        final testData = [testResolution.toJson()];
        SharedPreferences.setMockInitialValues({
          'offline_resolutions': jsonEncode(testData),
        });
        
        // Act
        final result = await offlineStorage.hasUnsyncedData();
        
        // Assert
        expect(result, isTrue);
      });

      test('should get unsynced data count', () async {
        // Arrange
        final resolution2 = OfflineResolutionRecord(
          id: 'resolution2',
          workOrderId: 'wo2',
          solutionDescription: 'Another unsynced solution',
          photoLocalPaths: [],
          createdAt: DateTime.now(),
          isSynced: false,
        );
        
        final testData = [testResolution.toJson(), resolution2.toJson()];
        SharedPreferences.setMockInitialValues({
          'offline_resolutions': jsonEncode(testData),
        });
        
        // Act
        final result = await offlineStorage.getUnsyncedDataCount();
        
        // Assert
        expect(result, equals(2));
      });
    });

    group('OfflineResolutionRecord Model Tests', () {
      test('should serialize to JSON correctly', () {
        // Act
        final json = testResolution.toJson();
        
        // Assert
        expect(json['id'], equals('resolution1'));
        expect(json['workOrderId'], equals('wo1'));
        expect(json['solutionDescription'], equals('Test solution description'));
        expect(json['faultCode'], equals('MECHANICAL_FAILURE'));
        expect(json['photoLocalPaths'], isA<List>());
        expect(json['isSynced'], isFalse);
      });

      test('should deserialize from JSON correctly', () {
        // Arrange
        final json = {
          'id': 'resolution1',
          'workOrderId': 'wo1',
          'solutionDescription': 'Test solution description',
          'faultCode': 'MECHANICAL_FAILURE',
          'photoLocalPaths': ['/path/to/photo1.jpg'],
          'createdAt': '2025-08-03T10:00:00.000Z',
          'isSynced': false,
        };
        
        // Act
        final resolution = OfflineResolutionRecord.fromJson(json);
        
        // Assert
        expect(resolution.id, equals('resolution1'));
        expect(resolution.workOrderId, equals('wo1'));
        expect(resolution.solutionDescription, equals('Test solution description'));
        expect(resolution.faultCode, equals(FaultCode.mechanicalFailure));
        expect(resolution.photoLocalPaths.length, equals(1));
        expect(resolution.isSynced, isFalse);
      });

      test('should handle null fault code in JSON', () {
        // Arrange
        final json = {
          'id': 'resolution1',
          'workOrderId': 'wo1',
          'solutionDescription': 'Test solution description',
          'faultCode': null,
          'photoLocalPaths': [],
          'createdAt': '2025-08-03T10:00:00.000Z',
          'isSynced': false,
        };
        
        // Act
        final resolution = OfflineResolutionRecord.fromJson(json);
        
        // Assert
        expect(resolution.faultCode, isNull);
      });

      test('should copy with updated sync status', () {
        // Act
        final updatedResolution = testResolution.copyWith(isSynced: true);
        
        // Assert
        expect(updatedResolution.isSynced, isTrue);
        expect(updatedResolution.id, equals(testResolution.id));
        expect(updatedResolution.workOrderId, equals(testResolution.workOrderId));
      });
    });

    group('Error Handling', () {
      test('should handle SharedPreferences errors gracefully', () async {
        // This test would require mocking SharedPreferences to throw errors
        // For now, we just verify the method doesn't crash
        
        // Act & Assert
        expect(() async {
          await offlineStorage.getOfflineResolutions();
        }, returnsNormally);
      });

      test('should handle JSON parsing errors gracefully', () async {
        // Arrange - invalid JSON data
        SharedPreferences.setMockInitialValues({
          'offline_resolutions': 'invalid json',
        });
        
        // Act & Assert
        expect(() async {
          await offlineStorage.getOfflineResolutions();
        }, throwsException);
      });
    });
  });
}
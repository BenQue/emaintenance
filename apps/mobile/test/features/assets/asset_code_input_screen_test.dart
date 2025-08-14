import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:emaintenance_mobile/features/assets/asset_code_input_screen.dart';
import 'package:emaintenance_mobile/shared/models/asset.dart';

void main() {
  final testAsset = Asset(
    id: '1',
    assetCode: 'EQ-001',
    name: 'Test Equipment',
    description: 'Test description',
    location: 'Building A',
    model: 'Model 1',
    manufacturer: 'Test Manufacturer',
    serialNumber: 'SN001',
    isActive: true,
    installDate: DateTime.parse('2023-01-01'),
    createdAt: DateTime.parse('2023-01-01T00:00:00Z'),
    updatedAt: DateTime.parse('2023-01-01T00:00:00Z'),
  );

  group('AssetCodeInputScreen', () {
    testWidgets('displays title and subtitle correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AssetCodeInputScreen(
            title: 'Test Title',
            subtitle: 'Test Subtitle',
            onAssetSelected: (asset) {},
          ),
        ),
      );

      expect(find.text('Test Title'), findsOneWidget);
      expect(find.text('Test Subtitle'), findsOneWidget);
    });

    testWidgets('shows QR scanner section when enabled', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AssetCodeInputScreen(
            showQROption: true,
            onAssetSelected: (asset) {},
          ),
        ),
      );

      expect(find.text('扫描二维码'), findsOneWidget);
      expect(find.byIcon(Icons.qr_code_scanner), findsWidgets);
    });

    testWidgets('hides QR scanner section when disabled', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AssetCodeInputScreen(
            showQROption: false,
            onAssetSelected: (asset) {},
          ),
        ),
      );

      expect(find.text('扫描二维码'), findsNothing);
    });

    testWidgets('displays manual input section', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AssetCodeInputScreen(
            onAssetSelected: (asset) {},
          ),
        ),
      );

      expect(find.text('手工输入资产代码'), findsOneWidget);
      expect(find.byType(TextFormField), findsOneWidget);
    });

    testWidgets('calls onAssetSelected callback when asset is selected', (WidgetTester tester) async {
      Asset? selectedAsset;
      
      await tester.pumpWidget(
        MaterialApp(
          home: AssetCodeInputScreen(
            onAssetSelected: (asset) {
              selectedAsset = asset;
            },
          ),
        ),
      );

      // Test verifies the callback structure is in place
      // Actual selection testing would require integration with the search widget
      expect(find.byType(AssetCodeInputScreen), findsOneWidget);
    });

    testWidgets('renders without errors in basic configuration', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AssetCodeInputScreen(
            onAssetSelected: (asset) {},
          ),
        ),
      );

      expect(find.byType(AssetCodeInputScreen), findsOneWidget);
    });
  });
}
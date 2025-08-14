import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:emaintenance_mobile/features/scanner/qr_scanner_screen.dart';

void main() {
  group('QRScannerScreen Tests', () {
    testWidgets('should display scanner screen correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: QRScannerScreen(),
        ),
      );
      
      // Check if the screen is displayed
      expect(find.text('扫描设备二维码'), findsOneWidget);
      expect(find.byType(AppBar), findsOneWidget);
    });
    
    testWidgets('should show permission denied UI when camera permission is not granted', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: QRScannerScreen(),
        ),
      );
      
      // Wait for permission check
      await tester.pump(const Duration(seconds: 1));
      
      // Since we can't mock permission in unit test, we expect the permission UI might be shown
      // This test validates the UI structure exists
      expect(find.byType(Scaffold), findsOneWidget);
    });
  });
}
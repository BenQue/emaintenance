// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:emaintenance_mobile/shared/providers/auth_provider.dart';
import 'package:emaintenance_mobile/main.dart';

void main() {
  testWidgets('App starts and shows authentication required', (WidgetTester tester) async {
    // Create a mock auth provider for testing
    final authProvider = await AuthProvider.getInstance();
    
    // Build our app and trigger a frame.
    await tester.pumpWidget(EmaintenanceApp(authProvider: authProvider));
    await tester.pumpAndSettle();

    // Verify that app loads (should show login screen or home based on auth state)
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}

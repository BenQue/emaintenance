import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'shared/providers/auth_provider.dart';
import 'shared/widgets/auth_guard.dart';
import 'features/home/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize auth provider
  final authProvider = await AuthProvider.getInstance();
  
  runApp(EmaintananceApp(authProvider: authProvider));
}

class EmaintananceApp extends StatefulWidget {
  final AuthProvider authProvider;
  
  const EmaintananceApp({
    super.key,
    required this.authProvider,
  });

  @override
  State<EmaintananceApp> createState() => _EmaintananceAppState();
}

class _EmaintananceAppState extends State<EmaintananceApp> {
  @override
  void initState() {
    super.initState();
    // Initialize authentication state
    WidgetsBinding.instance.addPostFrameCallback((_) {
      widget.authProvider.initializeAuth();
    });
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: widget.authProvider,
      child: MaterialApp(
        title: 'E-Maintenance',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
          useMaterial3: true,
          appBarTheme: const AppBarTheme(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
          ),
        ),
        home: const AuthGuard(
          child: HomeScreen(),
        ),
        routes: {
          '/home': (context) => const AuthGuard(child: HomeScreen()),
        },
      ),
    );
  }
}

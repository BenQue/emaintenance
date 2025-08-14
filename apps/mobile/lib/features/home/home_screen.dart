import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../shared/providers/auth_provider.dart';
import '../../shared/models/user.dart';
import '../scanner/qr_scanner_screen.dart';
import '../work_orders/work_order_form_screen.dart';
import '../tasks/task_list_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        final user = authProvider.user;
        final isTechnician = user?.role == UserRole.technician;
        
        if (isTechnician) {
          return _buildTechnicianView(context, authProvider);
        } else {
          return _buildGeneralUserView(context, authProvider);
        }
      },
    );
  }

  Widget _buildTechnicianView(BuildContext context, AuthProvider authProvider) {
    final List<Widget> pages = [
      const TaskListScreen(),
      _buildHomeContent(),
    ];

    final List<BottomNavigationBarItem> bottomNavItems = [
      const BottomNavigationBarItem(
        icon: Icon(Icons.assignment),
        label: '我的任务',
      ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.home),
        label: '首页',
      ),
    ];

    return Scaffold(
      appBar: _buildAppBar(authProvider),
      body: pages[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        items: bottomNavItems,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Colors.blue,
        unselectedItemColor: Colors.grey,
      ),
      floatingActionButton: _currentIndex == 1 ? _buildFloatingActionButton() : null,
    );
  }

  Widget _buildGeneralUserView(BuildContext context, AuthProvider authProvider) {
    return Scaffold(
      appBar: _buildAppBar(authProvider),
      body: _buildHomeContent(),
      floatingActionButton: _buildFloatingActionButton(),
    );
  }

  PreferredSizeWidget _buildAppBar(AuthProvider authProvider) {
    return AppBar(
      title: const Text('设备维修管理'),
      backgroundColor: Colors.blue,
      foregroundColor: Colors.white,
      actions: [
        PopupMenuButton<String>(
          icon: CircleAvatar(
            backgroundColor: Colors.white.withOpacity(0.2),
            child: Text(
              authProvider.user?.firstName.substring(0, 1).toUpperCase() ?? 'U',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          onSelected: (value) {
            if (value == 'logout') {
              _showLogoutDialog(context, authProvider);
            }
          },
          itemBuilder: (context) => [
            PopupMenuItem(
              enabled: false,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    authProvider.user?.fullName ?? '未知用户',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    authProvider.user?.email ?? '',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  Text(
                    _getRoleDisplayName(authProvider.user?.role),
                    style: const TextStyle(fontSize: 12, color: Colors.blue),
                  ),
                ],
              ),
            ),
            const PopupMenuDivider(),
            const PopupMenuItem(
              value: 'logout',
              child: Row(
                children: [
                  Icon(Icons.logout, size: 18),
                  SizedBox(width: 8),
                  Text('退出登录'),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildHomeContent() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.build,
            size: 100,
            color: Colors.blue,
          ),
          SizedBox(height: 20),
          Text(
            '企业设备维修管理系统',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          SizedBox(height: 10),
          Text(
            'E-Maintenance Mobile App',
            style: TextStyle(fontSize: 16, color: Colors.grey),
          ),
          SizedBox(height: 40),
          Text(
            '使用扫码报修功能快速创建工单',
            style: TextStyle(fontSize: 16, color: Colors.green),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingActionButton() {
    return FloatingActionButton.extended(
      onPressed: () async {
        // Navigate to QR scanner
        final result = await Navigator.of(context).push<dynamic>(
          MaterialPageRoute(
            builder: (context) => const QRScannerScreen(),
          ),
        );
        
        if (result != null) {
          // Navigate to work order form with scanned asset
          if (context.mounted) {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) => WorkOrderFormScreen(asset: result),
              ),
            );
          }
        }
      },
      backgroundColor: Colors.blue,
      foregroundColor: Colors.white,
      icon: const Icon(Icons.qr_code_scanner),
      label: const Text('扫码报修'),
    );
  }

  String _getRoleDisplayName(UserRole? role) {
    switch (role) {
      case UserRole.employee:
        return '员工';
      case UserRole.technician:
        return '技术员';
      case UserRole.supervisor:
        return '主管';
      case UserRole.admin:
        return '管理员';
      case null:
        return '未知角色';
    }
  }

  void _showLogoutDialog(BuildContext context, AuthProvider authProvider) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认退出'),
        content: const Text('您确定要退出登录吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              authProvider.logout();
            },
            child: const Text('退出'),
          ),
        ],
      ),
    );
  }
}
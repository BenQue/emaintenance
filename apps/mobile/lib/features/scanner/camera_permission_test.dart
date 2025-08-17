import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:permission_handler/permission_handler.dart';

class CameraPermissionTest extends StatefulWidget {
  const CameraPermissionTest({super.key});

  @override
  State<CameraPermissionTest> createState() => _CameraPermissionTestState();
}

class _CameraPermissionTestState extends State<CameraPermissionTest> {
  CameraController? _controller;
  String _status = '点击下方按钮测试相机权限';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('相机权限测试'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.camera_alt,
                size: 80,
                color: Colors.blue,
              ),
              const SizedBox(height: 24),
              Text(
                _status,
                style: const TextStyle(fontSize: 16),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _testCameraPermission,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                ),
                child: const Text('测试相机权限'),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () async {
                  await openAppSettings();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                ),
                child: const Text('打开应用设置'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _testCameraPermission() async {
    setState(() {
      _status = '正在直接访问相机硬件（这会触发权限对话框）...';
    });

    try {
      // 直接尝试获取相机列表 - 这会强制触发权限对话框
      final cameras = await availableCameras();
      
      if (cameras.isEmpty) {
        setState(() {
          _status = '没有找到可用的相机设备';
        });
        return;
      }

      // 直接尝试初始化相机 - 这会进一步确保权限对话框出现
      setState(() {
        _status = '正在初始化第一个相机设备...';
      });
      
      _controller = CameraController(
        cameras.first,
        ResolutionPreset.medium,
      );

      await _controller!.initialize();

      setState(() {
        _status = '✅ 相机访问成功！权限已正确设置。\n\n'
                 '现在你应该能在iPhone设置中找到相机权限选项了。';
      });

      // 等待2秒让用户看到成功消息，然后清理
      await Future.delayed(const Duration(seconds: 2));
      await _controller!.dispose();
      _controller = null;

    } catch (e) {
      
      // 检查具体的错误类型
      String errorMessage = '相机访问失败: ${e.toString()}';
      
      if (e.toString().contains('permission') || e.toString().contains('authorized')) {
        errorMessage = '📱 如果刚才弹出了权限对话框，请点击"允许"。\n\n'
                      '如果没有弹出对话框，说明权限状态有问题，请尝试：\n'
                      '1. 删除应用并重新安装\n'
                      '2. 重启iPhone\n'
                      '3. 重新安装后再试';
      }
      
      setState(() {
        _status = errorMessage;
      });
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }
}
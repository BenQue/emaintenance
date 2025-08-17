import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class ForceCameraPermission extends StatefulWidget {
  const ForceCameraPermission({super.key});

  @override
  State<ForceCameraPermission> createState() => _ForceCameraPermissionState();
}

class _ForceCameraPermissionState extends State<ForceCameraPermission> {
  String _result = '准备强制请求相机权限...';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('强制相机权限'),
        backgroundColor: Colors.red,
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.warning,
                size: 80,
                color: Colors.red,
              ),
              const SizedBox(height: 24),
              const Text(
                '强制权限请求',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                _result,
                style: const TextStyle(fontSize: 16),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _forcePermissionRequest,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                ),
                child: const Text('强制请求权限'),
              ),
              const SizedBox(height: 16),
              const Text(
                '说明：\n'
                '1. 如果权限对话框没有弹出\n'
                '2. 请删除应用并重新安装\n'
                '3. 或重启iPhone后再试',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _forcePermissionRequest() async {
    setState(() {
      _result = '正在尝试多种方法请求权限...';
    });

    try {
      // 方法1: 使用Method Channel直接调用iOS权限
      const platform = MethodChannel('camera_permission_channel');
      
      try {
        final result = await platform.invokeMethod('requestCameraPermission');
        setState(() {
          _result = '原生方法结果: $result';
        });
      } catch (e) {
        
        // 方法2: 尝试直接访问相机硬件
        setState(() {
          _result = '原生方法失败，尝试其他方式...\n\n'
                   '如果仍然没有权限对话框，请：\n'
                   '1. 完全删除应用\n'
                   '2. 重启iPhone\n'
                   '3. 重新安装应用';
        });
      }
    } catch (e) {
      setState(() {
        _result = '所有方法都失败了。\n\n'
               '请手动解决：\n'
               '1. 删除应用\n'
               '2. iPhone设置 → 通用 → 还原 → 还原位置与隐私\n'
               '3. 重启iPhone\n'
               '4. 重新安装应用';
      });
    }
  }
}
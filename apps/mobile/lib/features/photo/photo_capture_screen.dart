import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:io';

class PhotoCaptureScreen extends StatefulWidget {
  const PhotoCaptureScreen({super.key});

  @override
  State<PhotoCaptureScreen> createState() => _PhotoCaptureScreenState();
}

class _PhotoCaptureScreenState extends State<PhotoCaptureScreen> {
  CameraController? _cameraController;
  List<CameraDescription>? _cameras;
  bool _isCameraInitialized = false;
  bool _hasPermission = false;
  String? _errorMessage;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    
    try {
      // 使用和QR扫描器相同的权限处理方式：直接调用availableCameras
      // 这会自动触发权限请求对话框（如果需要的话）
      _cameras = await availableCameras();
      
      if (_cameras!.isEmpty) {
        setState(() {
          _hasPermission = false;
          _errorMessage = '设备上未找到相机';
        });
        return;
      }

      // 创建并初始化相机控制器
      _cameraController = CameraController(
        _cameras![0], // 使用后置相机
        ResolutionPreset.high,
      );
      
      await _cameraController!.initialize();
      
      if (mounted) {
        setState(() {
          _hasPermission = true;
          _isCameraInitialized = true;
        });
      }
      
    } catch (e) {
      setState(() {
        _hasPermission = false;
        _errorMessage = '相机初始化失败: $e';
      });
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  Future<void> _takePicture() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      return;
    }

    try {
      final XFile picture = await _cameraController!.takePicture();
      
      if (mounted) {
        // Navigate to photo review screen
        final result = await Navigator.of(context).push<String>(
          MaterialPageRoute(
            builder: (context) => PhotoReviewScreen(imagePath: picture.path),
          ),
        );
        
        if (result != null) {
          Navigator.of(context).pop(result);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('拍照失败: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _pickFromGallery() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      
      if (image != null && mounted) {
        // Navigate to photo review screen
        final result = await Navigator.of(context).push<String>(
          MaterialPageRoute(
            builder: (context) => PhotoReviewScreen(imagePath: image.path),
          ),
        );
        
        if (result != null) {
          Navigator.of(context).pop(result);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('选择照片失败: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('拍照记录'),
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
      ),
      body: _buildBody(),
      backgroundColor: Colors.black,
    );
  }

  Widget _buildBody() {
    if (!_hasPermission) {
      return _buildPermissionDenied();
    }

    if (!_isCameraInitialized) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
    }

    return Stack(
      children: [
        // Camera preview
        Positioned.fill(
          child: CameraPreview(_cameraController!),
        ),
        
        // Bottom controls
        Positioned(
          bottom: 50,
          left: 0,
          right: 0,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              // Gallery button
              CircleAvatar(
                radius: 30,
                backgroundColor: Colors.white.withOpacity(0.8),
                child: IconButton(
                  onPressed: _pickFromGallery,
                  icon: const Icon(Icons.photo_library, size: 30),
                  color: Colors.black,
                ),
              ),
              
              // Capture button
              GestureDetector(
                onTap: _takePicture,
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 4),
                  ),
                  child: Container(
                    margin: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
              
              // Placeholder for symmetry
              const SizedBox(width: 60),
            ],
          ),
        ),
        
        // Instructions
        Positioned(
          top: 50,
          left: 20,
          right: 20,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Colors.black54,
              borderRadius: BorderRadius.all(Radius.circular(8)),
            ),
            child: const Column(
              children: [
                Icon(Icons.camera_alt, color: Colors.white, size: 32),
                SizedBox(height: 8),
                Text(
                  '拍摄设备故障照片',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 4),
                Text(
                  '请确保故障部位清晰可见',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPermissionDenied() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.camera_alt_outlined,
              size: 100,
              color: Colors.white,
            ),
            const SizedBox(height: 24),
            const Text(
              '需要相机权限',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _errorMessage ?? '请允许访问相机以拍照',
              style: const TextStyle(
                fontSize: 16,
                color: Colors.white70,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Column(
              children: [
                // 权限测试按钮（和QR扫描器一样）
                ElevatedButton(
                  onPressed: _testCameraPermission,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(200, 48),
                  ),
                  child: const Text('测试相机权限'),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () async {
                    await openAppSettings();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(200, 48),
                  ),
                  child: const Text('打开设置'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _testCameraPermission() async {
    try {
      // 使用和QR扫描器完全相同的权限测试方式
      final cameras = await availableCameras();
      
      if (cameras.isNotEmpty) {
        // 创建一个临时的相机控制器来测试
        final testController = CameraController(cameras.first, ResolutionPreset.low);
        await testController.initialize();
        await testController.dispose();
        
        
        // 权限获取成功，重新初始化相机
        setState(() {
          _hasPermission = true;
          _errorMessage = null;
        });
        
        _initializeCamera();
      }
    } catch (e) {
      setState(() {
        _errorMessage = '相机权限测试失败: $e';
      });
    }
  }
}

class PhotoReviewScreen extends StatefulWidget {
  final String imagePath;
  
  const PhotoReviewScreen({
    super.key,
    required this.imagePath,
  });

  @override
  State<PhotoReviewScreen> createState() => _PhotoReviewScreenState();
}

class _PhotoReviewScreenState extends State<PhotoReviewScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('确认照片'),
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop(widget.imagePath);
            },
            child: const Text(
              '使用',
              style: TextStyle(color: Colors.white, fontSize: 16),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: Container(
              width: double.infinity,
              color: Colors.black,
              child: Image.file(
                File(widget.imagePath),
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.error, size: 50, color: Colors.white),
                        SizedBox(height: 16),
                        Text(
                          '无法显示照片',
                          style: TextStyle(color: Colors.white),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.black,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.of(context).pop();
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white),
                    ),
                    child: const Text('重新拍摄'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).pop(widget.imagePath);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('确认使用'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      backgroundColor: Colors.black,
    );
  }
}
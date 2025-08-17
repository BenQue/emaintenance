import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:camera/camera.dart';
import '../../shared/services/asset_service.dart';
import '../../shared/services/api_client.dart';
import '../../shared/models/asset.dart';
import '../assets/asset_code_input_screen.dart';

class QRScannerScreen extends StatefulWidget {
  const QRScannerScreen({super.key});

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  MobileScannerController? _controller;
  bool _isLoading = false;
  bool _hasPermission = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initializeScanner();
  }

  Future<void> _initializeScanner() async {
    try {
      
      setState(() {
        _hasPermission = false;
        _errorMessage = '正在初始化相机...';
      });
      
      // 首先检查权限状态
      final status = await Permission.camera.status;
      
      if (status.isGranted) {
        // 权限已授予，直接初始化 MobileScanner
        _controller = MobileScannerController();
        setState(() {
          _hasPermission = true;
          _errorMessage = null;
        });
        return;
      }
      
      // 权限未授予，使用直接相机访问来触发权限对话框
      final cameras = await availableCameras();
      
      if (cameras.isEmpty) {
        setState(() {
          _hasPermission = false;
          _errorMessage = '设备上没有可用的相机';
        });
        return;
      }
      
      // 快速测试相机访问权限
      final testController = CameraController(
        cameras.first,
        ResolutionPreset.low, // 使用低分辨率加快初始化
      );
      
      try {
        await testController.initialize();
        await testController.dispose();
        
        // 权限成功后直接初始化 MobileScanner
        _controller = MobileScannerController();
        setState(() {
          _hasPermission = true;
          _errorMessage = null;
        });
        
      } catch (cameraError) {
        await testController.dispose();
        
        setState(() {
          _hasPermission = false;
          _errorMessage = '相机权限被拒绝。请在弹出的对话框中选择"允许"，或手动到设置中启用相机权限。';
        });
      }
      
    } catch (e) {
      setState(() {
        _hasPermission = false;
        _errorMessage = '初始化扫描器失败: ${e.toString()}';
      });
    }
  }

  @override
  void dispose() {
    try {
      _controller?.dispose();
    } catch (e) {
    }
    super.dispose();
  }

  Future<void> _onBarcodeDetected(BarcodeCapture capture) async {
    if (_isLoading) return;

    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isNotEmpty) {
      final String? assetCode = barcodes.first.rawValue;
      if (assetCode != null && assetCode.isNotEmpty) {
        setState(() {
          _isLoading = true;
          _errorMessage = null;
        });

        try {
          // Stop the scanner temporarily
          await _controller?.stop();
          
          // Fetch asset information
          final assetService = await AssetService.getInstance();
          final asset = await assetService.getAssetByCode(assetCode);
          
          if (mounted) {
            // Return the asset to the previous screen
            Navigator.of(context).pop(asset);
          }
        } catch (e) {
          if (mounted) {
            String errorMessage = '无法找到设备: $assetCode';
            if (e is ApiException) {
              errorMessage += '\n错误详情: ${e.message}';
              if (e.statusCode != null) {
                errorMessage += '\n状态码: ${e.statusCode}';
              }
            } else {
              errorMessage += '\n错误详情: ${e.toString()}';
            }
            
            setState(() {
              _isLoading = false;
              _errorMessage = errorMessage;
            });
            
            // Restart the scanner after error
            await Future.delayed(const Duration(seconds: 3)); // 给更多时间阅读错误信息
            if (mounted) {
              await _controller?.start();
              setState(() {
                _errorMessage = null;
              });
            }
          }
        }
      }
    }
  }

  void _toggleFlash() {
    _controller?.toggleTorch();
  }

  Future<void> _showManualInput() async {
    try {
      // 暂停扫描器以避免冲突
      await _controller?.stop();
      
      // 导航到手工输入界面
      final result = await Navigator.of(context).push<Asset>(
        MaterialPageRoute(
          builder: (context) => AssetCodeInputScreen(
            title: '手工输入资产代码',
            subtitle: '当无法扫描二维码时，可以手工输入资产代码进行查找',
            showQROption: false, // 不显示QR选项，因为我们已经在QR界面了
            onAssetSelected: (asset) {
              Navigator.of(context).pop(asset);
            },
          ),
        ),
      );
      
      if (result != null && mounted) {
        // 返回选中的资产到上一个界面
        Navigator.of(context).pop(result);
      } else {
        // 用户取消了，重启扫描器
        await _controller?.start();
      }
    } catch (e) {
      // 发生错误，重启扫描器
      await _controller?.start();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('打开手工输入失败: $e'),
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
        title: const Text('扫描设备二维码'),
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        actions: [
          // 手工输入资产代码按钮
          IconButton(
            icon: const Icon(Icons.keyboard),
            onPressed: _showManualInput,
            tooltip: '手工输入资产代码',
          ),
          if (_hasPermission)
            IconButton(
              icon: const Icon(Icons.flash_on),
              onPressed: _toggleFlash,
              tooltip: '开关闪光灯',
            ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (!_hasPermission) {
      return _buildPermissionDenied();
    }

    return Stack(
      children: [
        // Scanner view
        if (_controller != null)
          MobileScanner(
            controller: _controller!,
            onDetect: _onBarcodeDetected,
          )
        else
          const Center(
            child: CircularProgressIndicator(),
          ),
        
        // Overlay
        Container(
          decoration: ShapeDecoration(
            shape: QrScannerOverlayShape(
              borderColor: Colors.blue,
              borderRadius: 10,
              borderLength: 30,
              borderWidth: 10,
              cutOutSize: 250,
            ),
          ),
        ),
        
        // Instructions
        Positioned(
          bottom: 100,
          left: 0,
          right: 0,
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 20),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.7),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.qr_code_scanner,
                  color: Colors.white,
                  size: 32,
                ),
                const SizedBox(height: 8),
                const Text(
                  '将二维码放在取景框内',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                const Text(
                  '扫描成功后将自动识别设备信息',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                // 手工输入按钮
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _showManualInput,
                    icon: const Icon(Icons.keyboard, color: Colors.white),
                    label: const Text(
                      '手工输入资产代码',
                      style: TextStyle(color: Colors.white),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.white),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        
        // Loading overlay
        if (_isLoading)
          Container(
            color: Colors.black.withOpacity(0.5),
            child: const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: Colors.blue),
                  SizedBox(height: 16),
                  Text(
                    '正在获取设备信息...',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
          ),
        
        // Error message
        if (_errorMessage != null)
          Positioned(
            top: 20,
            left: 20,
            right: 20,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error, color: Colors.white),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () {
                      setState(() {
                        _errorMessage = null;
                      });
                    },
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
              color: Colors.grey,
            ),
            const SizedBox(height: 24),
            const Text(
              '需要相机权限',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _errorMessage ?? '请允许访问相机以扫描二维码',
              style: const TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton(
                  onPressed: () async {
                    // 使用与绿色测试按钮相同的直接相机访问方法
                    setState(() {
                      _errorMessage = '正在直接访问相机硬件（这会触发权限对话框）...';
                    });

                    try {
                      final cameras = await availableCameras();
                      
                      if (cameras.isEmpty) {
                        setState(() {
                          _errorMessage = '没有找到可用的相机设备';
                        });
                        return;
                      }

                      // 直接尝试初始化相机 - 这会触发权限对话框
                      final testController = CameraController(
                        cameras.first,
                        ResolutionPreset.medium,
                      );

                      await testController.initialize();
                      await testController.dispose();

                      // 成功后重新初始化扫描器
                      await _initializeScanner();
                      
                    } catch (e) {
                      setState(() {
                        _errorMessage = '相机权限被拒绝。如果刚才弹出了权限对话框，请点击"允许"。';
                      });
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('重新请求'),
                ),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: () async {
                    await openAppSettings();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
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
}

class QrScannerOverlayShape extends ShapeBorder {
  final Color borderColor;
  final double borderWidth;
  final Color overlayColor;
  final double borderRadius;
  final double borderLength;
  final double cutOutSize;

  const QrScannerOverlayShape({
    this.borderColor = Colors.red,
    this.borderWidth = 3.0,
    this.overlayColor = const Color.fromRGBO(0, 0, 0, 80),
    this.borderRadius = 0,
    this.borderLength = 40,
    this.cutOutSize = 250,
  });

  @override
  EdgeInsetsGeometry get dimensions => const EdgeInsets.all(10);

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) {
    return Path()
      ..fillType = PathFillType.evenOdd
      ..addPath(getOuterPath(rect), Offset.zero);
  }

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    Path outerPath = Path()..addRect(rect);
    Path holePath = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(
            center: rect.center,
            width: cutOutSize,
            height: cutOutSize,
          ),
          Radius.circular(borderRadius),
        ),
      );
    return Path.combine(PathOperation.difference, outerPath, holePath);
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    final width = rect.width;
    final borderWidthSize = borderWidth;
    final height = rect.height;
    final borderOffset = borderWidthSize / 2;
    final mBorderLength = borderLength > cutOutSize / 2 + borderWidthSize * 2
        ? borderWidthSize * 2 + cutOutSize / 2
        : borderLength;
    final mCutOutSize = cutOutSize < width ? cutOutSize : width - borderOffset;

    final backgroundPaint = Paint()
      ..color = overlayColor
      ..style = PaintingStyle.fill;

    final borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = borderWidthSize;

    final boxPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.fill
      ..blendMode = BlendMode.dstOut;

    final cutOutRect = Rect.fromLTWH(
      rect.left + width / 2 - mCutOutSize / 2 + borderOffset,
      rect.top + height / 2 - mCutOutSize / 2 + borderOffset,
      mCutOutSize - borderOffset * 2,
      mCutOutSize - borderOffset * 2,
    );

    canvas
      ..saveLayer(
        rect,
        backgroundPaint,
      )
      ..drawRect(rect, backgroundPaint)
      ..drawRRect(
        RRect.fromRectAndRadius(
          cutOutRect,
          Radius.circular(borderRadius),
        ),
        boxPaint,
      )
      ..restore();

    // Draw border corners
    final path = Path()
      // Top left
      ..moveTo(cutOutRect.left - borderOffset, cutOutRect.top + mBorderLength)
      ..lineTo(cutOutRect.left - borderOffset, cutOutRect.top + borderRadius)
      ..quadraticBezierTo(cutOutRect.left - borderOffset,
          cutOutRect.top - borderOffset, cutOutRect.left + borderRadius, cutOutRect.top - borderOffset)
      ..lineTo(cutOutRect.left + mBorderLength, cutOutRect.top - borderOffset)
      // Top right
      ..moveTo(cutOutRect.right - mBorderLength, cutOutRect.top - borderOffset)
      ..lineTo(cutOutRect.right - borderRadius, cutOutRect.top - borderOffset)
      ..quadraticBezierTo(cutOutRect.right + borderOffset,
          cutOutRect.top - borderOffset, cutOutRect.right + borderOffset, cutOutRect.top + borderRadius)
      ..lineTo(cutOutRect.right + borderOffset, cutOutRect.top + mBorderLength)
      // Bottom right
      ..moveTo(cutOutRect.right + borderOffset, cutOutRect.bottom - mBorderLength)
      ..lineTo(cutOutRect.right + borderOffset, cutOutRect.bottom - borderRadius)
      ..quadraticBezierTo(cutOutRect.right + borderOffset,
          cutOutRect.bottom + borderOffset, cutOutRect.right - borderRadius, cutOutRect.bottom + borderOffset)
      ..lineTo(cutOutRect.right - mBorderLength, cutOutRect.bottom + borderOffset)
      // Bottom left
      ..moveTo(cutOutRect.left + mBorderLength, cutOutRect.bottom + borderOffset)
      ..lineTo(cutOutRect.left + borderRadius, cutOutRect.bottom + borderOffset)
      ..quadraticBezierTo(cutOutRect.left - borderOffset,
          cutOutRect.bottom + borderOffset, cutOutRect.left - borderOffset, cutOutRect.bottom - borderRadius)
      ..lineTo(cutOutRect.left - borderOffset, cutOutRect.bottom - mBorderLength);

    canvas.drawPath(path, borderPaint);
  }

  @override
  ShapeBorder scale(double t) {
    return QrScannerOverlayShape(
      borderColor: borderColor,
      borderWidth: borderWidth,
      overlayColor: overlayColor,
    );
  }
}
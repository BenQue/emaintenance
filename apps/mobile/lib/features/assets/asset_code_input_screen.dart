import 'package:flutter/material.dart';
import '../../shared/models/asset.dart';
import '../../shared/services/asset_service.dart';
import '../scanner/qr_scanner_screen.dart';
import 'asset_search_widget.dart';
import 'asset_validation_widget.dart';

class AssetCodeInputScreen extends StatefulWidget {
  final String? title;
  final String? subtitle;
  final bool showQROption;
  final String? initialLocation;
  final bool? filterActive;
  final Function(Asset) onAssetSelected;

  const AssetCodeInputScreen({
    Key? key,
    this.title,
    this.subtitle,
    this.showQROption = true,
    this.initialLocation,
    this.filterActive,
    required this.onAssetSelected,
  }) : super(key: key);

  @override
  State<AssetCodeInputScreen> createState() => _AssetCodeInputScreenState();
}

class _AssetCodeInputScreenState extends State<AssetCodeInputScreen> {
  Asset? selectedAsset;
  bool isLoading = false;
  String? errorMessage;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title ?? '选择资产'),
        backgroundColor: Colors.blue[600],
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Header section
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue[600],
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(20),
                bottomRight: Radius.circular(20),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (widget.subtitle != null)
                  Text(
                    widget.subtitle!,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                    ),
                  ),
              ],
            ),
          ),
          
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Manual Input Section (Primary)
                  _buildManualInputSection(),
                  
                  const SizedBox(height: 24),
                  
                  // QR Code Scanner Option (Backup)
                  if (widget.showQROption) ...[
                    const Row(
                      children: [
                        Expanded(child: Divider()),
                        Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16),
                          child: Text(
                            '或使用备用方式',
                            style: TextStyle(
                              color: Colors.grey,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        Expanded(child: Divider()),
                      ],
                    ),
                    
                    const SizedBox(height: 24),
                    
                    _buildCameraQRScannerSection(),
                  ],
                  
                  const SizedBox(height: 24),
                  
                  // Selected Asset Display
                  if (selectedAsset != null) ...[
                    AssetValidationWidget(
                      asset: selectedAsset!,
                      onAssetTap: _onAssetSelected,
                      showConfirmButton: false,
                    ),
                    const SizedBox(height: 16),
                  ],
                  
                  // Error Message
                  if (errorMessage != null) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red[50],
                        border: Border.all(color: Colors.red[200]!),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.error_outline, color: Colors.red[600], size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              errorMessage!,
                              style: TextStyle(color: Colors.red[700]),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ],
              ),
            ),
          ),
          
          // Bottom Action Bar
          if (selectedAsset != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.grey.withOpacity(0.2),
                    spreadRadius: 1,
                    blurRadius: 4,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _clearSelection,
                      child: const Text('重新选择'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _onAssetSelected(selectedAsset!),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue[600],
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('确认选择'),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCameraQRScannerSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        border: Border.all(color: Colors.grey[300]!, width: 1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(
            Icons.camera_alt,
            size: 40,
            color: Colors.grey[600],
          ),
          const SizedBox(height: 12),
          const Text(
            '摄像头拍照识别',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            '使用摄像头拍照识别资产二维码（备用方式）',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.grey,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _openQRScanner,
              icon: const Icon(Icons.camera_alt),
              label: const Text('打开摄像头'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
                side: BorderSide(color: Colors.grey[400]!),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildManualInputSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.blue[50],
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Icon(Icons.keyboard, color: Colors.blue[700], size: 24),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '扫码或手工输入资产代码',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      '使用PDA扫码头或手工输入',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.black54,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        AssetSearchWidget(
          onAssetSelected: _onAssetFound,
          location: widget.initialLocation,
          isActive: widget.filterActive,
        ),
      ],
    );
  }

  void _onAssetFound(Asset asset) {
    setState(() {
      selectedAsset = asset;
      errorMessage = null;
    });
  }

  void _onAssetSelected(Asset asset) {
    widget.onAssetSelected(asset);
    Navigator.of(context).pop(asset);
  }

  void _clearSelection() {
    setState(() {
      selectedAsset = null;
      errorMessage = null;
    });
  }

  Future<void> _openQRScanner() async {
    try {
      final result = await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => const QRScannerScreen(),
        ),
      );

      if (result != null && result is String) {
        // QR code scanned successfully, try to get asset by code
        setState(() {
          isLoading = true;
          errorMessage = null;
        });

        try {
          final assetService = await AssetService.getInstance();
          final asset = await assetService.getAssetByCode(result);
          
          setState(() {
            selectedAsset = asset;
            isLoading = false;
          });
        } catch (e) {
          setState(() {
            selectedAsset = null;
            isLoading = false;
            errorMessage = '无法找到资产代码 "$result" 对应的资产';
          });
        }
      }
    } catch (e) {
      setState(() {
        isLoading = false;
        errorMessage = '扫描失败: ${e.toString()}';
      });
    }
  }

  static Future<Asset?> show({
    required BuildContext context,
    String? title,
    String? subtitle,
    bool showQROption = true,
    String? initialLocation,
    bool? filterActive,
  }) async {
    return showModalBottomSheet<Asset>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.9,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
          ),
        ),
        child: AssetCodeInputScreen(
          title: title,
          subtitle: subtitle,
          showQROption: showQROption,
          initialLocation: initialLocation,
          filterActive: filterActive,
          onAssetSelected: (asset) {
            Navigator.of(context).pop(asset);
          },
        ),
      ),
    );
  }
}
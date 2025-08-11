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
                  // QR Code Scanner Option
                  if (widget.showQROption) ...[
                    _buildQRScannerSection(),
                    const SizedBox(height: 24),
                    
                    const Row(
                      children: [
                        Expanded(child: Divider()),
                        Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16),
                          child: Text(
                            '或',
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
                  ],
                  
                  // Manual Input Section
                  _buildManualInputSection(),
                  
                  const SizedBox(height: 24),
                  
                  // Selected Asset Display
                  if (selectedAsset != null) ...[
                    AssetValidationWidget(
                      asset: selectedAsset!,
                      onAssetTap: _onAssetSelected,
                      showConfirmButton: true,
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

  Widget _buildQRScannerSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey[300]!, width: 2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(
            Icons.qr_code_scanner,
            size: 48,
            color: Colors.blue[600],
          ),
          const SizedBox(height: 12),
          const Text(
            '扫描二维码',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            '使用摄像头扫描资产上的二维码来快速识别',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.grey,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _openQRScanner,
              icon: const Icon(Icons.qr_code_scanner),
              label: const Text('扫描二维码'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue[600],
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
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
        Row(
          children: [
            Icon(Icons.edit, color: Colors.grey[600], size: 20),
            const SizedBox(width: 8),
            const Text(
              '手工输入资产代码',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
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
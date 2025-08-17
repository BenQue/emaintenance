import 'package:flutter/material.dart';
import 'dart:async';
import '../../shared/models/asset.dart';
import '../../shared/services/asset_service.dart';

class AssetSearchWidget extends StatefulWidget {
  final Function(Asset) onAssetSelected;
  final String? location;
  final bool? isActive;
  final String? hintText;

  const AssetSearchWidget({
    Key? key,
    required this.onAssetSelected,
    this.location,
    this.isActive,
    this.hintText,
  }) : super(key: key);

  @override
  State<AssetSearchWidget> createState() => _AssetSearchWidgetState();
}

class _AssetSearchWidgetState extends State<AssetSearchWidget> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  
  List<Asset> suggestions = [];
  bool isLoading = false;
  bool showSuggestions = false;
  Timer? _debounceTimer;
  
  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Input field
        TextFormField(
          controller: _controller,
          focusNode: _focusNode,
          decoration: InputDecoration(
            hintText: widget.hintText ?? '输入资产代码进行搜索...',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isLoading)
                  const Padding(
                    padding: EdgeInsets.all(12),
                    child: SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                if (_controller.text.isNotEmpty)
                  IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: _clearInput,
                  ),
                IconButton(
                  icon: const Icon(Icons.check_circle),
                  onPressed: _validateInput,
                ),
              ],
            ),
            border: const OutlineInputBorder(),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
          onChanged: _onInputChanged,
          onFieldSubmitted: (_) => _validateInput(),
        ),
        
        // Suggestions list
        if (showSuggestions && suggestions.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 8),
            constraints: const BoxConstraints(maxHeight: 300),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: Colors.grey[300]!),
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withOpacity(0.2),
                  spreadRadius: 1,
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: suggestions.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final asset = suggestions[index];
                return ListTile(
                  dense: true,
                  leading: CircleAvatar(
                    radius: 16,
                    backgroundColor: asset.isActive ? Colors.green[100] : Colors.grey[200],
                    child: Icon(
                      Icons.inventory_2,
                      size: 16,
                      color: asset.isActive ? Colors.green[700] : Colors.grey[600],
                    ),
                  ),
                  title: Text(
                    asset.assetCode,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontFamily: 'monospace',
                    ),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        asset.name,
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                      if (asset.location.isNotEmpty)
                        Text(
                          '位置: ${asset.location}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                    ],
                  ),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: asset.isActive ? Colors.green[100] : Colors.grey[200],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      asset.isActive ? '活跃' : '非活跃',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: asset.isActive ? Colors.green[700] : Colors.grey[600],
                      ),
                    ),
                  ),
                  onTap: () => _selectAsset(asset),
                );
              },
            ),
          ),
        
        // No results message
        if (showSuggestions && suggestions.isEmpty && _controller.text.isNotEmpty && !isLoading)
          Container(
            margin: const EdgeInsets.only(top: 8),
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.red[50],
              border: Border.all(color: Colors.red[200]!),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                Icon(Icons.search_off, color: Colors.red[400], size: 32),
                const SizedBox(height: 8),
                Text(
                  '未找到匹配的资产代码',
                  style: TextStyle(
                    color: Colors.red[700],
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  '请检查输入或尝试其他搜索词',
                  style: TextStyle(
                    color: Colors.red[600],
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  void _onInputChanged(String value) {
    // Cancel any existing timer
    _debounceTimer?.cancel();
    
    if (value.isEmpty) {
      setState(() {
        suggestions.clear();
        showSuggestions = false;
      });
      return;
    }

    // Start a new timer
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      _searchAssets(value);
    });
  }

  Future<void> _searchAssets(String input) async {
    if (input.trim().isEmpty) return;

    setState(() {
      isLoading = true;
    });

    try {
      final assetService = await AssetService.getInstance();
      final results = await assetService.getAssetSuggestions(
        input.trim(),
        location: widget.location,
        isActive: widget.isActive,
        limit: 10,
      );

      setState(() {
        suggestions = results;
        showSuggestions = true;
        isLoading = false;
      });

      // Auto-select if there's an exact match
      final exactMatch = results.where((asset) =>
          asset.assetCode.toLowerCase() == input.trim().toLowerCase()).toList();
      
      if (exactMatch.isNotEmpty) {
        _selectAsset(exactMatch.first);
      }
      
    } catch (e) {
      setState(() {
        suggestions.clear();
        showSuggestions = true;
        isLoading = false;
      });
    }
  }

  Future<void> _validateInput() async {
    final input = _controller.text.trim();
    if (input.isEmpty) return;

    setState(() {
      isLoading = true;
      showSuggestions = false;
    });

    try {
      final assetService = await AssetService.getInstance();
      final result = await assetService.validateAssetCode(input);

      setState(() {
        isLoading = false;
      });

      if (result.exists && result.asset != null) {
        _selectAsset(result.asset!);
      } else {
        // Show error message
        _showErrorSnackBar('资产代码 "$input" 不存在');
        // Also search for suggestions
        await _searchAssets(input);
      }
    } catch (e) {
      setState(() {
        isLoading = false;
      });
      _showErrorSnackBar('验证失败: ${e.toString()}');
    }
  }

  void _selectAsset(Asset asset) {
    _controller.text = asset.assetCode;
    setState(() {
      suggestions.clear();
      showSuggestions = false;
    });
    
    // Unfocus the text field
    _focusNode.unfocus();
    
    // Notify parent
    widget.onAssetSelected(asset);
  }

  void _clearInput() {
    _controller.clear();
    setState(() {
      suggestions.clear();
      showSuggestions = false;
    });
    _focusNode.requestFocus();
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red[600],
        behavior: SnackBarBehavior.floating,
        action: SnackBarAction(
          label: '确定',
          textColor: Colors.white,
          onPressed: () {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
          },
        ),
      ),
    );
  }
}
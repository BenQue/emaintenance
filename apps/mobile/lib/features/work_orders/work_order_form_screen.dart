import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:form_builder_validators/form_builder_validators.dart';
import '../../shared/models/asset.dart';
import '../../shared/models/work_order.dart';
import '../../shared/services/asset_service.dart';
import '../../shared/services/work_order_service.dart';
import '../../shared/providers/auth_provider.dart';
import '../photo/photo_capture_screen.dart';

class WorkOrderFormScreen extends StatefulWidget {
  final Asset? asset;
  
  const WorkOrderFormScreen({
    super.key,
    this.asset,
  });

  @override
  State<WorkOrderFormScreen> createState() => _WorkOrderFormScreenState();
}

class _WorkOrderFormScreenState extends State<WorkOrderFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  
  String? _selectedCategory;
  String? _selectedReason;
  Priority _selectedPriority = Priority.medium;
  String? _capturedImagePath;
  
  List<String> _categories = [];
  List<String> _reasons = [];
  List<String> _commonLocations = [];
  
  bool _isLoading = false;
  bool _isSubmitting = false;
  bool _hasSubmitted = false;

  @override
  void initState() {
    super.initState();
    _initializeForm();
    _loadFormData();
  }

  void _initializeForm() {
    // Pre-fill asset information if available
    if (widget.asset != null) {
      _titleController.text = '${widget.asset!.name} 维修请求';
      _locationController.text = widget.asset!.location;
    }
  }

  Future<void> _loadFormData() async {
    print('WorkOrderForm: 开始加载表单数据...');
    setState(() {
      _isLoading = true;
    });

    try {
      print('WorkOrderForm: 获取AssetService实例...');
      final assetService = await AssetService.getInstance();
      
      print('WorkOrderForm: 获取设备类别...');
      final categories = await assetService.getAssetCategories();
      print('WorkOrderForm: 设备类别: $categories');
      
      print('WorkOrderForm: 获取故障原因...');
      final reasons = await assetService.getFailureReasons();
      print('WorkOrderForm: 故障原因: $reasons');
      
      print('WorkOrderForm: 获取常用位置...');
      final locations = await assetService.getCommonLocations();
      print('WorkOrderForm: 常用位置: $locations');

      setState(() {
        _categories = categories;
        _reasons = reasons;
        _commonLocations = locations;
        _isLoading = false;
      });
      print('WorkOrderForm: 表单数据加载完成');
    } catch (e) {
      print('WorkOrderForm: 加载表单数据失败: $e');
      setState(() {
        _isLoading = false;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('加载表单数据失败: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _capturePhoto() async {
    print('WorkOrderForm: 开始拍照...');
    try {
      final result = await Navigator.of(context).push<String>(
        MaterialPageRoute(
          builder: (context) => const PhotoCaptureScreen(),
        ),
      );
      
      print('WorkOrderForm: 拍照结果: $result');
      
      if (result != null) {
        setState(() {
          _capturedImagePath = result;
        });
        print('WorkOrderForm: 照片路径已保存: $_capturedImagePath');
      } else {
        print('WorkOrderForm: 拍照被取消');
      }
    } catch (e) {
      print('WorkOrderForm: 拍照错误: $e');
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

  void _removePhoto() {
    setState(() {
      _capturedImagePath = null;
    });
  }

  Future<void> _submitWorkOrder() async {
    print('WorkOrderForm: 开始提交工单...');
    
    // Prevent multiple submissions
    if (_isSubmitting || _hasSubmitted) {
      print('WorkOrderForm: 工单正在提交或已经提交，忽略重复请求');
      return;
    }
    
    if (!_formKey.currentState!.validate()) {
      print('WorkOrderForm: 表单验证失败');
      return;
    }

    if (_selectedCategory == null) {
      print('WorkOrderForm: 未选择报修类别');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('请选择报修类别'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (_selectedReason == null) {
      print('WorkOrderForm: 未选择报修原因');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('请选择报修原因'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      print('WorkOrderForm: 获取用户信息...');
      final authProvider = context.read<AuthProvider>();
      final currentUser = authProvider.user;
      
      if (currentUser == null) {
        throw Exception('用户未登录');
      }
      print('WorkOrderForm: 当前用户: ${currentUser.fullName}');

      if (widget.asset == null) {
        throw Exception('设备信息缺失');
      }
      print('WorkOrderForm: 设备信息: ${widget.asset!.name}');

      final workOrder = WorkOrderRequest(
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        category: _selectedCategory!,
        reason: _selectedReason!,
        location: _locationController.text.trim().isNotEmpty 
            ? _locationController.text.trim() 
            : widget.asset!.location,
        priority: _selectedPriority,
        assetId: widget.asset!.id,
        attachments: _capturedImagePath != null ? [_capturedImagePath!] : [],
      );
      
      print('WorkOrderForm: 工单数据: ${workOrder.title}, ${workOrder.category}, ${workOrder.reason}');

      // Submit work order to backend
      print('WorkOrderForm: 获取WorkOrderService实例...');
      final workOrderService = await WorkOrderService.getInstance();
      
      print('WorkOrderForm: 调用创建工单API...');
      final createdWorkOrder = await workOrderService.createWorkOrder(workOrder);
      
      print('WorkOrderForm: 工单创建成功: ${createdWorkOrder.id}');
      
      // Mark as submitted to prevent multiple submissions
      setState(() {
        _hasSubmitted = true;
      });

      // Upload photo if captured
      if (_capturedImagePath != null) {
        print('WorkOrderForm: 上传工单故障照片...');
        try {
          await workOrderService.uploadWorkOrderPhotos(
            createdWorkOrder.id,
            [_capturedImagePath!],
          );
          print('WorkOrderForm: 故障照片上传成功');
        } catch (e) {
          print('WorkOrderForm: 故障照片上传失败: $e');
          // Continue even if photo upload fails
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('照片上传失败: $e'),
                backgroundColor: Colors.orange,
              ),
            );
          }
        }
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('工单提交成功 - 工单号: ${createdWorkOrder.id}'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );
        
        // Wait a moment for the snackbar to show, then navigate
        await Future.delayed(const Duration(milliseconds: 500));
        
        if (mounted) {
          // Navigate back to home screen
          print('WorkOrderForm: 开始返回主页面...');
          print('WorkOrderForm: 当前路由栈深度: ${Navigator.of(context).canPop()}');
          
          // Use a more reliable navigation approach
          Navigator.of(context).pushNamedAndRemoveUntil(
            '/home',
            (route) => false, // Remove all previous routes
          );
          
          print('WorkOrderForm: 已执行导航返回主页');
        }
      }
    } catch (e) {
      print('WorkOrderForm: 提交工单失败: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('提交失败: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('创建维修工单'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: _isLoading 
          ? const Center(child: CircularProgressIndicator())
          : _buildForm(),
      bottomNavigationBar: _buildSubmitButton(),
    );
  }

  Widget _buildForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Asset information card
            if (widget.asset != null) _buildAssetCard(),
            
            const SizedBox(height: 16),
            
            // Title field
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: '工单标题',
                hintText: '请输入工单标题',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.title),
              ),
              validator: FormBuilderValidators.compose([
                FormBuilderValidators.required(errorText: '请输入工单标题'),
                FormBuilderValidators.minLength(5, errorText: '标题至少需要5个字符'),
              ]),
            ),
            
            const SizedBox(height: 16),
            
            // Category dropdown
            DropdownButtonFormField<String>(
              value: _selectedCategory,
              decoration: const InputDecoration(
                labelText: '报修类别',
                hintText: '请选择报修类别',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.category),
              ),
              items: _categories.map((category) {
                return DropdownMenuItem(
                  value: category,
                  child: Text(category),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _selectedCategory = value;
                });
              },
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return '请选择报修类别';
                }
                return null;
              },
            ),
            
            const SizedBox(height: 16),
            
            // Reason dropdown
            DropdownButtonFormField<String>(
              value: _selectedReason,
              decoration: const InputDecoration(
                labelText: '报修原因',
                hintText: '请选择报修原因',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.error_outline),
              ),
              items: _reasons.map((reason) {
                return DropdownMenuItem(
                  value: reason,
                  child: Text(reason),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _selectedReason = value;
                });
              },
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return '请选择报修原因';
                }
                return null;
              },
            ),
            
            const SizedBox(height: 16),
            
            // Location field with suggestions
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextFormField(
                  controller: _locationController,
                  decoration: const InputDecoration(
                    labelText: '具体位置',
                    hintText: '请输入或选择具体位置',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.location_on),
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: _commonLocations.map((location) {
                    return ActionChip(
                      label: Text(location),
                      onPressed: () {
                        _locationController.text = location;
                      },
                    );
                  }).toList(),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // Priority selector
            const Text(
              '优先级',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Row(
              children: Priority.values.map((priority) {
                return Expanded(
                  child: RadioListTile<Priority>(
                    title: Text(_getPriorityDisplayName(priority)),
                    value: priority,
                    groupValue: _selectedPriority,
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          _selectedPriority = value;
                        });
                      }
                    },
                    contentPadding: EdgeInsets.zero,
                  ),
                );
              }).toList(),
            ),
            
            const SizedBox(height: 16),
            
            // Description field
            TextFormField(
              controller: _descriptionController,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: '详细描述（可选）',
                hintText: '请详细描述设备问题',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.description),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Photo capture section
            _buildPhotoSection(),
            
            const SizedBox(height: 80), // Space for bottom button
          ],
        ),
      ),
    );
  }

  Widget _buildAssetCard() {
    final asset = widget.asset!;
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.precision_manufacturing, color: Colors.blue),
                const SizedBox(width: 8),
                const Text(
                  '设备信息',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              asset.displayInfo,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              '设备编号: ${asset.assetCode}',
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 4),
            Text(
              '当前位置: ${asset.location}',
              style: const TextStyle(color: Colors.grey),
            ),
            if (asset.fullDescription.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                asset.fullDescription,
                style: const TextStyle(fontSize: 14),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.camera_alt, color: Colors.blue),
            const SizedBox(width: 8),
            const Text(
              '故障照片（可选）',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 8),
        
        if (_capturedImagePath == null) ...[
          OutlinedButton.icon(
            onPressed: _capturePhoto,
            icon: const Icon(Icons.camera_alt),
            label: const Text('拍照记录'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(double.infinity, 48),
            ),
          ),
        ] else ...[
          Stack(
            children: [
              Container(
                width: double.infinity,
                height: 200,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.asset(
                    _capturedImagePath!,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.image, size: 50, color: Colors.grey),
                            Text('照片已选择'),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: CircleAvatar(
                  backgroundColor: Colors.black54,
                  child: IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: _removePhoto,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _capturePhoto,
            icon: const Icon(Icons.camera_alt),
            label: const Text('重新拍照'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(double.infinity, 48),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildSubmitButton() {
    return Container(
      padding: const EdgeInsets.all(16.0),
      child: SizedBox(
        height: 50,
        child: ElevatedButton(
          onPressed: (_isSubmitting || _hasSubmitted) ? null : _submitWorkOrder,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
          ),
          child: _isSubmitting
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : _hasSubmitted
                  ? const Text(
                      '已提交',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    )
                  : const Text(
                      '提交工单',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
        ),
      ),
    );
  }

  String _getPriorityDisplayName(Priority priority) {
    switch (priority) {
      case Priority.low:
        return '低';
      case Priority.medium:
        return '中';
      case Priority.high:
        return '高';
      case Priority.urgent:
        return '紧急';
    }
  }
}
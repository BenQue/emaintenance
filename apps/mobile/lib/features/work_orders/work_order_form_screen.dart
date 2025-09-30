import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:form_builder_validators/form_builder_validators.dart';
import '../../shared/models/asset.dart';
import '../../shared/models/work_order.dart';
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
  final _additionalLocationController = TextEditingController();

  // State variables
  bool _isLoading = false;
  bool _isSubmitting = false;
  String? _capturedImagePath;
  String? _location;
  Priority _selectedPriority = Priority.medium;
  bool _productionInterrupted = false;
  final Set<FaultSymptom> _selectedFaultSymptoms = <FaultSymptom>{};

  @override
  void initState() {
    super.initState();
    _initializeForm();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _additionalLocationController.dispose();
    super.dispose();
  }

  Future<void> _initializeForm() async {
    if (widget.asset != null) {
      setState(() {
        _isLoading = true;
        _location = widget.asset!.location;
      });

      // Auto-fill title if not already set
      if (_titleController.text.isEmpty) {
        _titleController.text = '${widget.asset!.displayInfo} - 维修请求';
      }

      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _capturePhoto() async {
    try {
      final result = await Navigator.of(context).push<String>(
        MaterialPageRoute(
          builder: (context) => const PhotoCaptureScreen(),
        ),
      );

      if (result != null) {
        setState(() {
          _capturedImagePath = result;
        });
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

  Future<void> _submitForm() async {
    // Validate fault symptom selection
    if (_selectedFaultSymptoms.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('请至少选择一个故障表现'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final workOrderService = await WorkOrderService.getInstance();

      final workOrderRequest = WorkOrderRequest(
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        priority: _selectedPriority,
        assetId: widget.asset?.id,
        faultSymptoms: _selectedFaultSymptoms.toList(),
        location: _location,
        additionalLocation: _additionalLocationController.text.trim().isNotEmpty
            ? _additionalLocationController.text.trim()
            : null,
        productionInterrupted: _productionInterrupted,
        attachments: _capturedImagePath != null ? [_capturedImagePath!] : null,
        requestedBy: authProvider.user?.id ?? '',
        // category 和 reason 使用默认值，后续备用
      );

      final createdWorkOrder = await workOrderService.createWorkOrder(workOrderRequest);

      if (mounted) {
        // Show enhanced success feedback
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '工单提交成功！',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text('工单编号: WO-${createdWorkOrder.id.toString().padLeft(6, '0')}'),
                const Text('预计处理时间: 2-4小时'),
              ],
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 4),
            action: SnackBarAction(
              label: '查看详情',
              textColor: Colors.white,
              onPressed: () {
                // Navigate to work order detail if needed
              },
            ),
          ),
        );

        // Wait a moment for the snackbar to show, then navigate
        await Future.delayed(const Duration(milliseconds: 1000));

        if (mounted) {
          // Navigate back to home screen
          Navigator.of(context).pushNamedAndRemoveUntil(
            '/home',
            (route) => false, // Remove all previous routes
          );
        }
      }
    } catch (e) {
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
        actions: [
          TextButton(
            onPressed: () {
              // 确保能够返回主界面
              if (Navigator.of(context).canPop()) {
                Navigator.of(context).pop();
              } else {
                // 如果无法pop，直接导航到主界面
                Navigator.of(context).pushNamedAndRemoveUntil(
                  '/home',
                  (route) => false,
                );
              }
            },
            child: const Text(
              '取消',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
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

            // Fault symptom selection
            _buildFaultSymptomSelection(),

            const SizedBox(height: 16),

            // Location information (auto-filled and read-only)
            _buildLocationSection(),

            const SizedBox(height: 16),

            // Priority selector with production interruption control
            _buildPrioritySection(),

            const SizedBox(height: 16),

            // Description field
            TextFormField(
              controller: _descriptionController,
              maxLines: 4,
              keyboardType: TextInputType.multiline,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (value) {
                // Hide keyboard when user presses done
                FocusScope.of(context).unfocus();
              },
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
                style: const TextStyle(fontSize: 14, color: Colors.grey),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildFaultSymptomSelection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.bug_report, color: Colors.blue),
            const SizedBox(width: 8),
            const Text(
              '故障表现',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const Text(
              ' *',
              style: TextStyle(color: Colors.red, fontSize: 16),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.blue.shade200),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.info_outline, size: 16, color: Colors.blue),
                  SizedBox(width: 8),
                  Text(
                    '故障表现说明',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blue),
                  ),
                ],
              ),
              SizedBox(height: 4),
              Text(
                '请选择一个或多个故障表现（可多选）。描述您观察到的现象，无需分析故障原因。',
                style: TextStyle(fontSize: 12, color: Colors.blue),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: FaultSymptom.values.map((symptom) {
            final isSelected = _selectedFaultSymptoms.contains(symptom);
            return FilterChip(
              avatar: Icon(
                symptom.icon,
                size: 18,
                color: isSelected ? Colors.white : Colors.blue,
              ),
              label: Text(
                symptom.label,
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.black87,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  if (selected) {
                    _selectedFaultSymptoms.add(symptom);
                  } else {
                    _selectedFaultSymptoms.remove(symptom);
                  }
                });
              },
              selectedColor: Colors.blue,
              backgroundColor: Colors.grey.shade100,
              checkmarkColor: Colors.white,
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildLocationSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.location_on, color: Colors.blue),
            const SizedBox(width: 8),
            const Text(
              '位置信息',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // Auto-filled location (read-only)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(4),
            color: Colors.grey.shade50,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '设备位置（自动获取）',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 4),
              Text(
                _location ?? '未知位置',
                style: const TextStyle(fontSize: 16),
              ),
            ],
          ),
        ),

        const SizedBox(height: 12),

        // Additional location information (optional)
        TextFormField(
          controller: _additionalLocationController,
          decoration: const InputDecoration(
            labelText: '补充位置信息（可选）',
            hintText: '如有特殊位置说明，请在此填写',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.add_location),
          ),
        ),
      ],
    );
  }

  Widget _buildPrioritySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.priority_high, color: Colors.blue),
            const SizedBox(width: 8),
            const Text(
              '优先级设置',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Production interruption checkbox with enhanced help
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.orange.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.orange.shade200),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.warning_amber, size: 16, color: Colors.orange),
                  SizedBox(width: 8),
                  Text(
                    '生产中断判断',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.orange),
                  ),
                ],
              ),
              SizedBox(height: 4),
              Text(
                '如果设备故障导致生产线停止或严重影响生产进度，请勾选此项。',
                style: TextStyle(fontSize: 12, color: Colors.orange),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),

        CheckboxListTile(
          title: const Text('造成生产中断'),
          subtitle: const Text('勾选此项可选择紧急优先级'),
          value: _productionInterrupted,
          onChanged: (value) {
            setState(() {
              _productionInterrupted = value ?? false;
              // Auto-downgrade from urgent if unchecked
              if (!_productionInterrupted && _selectedPriority == Priority.urgent) {
                _selectedPriority = Priority.high;
              }
            });
          },
          contentPadding: EdgeInsets.zero,
        ),

        const SizedBox(height: 8),

        // Priority selection
        const Text(
          '优先级',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),

        Wrap(
          spacing: 8,
          children: _getAvailablePriorities().map((priority) {
            final isSelected = _selectedPriority == priority;
            return ChoiceChip(
              label: Text(
                _getPriorityDisplayName(priority),
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.black87,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
              selected: isSelected,
              onSelected: (selected) {
                if (selected) {
                  setState(() {
                    _selectedPriority = priority;
                  });
                }
              },
              selectedColor: _getPriorityColor(priority),
              backgroundColor: Colors.grey.shade100,
            );
          }).toList(),
        ),
      ],
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
              '拍照记录（可选）',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 8),

        if (_capturedImagePath != null) ...[
          Container(
            height: 200,
            width: double.infinity,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey),
              borderRadius: BorderRadius.circular(8),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                _capturedImagePath!,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return const Center(
                    child: Text('图片加载失败'),
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              TextButton.icon(
                onPressed: _capturePhoto,
                icon: const Icon(Icons.camera_alt),
                label: const Text('重新拍照'),
              ),
              TextButton.icon(
                onPressed: () {
                  setState(() {
                    _capturedImagePath = null;
                  });
                },
                icon: const Icon(Icons.delete),
                label: const Text('删除照片'),
                style: TextButton.styleFrom(foregroundColor: Colors.red),
              ),
            ],
          ),
        ] else ...[
          Container(
            height: 120,
            width: double.infinity,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey, style: BorderStyle.solid),
              borderRadius: BorderRadius.circular(8),
              color: Colors.grey.shade50,
            ),
            child: InkWell(
              onTap: _capturePhoto,
              borderRadius: BorderRadius.circular(8),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.camera_alt, size: 48, color: Colors.grey),
                  SizedBox(height: 8),
                  Text(
                    '点击拍照',
                    style: TextStyle(color: Colors.grey, fontSize: 16),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildSubmitButton() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: ElevatedButton(
        onPressed: _isSubmitting ? null : _submitForm,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.blue,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        child: _isSubmitting
            ? const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  ),
                  SizedBox(width: 12),
                  Text('提交中...', style: TextStyle(fontSize: 16)),
                ],
              )
            : const Text('提交工单', style: TextStyle(fontSize: 16)),
      ),
    );
  }

  List<Priority> _getAvailablePriorities() {
    final priorities = [Priority.low, Priority.medium, Priority.high];

    // Only add urgent if production is interrupted
    if (_productionInterrupted) {
      priorities.add(Priority.urgent);
    }

    return priorities;
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

  Color _getPriorityColor(Priority priority) {
    switch (priority) {
      case Priority.low:
        return Colors.green;
      case Priority.medium:
        return Colors.orange;
      case Priority.high:
        return Colors.red;
      case Priority.urgent:
        return Colors.purple;
    }
  }
}
import 'package:flutter/material.dart';
import '../../shared/models/asset.dart';

class SimpleWorkOrderTest extends StatefulWidget {
  final Asset? asset;
  
  const SimpleWorkOrderTest({
    super.key,
    this.asset,
  });

  @override
  State<SimpleWorkOrderTest> createState() => _SimpleWorkOrderTestState();
}

class _SimpleWorkOrderTestState extends State<SimpleWorkOrderTest> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  
  String? _selectedCategory;
  String? _selectedReason;
  String _selectedPriority = '中等';
  
  final List<String> _categories = [
    '电气故障',
    '机械故障',
    '液压故障',
    '气动故障',
    '控制系统故障',
    '安全系统故障',
    '清洁维护',
    '预防性维护',
    '软件问题',
    '其他',
  ];
  
  final Map<String, List<String>> _reasonsByCategory = {
    '电气故障': ['电路断路', '短路', '电压不稳', '电机故障', '传感器失效'],
    '机械故障': ['零件磨损', '轴承损坏', '传动故障', '振动异常', '噪音过大'],
    '液压故障': ['液压泵故障', '管路泄漏', '压力异常', '液压缸故障', '过滤器堵塞'],
    '气动故障': ['气压不足', '气路泄漏', '气缸故障', '阀门故障', '压缩机问题'],
    '控制系统故障': ['PLC故障', '触摸屏异常', '通讯中断', '程序错误', '参数设置错误'],
    '安全系统故障': ['安全门故障', '急停按钮失效', '光幕故障', '报警器故障', '安全锁失效'],
    '清洁维护': ['设备清洁', '润滑保养', '滤网更换', '排水清理', '外观维护'],
    '预防性维护': ['定期检查', '零件更换', '系统校准', '性能测试', '文档更新'],
    '软件问题': ['系统卡死', '界面异常', '数据错误', '网络连接', '权限问题'],
    '其他': ['环境因素', '人为操作', '配件缺失', '文档问题', '其他原因'],
  };

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('简化维修工单测试'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Asset information
              if (widget.asset != null) _buildAssetInfo(),
              
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
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return '请输入工单标题';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Category dropdown
              DropdownButtonFormField<String>(
                value: _selectedCategory,
                decoration: const InputDecoration(
                  labelText: '报修类别',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.category),
                ),
                hint: const Text('请选择报修类别'),
                items: _categories.map((String category) {
                  return DropdownMenuItem<String>(
                    value: category,
                    child: Text(category),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    _selectedCategory = value;
                    _selectedReason = null; // 重置原因选择
                  });
                },
                validator: (value) {
                  if (value == null) {
                    return '请选择报修类别';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Reason dropdown (only show if category is selected)
              if (_selectedCategory != null)
                DropdownButtonFormField<String>(
                  value: _selectedReason,
                  decoration: const InputDecoration(
                    labelText: '报修原因',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.build_outlined),
                  ),
                  hint: const Text('请选择具体原因'),
                  items: _reasonsByCategory[_selectedCategory]!.map((String reason) {
                    return DropdownMenuItem<String>(
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
                    if (value == null) {
                      return '请选择报修原因';
                    }
                    return null;
                  },
                ),
              
              const SizedBox(height: 16),
              
              // Priority dropdown
              DropdownButtonFormField<String>(
                value: _selectedPriority,
                decoration: const InputDecoration(
                  labelText: '优先级',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.priority_high),
                ),
                items: const [
                  DropdownMenuItem(value: '低', child: Text('低')),
                  DropdownMenuItem(value: '中等', child: Text('中等')),
                  DropdownMenuItem(value: '高', child: Text('高')),
                  DropdownMenuItem(value: '紧急', child: Text('紧急')),
                ],
                onChanged: (value) {
                  setState(() {
                    _selectedPriority = value!;
                  });
                },
              ),
              
              const SizedBox(height: 16),
              
              // Description field
              TextFormField(
                controller: _descriptionController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: '问题描述',
                  hintText: '请详细描述遇到的问题',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.description),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return '请输入问题描述';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 24),
              
              // Submit button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _submitForm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text(
                    '提交工单',
                    style: TextStyle(fontSize: 16),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAssetInfo() {
    final asset = widget.asset!;
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '设备信息',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.devices, color: Colors.blue),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('${asset.name} (${asset.assetCode})'),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.location_on, color: Colors.green),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(asset.location),
                ),
              ],
            ),
            if (asset.description != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.info_outline, color: Colors.grey),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(asset.description!),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _submitForm() {
    if (_formKey.currentState!.validate()) {
      // Show success dialog
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('提交成功'),
          content: Text(
            '工单信息：\n'
            '标题：${_titleController.text}\n'
            '报修类别：$_selectedCategory\n'
            '报修原因：$_selectedReason\n'
            '优先级：$_selectedPriority\n'
            '描述：${_descriptionController.text}',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                Navigator.of(context).pop();
              },
              child: const Text('确定'),
            ),
          ],
        ),
      );
    }
  }
}
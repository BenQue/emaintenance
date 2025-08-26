import 'package:flutter/material.dart';
import '../../shared/config/environment_flexible.dart';

class ServerSettingsScreen extends StatefulWidget {
  const ServerSettingsScreen({Key? key}) : super(key: key);

  @override
  State<ServerSettingsScreen> createState() => _ServerSettingsScreenState();
}

class _ServerSettingsScreenState extends State<ServerSettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _customServerController = TextEditingController();
  String? _selectedEnvironment;
  Map<String, dynamic>? _currentConfig;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadCurrentConfig();
  }

  Future<void> _loadCurrentConfig() async {
    try {
      final config = await FlexibleEnvironment.getCurrentConfig();
      setState(() {
        _currentConfig = config;
        _customServerController.text = config['customServer'] ?? '';
        _selectedEnvironment = config['selectedEnvironment'];
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      _showError('加载配置失败: $e');
    }
  }

  Future<void> _saveCustomServer() async {
    if (!_formKey.currentState!.validate()) return;
    
    try {
      await FlexibleEnvironment.setCustomServer(_customServerController.text.trim());
      _showSuccess('自定义服务器地址已保存');
      _loadCurrentConfig();
    } catch (e) {
      _showError('保存失败: $e');
    }
  }

  Future<void> _selectEnvironment(String? environment) async {
    if (environment == null) return;
    
    try {
      await FlexibleEnvironment.selectEnvironment(environment);
      _showSuccess('环境已切换到: $environment');
      _loadCurrentConfig();
    } catch (e) {
      _showError('切换环境失败: $e');
    }
  }

  Future<void> _resetToDefault() async {
    try {
      await FlexibleEnvironment.resetToDefault();
      _showSuccess('已重置为默认配置');
      _loadCurrentConfig();
    } catch (e) {
      _showError('重置失败: $e');
    }
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.green),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('服务器设置'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadCurrentConfig,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 当前配置信息
            _buildCurrentConfigSection(),
            const SizedBox(height: 24),
            
            // 环境选择
            _buildEnvironmentSection(),
            const SizedBox(height: 24),
            
            // 自定义服务器
            _buildCustomServerSection(),
            const SizedBox(height: 24),
            
            // 重置按钮
            _buildResetSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentConfigSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('当前配置', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            if (_currentConfig != null) ...[
              _buildConfigItem('基础地址', _currentConfig!['baseUrl']),
              _buildConfigItem('用户服务', _currentConfig!['userService']),
              _buildConfigItem('工单服务', _currentConfig!['workOrderService']),
              _buildConfigItem('资产服务', _currentConfig!['assetService']),
              _buildConfigItem('调试模式', _currentConfig!['isDebugMode'] ? '是' : '否'),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildConfigItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 80, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500))),
          Expanded(child: Text(value, style: const TextStyle(fontFamily: 'monospace'))),
        ],
      ),
    );
  }

  Widget _buildEnvironmentSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('预设环境', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _selectedEnvironment,
              decoration: const InputDecoration(
                labelText: '选择环境',
                border: OutlineInputBorder(),
              ),
              items: FlexibleEnvironment.availableEnvironments.map((env) {
                return DropdownMenuItem(value: env, child: Text(env));
              }).toList(),
              onChanged: _selectEnvironment,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomServerSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('自定义服务器', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              TextFormField(
                controller: _customServerController,
                decoration: const InputDecoration(
                  labelText: '服务器地址',
                  hintText: 'http://192.168.1.100 或 https://api.example.com',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value?.isEmpty ?? true) return null;
                  if (!value!.startsWith('http://') && !value.startsWith('https://')) {
                    return '请输入有效的URL (http:// 或 https://)';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: _saveCustomServer,
                child: const Text('保存自定义服务器'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildResetSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('重置配置', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            const Text('重置为默认配置，将清除所有自定义设置'),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _resetToDefault,
              style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
              child: const Text('重置为默认'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _customServerController.dispose();
    super.dispose();
  }
}
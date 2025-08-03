import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../shared/models/work_order.dart';
import '../../shared/services/work_order_service.dart';
import '../../shared/providers/auth_provider.dart';
import 'work_order_completion_screen.dart';

class WorkOrderDetailScreen extends StatefulWidget {
  final String workOrderId;

  const WorkOrderDetailScreen({
    super.key,
    required this.workOrderId,
  });

  @override
  State<WorkOrderDetailScreen> createState() => _WorkOrderDetailScreenState();
}

class _WorkOrderDetailScreenState extends State<WorkOrderDetailScreen> {
  WorkOrderWithRelations? _workOrder;
  List<WorkOrderStatusHistory>? _statusHistory;
  bool _isLoading = true;
  String? _error;
  bool _isUpdatingStatus = false;

  @override
  void initState() {
    super.initState();
    _loadWorkOrderDetail();
  }

  Future<void> _loadWorkOrderDetail() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final workOrderService = await WorkOrderService.getInstance();
      final workOrder = await workOrderService.getWorkOrderWithHistory(widget.workOrderId);
      final statusHistory = await workOrderService.getWorkOrderStatusHistory(widget.workOrderId);

      setState(() {
        _workOrder = workOrder;
        _statusHistory = statusHistory;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _updateStatus() async {
    if (_workOrder == null) return;

    final result = await showDialog<UpdateWorkOrderStatusRequest>(
      context: context,
      builder: (context) => _StatusUpdateDialog(
        currentStatus: _workOrder!.status,
      ),
    );

    if (result == null) return;

    setState(() {
      _isUpdatingStatus = true;
    });

    try {
      final workOrderService = await WorkOrderService.getInstance();
      final updatedWorkOrder = await workOrderService.updateWorkOrderStatus(
        widget.workOrderId,
        result,
      );

      setState(() {
        _workOrder = updatedWorkOrder;
        _isUpdatingStatus = false;
      });

      // Reload status history
      _loadStatusHistory();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('状态更新成功'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isUpdatingStatus = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('状态更新失败: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _loadStatusHistory() async {
    try {
      final workOrderService = await WorkOrderService.getInstance();
      final statusHistory = await workOrderService.getWorkOrderStatusHistory(widget.workOrderId);

      setState(() {
        _statusHistory = statusHistory;
      });
    } catch (e) {
      // Ignore status history loading errors
    }
  }

  List<WorkOrderStatus> _getAvailableStatusTransitions(WorkOrderStatus currentStatus) {
    switch (currentStatus) {
      case WorkOrderStatus.pending:
        return [WorkOrderStatus.inProgress, WorkOrderStatus.cancelled];
      case WorkOrderStatus.inProgress:
        return [
          WorkOrderStatus.waitingParts,
          WorkOrderStatus.waitingExternal,
          WorkOrderStatus.completed,
          WorkOrderStatus.cancelled,
        ];
      case WorkOrderStatus.waitingParts:
      case WorkOrderStatus.waitingExternal:
        return [WorkOrderStatus.inProgress, WorkOrderStatus.cancelled];
      case WorkOrderStatus.completed:
      case WorkOrderStatus.cancelled:
        return [];
    }
  }

  bool _canUpdateStatus() {
    if (_workOrder == null) return false;
    
    final authProvider = context.read<AuthProvider>();
    final currentUser = authProvider.user;
    
    if (currentUser == null) return false;
    
    // Only assigned technician can update status
    return _workOrder!.assignedToId == currentUser.id;
  }

  bool _canCompleteWorkOrder() {
    if (_workOrder == null) return false;
    
    final authProvider = context.read<AuthProvider>();
    final currentUser = authProvider.user;
    
    if (currentUser == null) return false;
    
    // Only assigned technician can complete work order and it must be in progress
    return _workOrder!.assignedToId == currentUser.id &&
           _workOrder!.status == WorkOrderStatus.inProgress;
  }

  Future<void> _navigateToCompletion() async {
    if (_workOrder == null) return;

    final result = await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => WorkOrderCompletionScreen(
          workOrder: _workOrder!,
        ),
      ),
    );

    if (result == true) {
      // Refresh work order details if completion was successful
      _loadWorkOrderDetail();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('工单详情'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          if (_canCompleteWorkOrder())
            IconButton(
              icon: const Icon(Icons.check_circle),
              onPressed: _navigateToCompletion,
              tooltip: '完成工单',
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadWorkOrderDetail,
          ),
        ],
      ),
      body: _buildBody(),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_error != null) {
      return _buildErrorWidget();
    }

    if (_workOrder == null) {
      return const Center(
        child: Text('工单不存在'),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadWorkOrderDetail,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeaderCard(),
            const SizedBox(height: 16),
            _buildAssetCard(),
            const SizedBox(height: 16),
            _buildDetailsCard(),
            const SizedBox(height: 16),
            _buildStatusHistoryCard(),
            const SizedBox(height: 80), // Space for bottom button
          ],
        ),
      ),
    );
  }

  Widget _buildErrorWidget() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              '加载失败',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadWorkOrderDetail,
              child: const Text('重试'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderCard() {
    final workOrder = _workOrder!;
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    workOrder.title,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _buildStatusChip(workOrder.status),
                    const SizedBox(height: 4),
                    _buildPriorityChip(workOrder.priority),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              workOrder.description,
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 12),
            _buildInfoRow('工单ID', workOrder.id),
            _buildInfoRow('类别', workOrder.category),
            _buildInfoRow('原因', workOrder.reason),
            if (workOrder.location != null)
              _buildInfoRow('位置', workOrder.location!),
            _buildInfoRow('报修时间', _formatDateTime(workOrder.reportedAt)),
            if (workOrder.startedAt != null)
              _buildInfoRow('开始时间', _formatDateTime(workOrder.startedAt!)),
            if (workOrder.completedAt != null)
              _buildInfoRow('完成时间', _formatDateTime(workOrder.completedAt!)),
          ],
        ),
      ),
    );
  }

  Widget _buildAssetCard() {
    final asset = _workOrder!.asset;
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.precision_manufacturing, color: Colors.blue),
                SizedBox(width: 8),
                Text(
                  '设备信息',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildInfoRow('设备名称', asset.name),
            _buildInfoRow('设备编号', asset.assetCode),
            _buildInfoRow('设备位置', asset.location),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailsCard() {
    final workOrder = _workOrder!;
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.info, color: Colors.blue),
                SizedBox(width: 8),
                Text(
                  '工单详情',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildInfoRow('报修人', workOrder.createdBy.fullName),
            if (workOrder.assignedTo != null)
              _buildInfoRow('指派技术员', workOrder.assignedTo!.fullName),
            if (workOrder.solution != null)
              _buildInfoRow('解决方案', workOrder.solution!),
            if (workOrder.faultCode != null)
              _buildInfoRow('故障代码', workOrder.faultCode!),
            if (workOrder.attachments.isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text(
                '附件:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              ...workOrder.attachments.map((attachment) => 
                Padding(
                  padding: const EdgeInsets.only(left: 16.0),
                  child: Text('• $attachment'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusHistoryCard() {
    if (_statusHistory == null || _statusHistory!.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.history, color: Colors.blue),
                SizedBox(width: 8),
                Text(
                  '状态历史',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ..._statusHistory!.map((history) => _buildStatusHistoryItem(history)),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusHistoryItem(WorkOrderStatusHistory history) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 12,
            height: 12,
            margin: const EdgeInsets.only(top: 4),
            decoration: const BoxDecoration(
              color: Colors.blue,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (history.fromStatus != null) ...[
                      Text(
                        _getStatusDisplayName(history.fromStatus!),
                        style: const TextStyle(decoration: TextDecoration.lineThrough),
                      ),
                      const Text(' → '),
                    ],
                    Text(
                      _getStatusDisplayName(history.toStatus),
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  '${history.changedBy.fullName} • ${_formatDateTime(history.createdAt)}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                if (history.notes != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    history.notes!,
                    style: const TextStyle(fontSize: 14),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.grey,
              ),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(WorkOrderStatus status) {
    Color backgroundColor;
    switch (status) {
      case WorkOrderStatus.pending:
        backgroundColor = Colors.orange;
        break;
      case WorkOrderStatus.inProgress:
        backgroundColor = Colors.blue;
        break;
      case WorkOrderStatus.waitingParts:
      case WorkOrderStatus.waitingExternal:
        backgroundColor = Colors.amber;
        break;
      case WorkOrderStatus.completed:
        backgroundColor = Colors.green;
        break;
      case WorkOrderStatus.cancelled:
        backgroundColor = Colors.red;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        _getStatusDisplayName(status),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildPriorityChip(Priority priority) {
    Color backgroundColor;
    switch (priority) {
      case Priority.low:
        backgroundColor = Colors.grey;
        break;
      case Priority.medium:
        backgroundColor = Colors.blue;
        break;
      case Priority.high:
        backgroundColor = Colors.orange;
        break;
      case Priority.urgent:
        backgroundColor = Colors.red;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        _getPriorityDisplayName(priority),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildBottomBar() {
    if (_workOrder == null) {
      return const SizedBox.shrink();
    }

    final canUpdate = _canUpdateStatus();
    final canComplete = _canCompleteWorkOrder();
    
    if (!canUpdate && !canComplete) {
      return const SizedBox.shrink();
    }

    final availableTransitions = _getAvailableStatusTransitions(_workOrder!.status);
    
    // Show completion button if work order can be completed
    if (canComplete) {
      return Container(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            if (availableTransitions.isNotEmpty) ...[
              Expanded(
                child: SizedBox(
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: _isUpdatingStatus ? null : _updateStatus,
                    icon: _isUpdatingStatus
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.update),
                    label: Text(_isUpdatingStatus ? '更新中...' : '更新状态'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
            ],
            Expanded(
              flex: availableTransitions.isNotEmpty ? 2 : 1,
              child: SizedBox(
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: _navigateToCompletion,
                  icon: const Icon(Icons.check_circle),
                  label: const Text('完成工单'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    // Show only status update button if no completion available
    if (canUpdate && availableTransitions.isNotEmpty) {
      return Container(
        padding: const EdgeInsets.all(16.0),
        child: SizedBox(
          height: 50,
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _isUpdatingStatus ? null : _updateStatus,
            icon: _isUpdatingStatus
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.update),
            label: Text(_isUpdatingStatus ? '更新中...' : '更新状态'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
            ),
          ),
        ),
      );
    }

    return const SizedBox.shrink();
  }

  String _getStatusDisplayName(WorkOrderStatus status) {
    switch (status) {
      case WorkOrderStatus.pending:
        return '待处理';
      case WorkOrderStatus.inProgress:
        return '进行中';
      case WorkOrderStatus.waitingParts:
        return '等待备件';
      case WorkOrderStatus.waitingExternal:
        return '等待外部';
      case WorkOrderStatus.completed:
        return '已完成';
      case WorkOrderStatus.cancelled:
        return '已取消';
    }
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

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.year}/${dateTime.month}/${dateTime.day} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}

class _StatusUpdateDialog extends StatefulWidget {
  final WorkOrderStatus currentStatus;

  const _StatusUpdateDialog({
    required this.currentStatus,
  });

  @override
  State<_StatusUpdateDialog> createState() => _StatusUpdateDialogState();
}

class _StatusUpdateDialogState extends State<_StatusUpdateDialog> {
  WorkOrderStatus? _selectedStatus;
  final _notesController = TextEditingController();

  List<WorkOrderStatus> get _availableStatuses {
    switch (widget.currentStatus) {
      case WorkOrderStatus.pending:
        return [WorkOrderStatus.inProgress, WorkOrderStatus.cancelled];
      case WorkOrderStatus.inProgress:
        return [
          WorkOrderStatus.waitingParts,
          WorkOrderStatus.waitingExternal,
          WorkOrderStatus.completed,
          WorkOrderStatus.cancelled,
        ];
      case WorkOrderStatus.waitingParts:
      case WorkOrderStatus.waitingExternal:
        return [WorkOrderStatus.inProgress, WorkOrderStatus.cancelled];
      case WorkOrderStatus.completed:
      case WorkOrderStatus.cancelled:
        return [];
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('更新状态'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('当前状态: ${_getStatusDisplayName(widget.currentStatus)}'),
            const SizedBox(height: 16),
            const Text('更新为:', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ..._availableStatuses.map((status) => RadioListTile<WorkOrderStatus>(
              title: Text(_getStatusDisplayName(status)),
              value: status,
              groupValue: _selectedStatus,
              onChanged: (value) {
                setState(() {
                  _selectedStatus = value;
                });
              },
              contentPadding: EdgeInsets.zero,
            )),
            const SizedBox(height: 16),
            TextField(
              controller: _notesController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: '备注说明（可选）',
                hintText: '请输入状态变更的备注说明...',
                border: OutlineInputBorder(),
              ),
              maxLength: 500,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('取消'),
        ),
        ElevatedButton(
          onPressed: _selectedStatus == null ? null : () {
            final request = UpdateWorkOrderStatusRequest(
              status: _selectedStatus!,
              notes: _notesController.text.trim().isNotEmpty ? _notesController.text.trim() : null,
            );
            Navigator.of(context).pop(request);
          },
          child: const Text('确认'),
        ),
      ],
    );
  }

  String _getStatusDisplayName(WorkOrderStatus status) {
    switch (status) {
      case WorkOrderStatus.pending:
        return '待处理';
      case WorkOrderStatus.inProgress:
        return '进行中';
      case WorkOrderStatus.waitingParts:
        return '等待备件';
      case WorkOrderStatus.waitingExternal:
        return '等待外部';
      case WorkOrderStatus.completed:
        return '已完成';
      case WorkOrderStatus.cancelled:
        return '已取消';
    }
  }
}
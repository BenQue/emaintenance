import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../shared/models/work_order.dart';
import '../../shared/models/user.dart';
import '../../shared/services/work_order_service.dart';
import '../../shared/providers/auth_provider.dart';
import '../work_orders/work_order_detail_screen.dart';

// 任务列表页面 - 支持多种查看模式 (调试模式)

class TaskListScreen extends StatefulWidget {
  const TaskListScreen({super.key});

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

enum TaskViewMode {
  myIncomplete, // 我的未完成任务（默认）
  myAll,        // 我的所有任务
  myCreated,    // 我创建的工单（员工）
  allIncomplete, // 所有未完成任务
  allTasks      // 所有任务
}

class _TaskListScreenState extends State<TaskListScreen> {
  final ScrollController _scrollController = ScrollController();
  List<WorkOrderWithRelations> _workOrders = [];
  bool _isLoading = false;
  bool _isLoadingMore = false;
  String? _error;
  int _currentPage = 1;
  int _totalPages = 1;

  // View mode and filter states
  TaskViewMode? _viewMode; // Will be set based on user role
  WorkOrderStatus? _statusFilter;
  Priority? _priorityFilter;
  String _searchQuery = '';
  bool _hideCompleted = true; // Default to hide completed tasks

  @override
  void initState() {
    super.initState();
    _initializeViewMode();
    _scrollController.addListener(_onScroll);
  }

  void _initializeViewMode() {
    final authProvider = context.read<AuthProvider>();
    final user = authProvider.user;

    // Set default view mode based on user role
    if (user?.role == UserRole.employee) {
      _viewMode = TaskViewMode.myCreated; // 员工默认查看自己创建的工单
    } else {
      _viewMode = TaskViewMode.myIncomplete; // 技术员/主管/管理员默认查看未完成任务
    }

    _loadWorkOrders();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= 
        _scrollController.position.maxScrollExtent * 0.9) {
      _loadMoreWorkOrders();
    }
  }

  Future<void> _loadWorkOrders({bool refresh = false}) async {
    if (_isLoading && !refresh) return;

    setState(() {
      _isLoading = true;
      _error = null;
      if (refresh) {
        _currentPage = 1;
        _workOrders.clear();
      }
    });

    try {
      final authProvider = context.read<AuthProvider>();
      if (authProvider.user == null) {
        throw Exception('用户未登录');
      }

      final workOrderService = await WorkOrderService.getInstance();
      PaginatedWorkOrders result;

      // 根据查看模式选择不同的API调用
      print('🔍 Loading work orders with mode: $_viewMode, page: $_currentPage');
      switch (_viewMode!) {
        case TaskViewMode.myIncomplete:
          print('📞 Calling getAssignedWorkOrders (myIncomplete)');
          result = await workOrderService.getAssignedWorkOrders(
            page: _currentPage,
            limit: 20,
          );
          break;
        case TaskViewMode.myAll:
          print('📞 Calling getAssignedWorkOrders (myAll)');
          result = await workOrderService.getAssignedWorkOrders(
            page: _currentPage,
            limit: 20,
          );
          break;
        case TaskViewMode.myCreated:
          print('📞 Calling getUserWorkOrders with type=created');
          final createdWorkOrders = await workOrderService.getUserWorkOrders(
            type: 'created',
            page: _currentPage,
            limit: 20,
          );
          // Convert List<WorkOrder> to PaginatedWorkOrders format
          result = PaginatedWorkOrders(
            workOrders: createdWorkOrders.map((wo) => WorkOrderWithRelations.fromJson(wo.toJson())).toList(),
            total: createdWorkOrders.length,
            currentPage: _currentPage,
            totalPages: 1,
          );
          break;
        case TaskViewMode.allIncomplete:
          print('📞 Calling getAllWorkOrders with NOT_COMPLETED status');
          result = await workOrderService.getAllWorkOrders(
            page: _currentPage,
            limit: 20,
            status: 'NOT_COMPLETED', // 使用后端支持的特殊过滤状态
          );
          break;
        case TaskViewMode.allTasks:
          print('📞 Calling getAllWorkOrders without status filter');
          result = await workOrderService.getAllWorkOrders(
            page: _currentPage,
            limit: 20,
          );
          break;
      }

      setState(() {
        if (refresh) {
          _workOrders = result.workOrders;
        } else {
          _workOrders.addAll(result.workOrders);
        }
        _totalPages = result.totalPages;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadMoreWorkOrders() async {
    if (_isLoadingMore || _currentPage >= _totalPages) return;

    setState(() {
      _isLoadingMore = true;
    });

    try {
      _currentPage++;
      final workOrderService = await WorkOrderService.getInstance();
      PaginatedWorkOrders result;

      // 根据查看模式选择不同的API调用
      switch (_viewMode!) {
        case TaskViewMode.myIncomplete:
        case TaskViewMode.myAll:
          result = await workOrderService.getAssignedWorkOrders(
            page: _currentPage,
            limit: 20,
          );
          break;
        case TaskViewMode.myCreated:
          final createdWorkOrders = await workOrderService.getUserWorkOrders(
            type: 'created',
            page: _currentPage,
            limit: 20,
          );
          result = PaginatedWorkOrders(
            workOrders: createdWorkOrders.map((wo) => WorkOrderWithRelations.fromJson(wo.toJson())).toList(),
            total: createdWorkOrders.length,
            currentPage: _currentPage,
            totalPages: 1,
          );
          break;
        case TaskViewMode.allIncomplete:
          print('📞 Calling getAllWorkOrders with NOT_COMPLETED status (loadMore)');
          result = await workOrderService.getAllWorkOrders(
            page: _currentPage,
            limit: 20,
            status: 'NOT_COMPLETED', // 使用后端支持的特殊过滤状态
          );
          break;
        case TaskViewMode.allTasks:
          print('📞 Calling getAllWorkOrders without status filter (loadMore)');
          result = await workOrderService.getAllWorkOrders(
            page: _currentPage,
            limit: 20,
          );
          break;
      }

      setState(() {
        _workOrders.addAll(result.workOrders);
        _isLoadingMore = false;
      });
    } catch (e) {
      setState(() {
        _currentPage--;
        _isLoadingMore = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('加载更多失败: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  List<WorkOrderWithRelations> get _filteredWorkOrders {
    return _workOrders.where((workOrder) {
      // 根据查看模式进行基础过滤
      switch (_viewMode!) {
        case TaskViewMode.myIncomplete:
          // 只显示未完成的状态
          if (workOrder.status == WorkOrderStatus.completed ||
              workOrder.status == WorkOrderStatus.closed ||
              workOrder.status == WorkOrderStatus.cancelled) {
            return false;
          }
          break;
        case TaskViewMode.myAll:
          // 显示所有状态，但默认隐藏已关闭
          if (workOrder.status == WorkOrderStatus.closed) {
            return false;
          }
          break;
        case TaskViewMode.myCreated:
          // 员工查看自己创建的工单，默认隐藏已关闭
          if (workOrder.status == WorkOrderStatus.closed) {
            return false;
          }
          break;
        case TaskViewMode.allIncomplete:
          // 只显示未完成的状态（已在API层面过滤）
          break;
        case TaskViewMode.allTasks:
          // 显示所有状态，但默认隐藏已关闭
          if (workOrder.status == WorkOrderStatus.closed) {
            return false;
          }
          break;
      }

      // Hide completed tasks filter (可选的额外过滤)
      if (_hideCompleted && workOrder.status == WorkOrderStatus.completed) {
        return false;
      }

      // Status filter
      if (_statusFilter != null && workOrder.status != _statusFilter) {
        return false;
      }

      // Priority filter
      if (_priorityFilter != null && workOrder.priority != _priorityFilter) {
        return false;
      }

      // Search filter
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        return workOrder.title.toLowerCase().contains(query) ||
               workOrder.description.toLowerCase().contains(query) ||
               (workOrder.asset?['name'] as String? ?? '').toLowerCase().contains(query);
      }

      return true;
    }).toList();
  }

  void _showFilterDialog() {
    showDialog(
      context: context,
      builder: (context) => _FilterDialog(
        statusFilter: _statusFilter,
        priorityFilter: _priorityFilter,
        hideCompleted: _hideCompleted,
        onFiltersChanged: (status, priority, hideCompleted) {
          setState(() {
            _statusFilter = status;
            _priorityFilter = priority;
            _hideCompleted = hideCompleted;
          });
        },
      ),
    );
  }

  String get _getViewModeTitle {
    switch (_viewMode!) {
      case TaskViewMode.myIncomplete:
        return '我的任务';
      case TaskViewMode.myAll:
        return '我的所有任务';
      case TaskViewMode.myCreated:
        return '我的工单';
      case TaskViewMode.allIncomplete:
        return '所有未完成';
      case TaskViewMode.allTasks:
        return '所有工单';
    }
  }

  List<TaskViewMode> _getAvailableViewModes() {
    final authProvider = context.read<AuthProvider>();
    final user = authProvider.user;

    if (user?.role == UserRole.employee) {
      // 员工只能查看自己创建的工单
      return [TaskViewMode.myCreated];
    } else if (user?.role == UserRole.technician) {
      // 技术员可以查看分配给自己的任务和所有任务
      return [
        TaskViewMode.myIncomplete,
        TaskViewMode.myAll,
        TaskViewMode.allIncomplete,
        TaskViewMode.allTasks,
      ];
    } else {
      // 主管和管理员可以查看所有模式
      return TaskViewMode.values;
    }
  }

  void _showViewModeDialog() {
    final availableModes = _getAvailableViewModes();

    // 如果只有一个选项,不显示对话框
    if (availableModes.length <= 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('您当前只有一个查看模式可用'),
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('选择查看模式'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: availableModes.map((mode) {
            String title;
            String subtitle;
            switch (mode) {
              case TaskViewMode.myIncomplete:
                title = '我的未完成任务';
                subtitle = '只显示分配给我的未完成工单';
                break;
              case TaskViewMode.myAll:
                title = '我的所有任务';
                subtitle = '显示分配给我的所有工单（包含已完成）';
                break;
              case TaskViewMode.myCreated:
                title = '我创建的工单';
                subtitle = '显示我创建的所有报修工单';
                break;
              case TaskViewMode.allIncomplete:
                title = '所有未完成任务';
                subtitle = '显示系统中所有未完成的工单';
                break;
              case TaskViewMode.allTasks:
                title = '所有工单';
                subtitle = '显示系统中的所有工单';
                break;
            }

            return RadioListTile<TaskViewMode>(
              title: Text(title),
              subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
              value: mode,
              groupValue: _viewMode,
              onChanged: (TaskViewMode? value) {
                if (value != null) {
                  setState(() {
                    _viewMode = value;
                  });
                  Navigator.of(context).pop();
                  _loadWorkOrders(refresh: true);
                }
              },
            );
          }).toList(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_getViewModeTitle),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          // View mode selector
          IconButton(
            icon: const Icon(Icons.view_list),
            tooltip: '选择查看模式',
            onPressed: _showViewModeDialog,
          ),
          // Quick toggle for hide completed
          IconButton(
            icon: Icon(_hideCompleted ? Icons.visibility_off : Icons.visibility),
            tooltip: _hideCompleted ? '显示已完成任务' : '隐藏已完成任务',
            onPressed: () {
              setState(() {
                _hideCompleted = !_hideCompleted;
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => _loadWorkOrders(refresh: true),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              decoration: const InputDecoration(
                hintText: '搜索工单标题、描述或设备...',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
              onChanged: (value) {
                setState(() {
                  _searchQuery = value;
                });
              },
            ),
          ),
          
          // Content
          Expanded(
            child: _buildContent(),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    if (_isLoading && _workOrders.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_error != null && _workOrders.isEmpty) {
      return _buildErrorWidget();
    }

    final filteredWorkOrders = _filteredWorkOrders;

    if (filteredWorkOrders.isEmpty && _workOrders.isNotEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.filter_list_off, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              '没有符合筛选条件的工单',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    if (filteredWorkOrders.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment_turned_in, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              '暂无分配给您的工单',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadWorkOrders(refresh: true),
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.symmetric(horizontal: 16.0),
        itemCount: filteredWorkOrders.length + (_isLoadingMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index < filteredWorkOrders.length) {
            return _buildWorkOrderCard(filteredWorkOrders[index]);
          } else {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: CircularProgressIndicator(),
              ),
            );
          }
        },
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
              onPressed: () => _loadWorkOrders(refresh: true),
              child: const Text('重试'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWorkOrderCard(WorkOrderWithRelations workOrder) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8.0),
      child: InkWell(
        onTap: () => _navigateToDetail(workOrder),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          workOrder.title,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          workOrder.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    children: [
                      _buildStatusChip(workOrder.status),
                      const SizedBox(height: 4),
                      _buildPriorityChip(workOrder.priority),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.precision_manufacturing, size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      '${workOrder.asset?['assetCode'] ?? ''} - ${workOrder.asset?['name'] ?? ''}',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              if (workOrder.location != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.location_on, size: 16, color: Colors.grey),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        workOrder.location!,
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.schedule, size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(
                    '报修时间: ${_formatDateTime(workOrder.reportedAt)}',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ],
          ),
        ),
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
      case WorkOrderStatus.closed:
        backgroundColor = Colors.grey;
        break;
      case WorkOrderStatus.cancelled:
        backgroundColor = Colors.red;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        _getStatusDisplayName(status),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
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
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        _getPriorityDisplayName(priority),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
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
      case WorkOrderStatus.closed:
        return '已关闭';
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
    return '${dateTime.month}/${dateTime.day} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }

  void _navigateToDetail(WorkOrderWithRelations workOrder) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => WorkOrderDetailScreen(workOrderId: workOrder.id),
      ),
    );
  }
}

class _FilterDialog extends StatefulWidget {
  final WorkOrderStatus? statusFilter;
  final Priority? priorityFilter;
  final bool hideCompleted;
  final Function(WorkOrderStatus?, Priority?, bool) onFiltersChanged;

  const _FilterDialog({
    required this.statusFilter,
    required this.priorityFilter,
    required this.hideCompleted,
    required this.onFiltersChanged,
  });

  @override
  State<_FilterDialog> createState() => _FilterDialogState();
}

class _FilterDialogState extends State<_FilterDialog> {
  WorkOrderStatus? _selectedStatus;
  Priority? _selectedPriority;
  bool _selectedHideCompleted = true;

  @override
  void initState() {
    super.initState();
    _selectedStatus = widget.statusFilter;
    _selectedPriority = widget.priorityFilter;
    _selectedHideCompleted = widget.hideCompleted;
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('筛选条件'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Hide completed toggle
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('隐藏已完成任务', style: TextStyle(fontWeight: FontWeight.bold)),
              Switch(
                value: _selectedHideCompleted,
                onChanged: (value) {
                  setState(() {
                    _selectedHideCompleted = value;
                  });
                },
                activeColor: Colors.blue,
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Text('状态', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              FilterChip(
                label: const Text('全部'),
                selected: _selectedStatus == null,
                onSelected: (selected) {
                  setState(() {
                    _selectedStatus = selected ? null : _selectedStatus;
                  });
                },
              ),
              ...WorkOrderStatus.values.map((status) => FilterChip(
                label: Text(_getStatusDisplayName(status)),
                selected: _selectedStatus == status,
                onSelected: (selected) {
                  setState(() {
                    _selectedStatus = selected ? status : null;
                  });
                },
              )),
            ],
          ),
          const SizedBox(height: 16),
          const Text('优先级', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              FilterChip(
                label: const Text('全部'),
                selected: _selectedPriority == null,
                onSelected: (selected) {
                  setState(() {
                    _selectedPriority = selected ? null : _selectedPriority;
                  });
                },
              ),
              ...Priority.values.map((priority) => FilterChip(
                label: Text(_getPriorityDisplayName(priority)),
                selected: _selectedPriority == priority,
                onSelected: (selected) {
                  setState(() {
                    _selectedPriority = selected ? priority : null;
                  });
                },
              )),
            ],
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () {
            setState(() {
              _selectedStatus = null;
              _selectedPriority = null;
              _selectedHideCompleted = true; // Reset to default (hide completed)
            });
          },
          child: const Text('清除'),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('取消'),
        ),
        ElevatedButton(
          onPressed: () {
            widget.onFiltersChanged(_selectedStatus, _selectedPriority, _selectedHideCompleted);
            Navigator.of(context).pop();
          },
          child: const Text('应用'),
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
      case WorkOrderStatus.closed:
        return '已关闭';
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
}
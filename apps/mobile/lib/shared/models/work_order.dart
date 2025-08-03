enum Priority {
  low('LOW'),
  medium('MEDIUM'),
  high('HIGH'),
  urgent('URGENT');

  const Priority(this.value);
  final String value;

  static Priority fromString(String value) {
    return Priority.values.firstWhere(
      (priority) => priority.value == value,
      orElse: () => Priority.medium,
    );
  }
}

enum WorkOrderStatus {
  pending('PENDING'),
  inProgress('IN_PROGRESS'),
  waitingParts('WAITING_PARTS'),
  completed('COMPLETED'),
  cancelled('CANCELLED');

  const WorkOrderStatus(this.value);
  final String value;

  static WorkOrderStatus fromString(String value) {
    return WorkOrderStatus.values.firstWhere(
      (status) => status.value == value,
      orElse: () => WorkOrderStatus.pending,
    );
  }
}

class WorkOrder {
  final String id;
  final String title;
  final String description;
  final String category;
  final String reason;
  final String? location;
  final Priority priority;
  final WorkOrderStatus status;
  final DateTime reportedAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final String? solution;
  final String? faultCode;
  final List<String> attachments;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String assetId;
  final String createdById;
  final String? assignedToId;

  const WorkOrder({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.reason,
    this.location,
    required this.priority,
    required this.status,
    required this.reportedAt,
    this.startedAt,
    this.completedAt,
    this.solution,
    this.faultCode,
    required this.attachments,
    required this.createdAt,
    required this.updatedAt,
    required this.assetId,
    required this.createdById,
    this.assignedToId,
  });

  factory WorkOrder.fromJson(Map<String, dynamic> json) {
    return WorkOrder(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      category: json['category'] as String,
      reason: json['reason'] as String,
      location: json['location'] as String?,
      priority: Priority.fromString(json['priority'] as String),
      status: WorkOrderStatus.fromString(json['status'] as String),
      reportedAt: DateTime.parse(json['reportedAt'] as String),
      startedAt: json['startedAt'] != null 
          ? DateTime.parse(json['startedAt'] as String)
          : null,
      completedAt: json['completedAt'] != null 
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      solution: json['solution'] as String?,
      faultCode: json['faultCode'] as String?,
      attachments: List<String>.from(json['attachments'] as List),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      assetId: json['assetId'] as String,
      createdById: json['createdById'] as String,
      assignedToId: json['assignedToId'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'category': category,
      'reason': reason,
      'location': location,
      'priority': priority.value,
      'status': status.value,
      'reportedAt': reportedAt.toIso8601String(),
      'startedAt': startedAt?.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
      'solution': solution,
      'faultCode': faultCode,
      'attachments': attachments,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'assetId': assetId,
      'createdById': createdById,
      'assignedToId': assignedToId,
    };
  }

  String get statusDisplayName {
    switch (status) {
      case WorkOrderStatus.pending:
        return '待处理';
      case WorkOrderStatus.inProgress:
        return '进行中';
      case WorkOrderStatus.waitingParts:
        return '等待备件';
      case WorkOrderStatus.completed:
        return '已完成';
      case WorkOrderStatus.cancelled:
        return '已取消';
    }
  }

  String get priorityDisplayName {
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

class WorkOrderRequest {
  final String title;
  final String description;
  final String category;
  final String reason;
  final String? location;
  final Priority priority;
  final String assetId;
  final List<String> attachments;

  const WorkOrderRequest({
    required this.title,
    required this.description,
    required this.category,
    required this.reason,
    this.location,
    required this.priority,
    required this.assetId,
    required this.attachments,
  });

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'description': description,
      'category': category,
      'reason': reason,
      'location': location,
      'priority': priority.value,
      'assetId': assetId,
      'attachments': attachments,
    };
  }
}
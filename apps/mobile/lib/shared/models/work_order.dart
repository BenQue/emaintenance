import 'package:flutter/material.dart';

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

enum FaultSymptom {
  equipmentShutdown('EQUIPMENT_SHUTDOWN', '设备停机', Icons.power_off),
  powerOutage('POWER_OUTAGE', '断电', Icons.power),
  abnormalNoise('ABNORMAL_NOISE', '异常噪音', Icons.volume_up),
  leakage('LEAKAGE', '漏油/漏液', Icons.water_drop),
  overheating('OVERHEATING', '过热', Icons.whatshot),
  abnormalVibration('ABNORMAL_VIBRATION', '振动异常', Icons.vibration),
  speedAbnormality('SPEED_ABNORMALITY', '速度异常', Icons.speed),
  displayError('DISPLAY_ERROR', '显示异常', Icons.error_outline),
  cannotStart('CANNOT_START', '无法启动', Icons.play_disabled),
  functionFailure('FUNCTION_FAILURE', '功能失效', Icons.broken_image),
  other('OTHER', '其他', Icons.more_horiz);

  const FaultSymptom(this.value, this.label, this.icon);
  final String value;
  final String label;
  final IconData icon;

  static FaultSymptom fromString(String value) {
    return FaultSymptom.values.firstWhere(
      (symptom) => symptom.value == value,
      orElse: () => FaultSymptom.other,
    );
  }
}

enum FaultCode {
  mechanicalFailure('MECHANICAL_FAILURE'),
  electricalFailure('ELECTRICAL_FAILURE'),
  softwareIssue('SOFTWARE_ISSUE'),
  wearAndTear('WEAR_AND_TEAR'),
  userError('USER_ERROR'),
  preventiveMaintenance('PREVENTIVE_MAINTENANCE'),
  externalFactor('EXTERNAL_FACTOR'),
  other('OTHER');

  const FaultCode(this.value);
  final String value;

  static FaultCode fromString(String value) {
    return FaultCode.values.firstWhere(
      (code) => code.value == value,
      orElse: () => FaultCode.other,
    );
  }

  String get displayName {
    switch (this) {
      case FaultCode.mechanicalFailure:
        return '机械故障';
      case FaultCode.electricalFailure:
        return '电气故障';
      case FaultCode.softwareIssue:
        return '软件问题';
      case FaultCode.wearAndTear:
        return '磨损老化';
      case FaultCode.userError:
        return '操作错误';
      case FaultCode.preventiveMaintenance:
        return '预防性维护';
      case FaultCode.externalFactor:
        return '外部因素';
      case FaultCode.other:
        return '其他';
    }
  }
}

enum WorkOrderStatus {
  pending('PENDING'),
  inProgress('IN_PROGRESS'),
  waitingParts('WAITING_PARTS'),
  waitingExternal('WAITING_EXTERNAL'),
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
  final List<FaultSymptom> faultSymptoms;
  final String? location;
  final String? additionalLocation;
  final bool productionInterrupted;
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
    required this.faultSymptoms,
    this.location,
    this.additionalLocation,
    required this.productionInterrupted,
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
      faultSymptoms: (json['faultSymptoms'] as List<dynamic>?)
          ?.map((symptom) => FaultSymptom.fromString(symptom as String))
          .toList() ?? [],
      location: json['location'] as String?,
      additionalLocation: json['additionalLocation'] as String?,
      productionInterrupted: json['productionInterrupted'] as bool? ?? false,
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
      'faultSymptoms': faultSymptoms.map((symptom) => symptom.value).toList(),
      'location': location,
      'additionalLocation': additionalLocation,
      'productionInterrupted': productionInterrupted,
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
}

// 工单创建请求类
class WorkOrderRequest {
  final String title;
  final String description;
  final Priority priority;
  final String? assetId;
  final List<FaultSymptom> faultSymptoms;
  final String? location;
  final String? additionalLocation;
  final bool productionInterrupted;
  final List<String>? attachments;
  final String requestedBy;
  final String category;
  final String reason;

  const WorkOrderRequest({
    required this.title,
    required this.description,
    required this.priority,
    this.assetId,
    required this.faultSymptoms,
    this.location,
    this.additionalLocation,
    required this.productionInterrupted,
    this.attachments,
    required this.requestedBy,
    this.category = '设备维修', // 默认分类，后续备用
    this.reason = '设备故障', // 默认原因，后续备用
  });

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'description': description,
      'priority': priority.value,
      'assetId': assetId,
      'faultSymptoms': faultSymptoms.map((symptom) => symptom.value).toList(),
      'location': location,
      'additionalLocation': additionalLocation,
      'productionInterrupted': productionInterrupted,
      'attachments': attachments ?? [], // 确保attachments是数组，不是null
      'category': category,
      'reason': reason,
    };
  }
}

// 创建解决方案记录请求
class CreateResolutionRequest {
  final String solutionDescription;
  final FaultCode? faultCode;
  final List<String>? photos;

  const CreateResolutionRequest({
    required this.solutionDescription,
    this.faultCode,
    this.photos,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'solutionDescription': solutionDescription,
    };
    
    // Only include faultCode if it's not null
    if (faultCode != null) {
      json['faultCode'] = faultCode!.value;
    }
    
    // Only include photos if it's not null and not empty
    if (photos != null && photos!.isNotEmpty) {
      json['photos'] = photos;
    }
    
    return json;
  }
}

// 离线解决方案记录（用于离线存储）
class OfflineResolutionRecord {
  final String id;
  final String workOrderId;
  final String solutionDescription;
  final FaultCode? faultCode;
  final List<String> photoLocalPaths;
  final DateTime createdAt;
  final bool isSynced;

  const OfflineResolutionRecord({
    required this.id,
    required this.workOrderId,
    required this.solutionDescription,
    this.faultCode,
    required this.photoLocalPaths,
    required this.createdAt,
    this.isSynced = false,
  });

  factory OfflineResolutionRecord.fromJson(Map<String, dynamic> json) {
    return OfflineResolutionRecord(
      id: json['id'] as String,
      workOrderId: json['workOrderId'] as String,
      solutionDescription: json['solutionDescription'] as String,
      faultCode: json['faultCode'] != null 
          ? FaultCode.fromString(json['faultCode'] as String)
          : null,
      photoLocalPaths: List<String>.from(json['photoLocalPaths'] as List),
      createdAt: DateTime.parse(json['createdAt'] as String),
      isSynced: json['isSynced'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workOrderId': workOrderId,
      'solutionDescription': solutionDescription,
      'faultCode': faultCode?.value,
      'photoLocalPaths': photoLocalPaths,
      'createdAt': createdAt.toIso8601String(),
      'isSynced': isSynced,
    };
  }

  OfflineResolutionRecord copyWith({
    bool? isSynced,
  }) {
    return OfflineResolutionRecord(
      id: id,
      workOrderId: workOrderId,
      solutionDescription: solutionDescription,
      faultCode: faultCode,
      photoLocalPaths: photoLocalPaths,
      createdAt: createdAt,
      isSynced: isSynced ?? this.isSynced,
    );
  }
}

// 工单与关系数据的扩展模型
class WorkOrderWithRelations extends WorkOrder {
  final Map<String, dynamic>? asset;
  final Map<String, dynamic>? createdBy;
  final Map<String, dynamic>? assignedTo;
  final List<WorkOrderStatusHistory>? statusHistory;

  const WorkOrderWithRelations({
    required super.id,
    required super.title,
    required super.description,
    required super.faultSymptoms,
    required super.location,
    super.additionalLocation,
    required super.productionInterrupted,
    required super.priority,
    required super.status,
    required super.reportedAt,
    super.startedAt,
    super.completedAt,
    super.solution,
    super.faultCode,
    required super.attachments,
    required super.createdAt,
    required super.updatedAt,
    super.assetId,
    super.createdById,
    super.assignedToId,
    this.asset,
    this.createdBy,
    this.assignedTo,
    this.statusHistory,
  });

  factory WorkOrderWithRelations.fromJson(Map<String, dynamic> json) {
    return WorkOrderWithRelations(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      faultSymptoms: (json['faultSymptoms'] as List<dynamic>?)
          ?.map((symptom) => FaultSymptom.fromString(symptom as String))
          .toList() ?? [],
      location: json['location'] as String? ?? '',
      additionalLocation: json['additionalLocation'] as String?,
      productionInterrupted: json['productionInterrupted'] as bool? ?? false,
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
      faultCode: json['faultCode'] != null
          ? FaultCode.fromString(json['faultCode'] as String)
          : null,
      attachments: List<String>.from(json['attachments'] as List? ?? []),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      assetId: json['assetId'] as String?,
      createdById: json['createdById'] as String?,
      assignedToId: json['assignedToId'] as String?,
      asset: json['asset'] as Map<String, dynamic>?,
      createdBy: json['createdBy'] as Map<String, dynamic>?,
      assignedTo: json['assignedTo'] as Map<String, dynamic>?,
      statusHistory: (json['statusHistory'] as List<dynamic>?)
          ?.map((item) => WorkOrderStatusHistory.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

// 分页工单数据模型
class PaginatedWorkOrders {
  final List<WorkOrderWithRelations> workOrders;
  final int total;
  final int currentPage;
  final int totalPages;

  const PaginatedWorkOrders({
    required this.workOrders,
    required this.total,
    required this.currentPage,
    required this.totalPages,
  });

  factory PaginatedWorkOrders.fromJson(Map<String, dynamic> json) {
    return PaginatedWorkOrders(
      workOrders: (json['workOrders'] as List<dynamic>)
          .map((item) => WorkOrderWithRelations.fromJson(item as Map<String, dynamic>))
          .toList(),
      total: json['total'] as int,
      currentPage: json['currentPage'] as int,
      totalPages: json['totalPages'] as int,
    );
  }
}

// 工单状态历史记录
class WorkOrderStatusHistory {
  final String id;
  final String workOrderId;
  final WorkOrderStatus fromStatus;
  final WorkOrderStatus toStatus;
  final String? comment;
  final String changedById;
  final Map<String, dynamic>? changedBy;
  final DateTime createdAt;

  const WorkOrderStatusHistory({
    required this.id,
    required this.workOrderId,
    required this.fromStatus,
    required this.toStatus,
    this.comment,
    required this.changedById,
    this.changedBy,
    required this.createdAt,
  });

  factory WorkOrderStatusHistory.fromJson(Map<String, dynamic> json) {
    return WorkOrderStatusHistory(
      id: json['id'] as String,
      workOrderId: json['workOrderId'] as String,
      fromStatus: WorkOrderStatus.fromString(json['fromStatus'] as String),
      toStatus: WorkOrderStatus.fromString(json['toStatus'] as String),
      comment: json['comment'] as String?,
      changedById: json['changedById'] as String,
      changedBy: json['changedBy'] as Map<String, dynamic>?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

// 更新工单状态请求
class UpdateWorkOrderStatusRequest {
  final WorkOrderStatus status;
  final String? comment;

  const UpdateWorkOrderStatusRequest({
    required this.status,
    this.comment,
  });

  Map<String, dynamic> toJson() {
    return {
      'status': status.value,
      if (comment != null) 'comment': comment,
    };
  }
}

// 工单与解决方案记录
class WorkOrderWithResolution extends WorkOrderWithRelations {
  final Map<String, dynamic>? resolution;

  const WorkOrderWithResolution({
    required super.id,
    required super.title,
    required super.description,
    required super.faultSymptoms,
    required super.location,
    super.additionalLocation,
    required super.productionInterrupted,
    required super.priority,
    required super.status,
    required super.reportedAt,
    super.startedAt,
    super.completedAt,
    super.solution,
    super.faultCode,
    required super.attachments,
    required super.createdAt,
    required super.updatedAt,
    super.assetId,
    super.createdById,
    super.assignedToId,
    super.asset,
    super.createdBy,
    super.assignedTo,
    super.statusHistory,
    this.resolution,
  });

  factory WorkOrderWithResolution.fromJson(Map<String, dynamic> json) {
    final base = WorkOrderWithRelations.fromJson(json);
    return WorkOrderWithResolution(
      id: base.id,
      title: base.title,
      description: base.description,
      faultSymptoms: base.faultSymptoms,
      location: base.location,
      additionalLocation: base.additionalLocation,
      productionInterrupted: base.productionInterrupted,
      priority: base.priority,
      status: base.status,
      reportedAt: base.reportedAt,
      startedAt: base.startedAt,
      completedAt: base.completedAt,
      solution: base.solution,
      faultCode: base.faultCode,
      attachments: base.attachments,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      assetId: base.assetId,
      createdById: base.createdById,
      assignedToId: base.assignedToId,
      asset: base.asset,
      createdBy: base.createdBy,
      assignedTo: base.assignedTo,
      statusHistory: base.statusHistory,
      resolution: json['resolution'] as Map<String, dynamic>?,
    );
  }
}

// 解决方案记录
class ResolutionRecord {
  final String id;
  final String workOrderId;
  final String solutionDescription;
  final FaultCode? faultCode;
  final List<String> photos;
  final DateTime createdAt;
  final String technician;

  const ResolutionRecord({
    required this.id,
    required this.workOrderId,
    required this.solutionDescription,
    this.faultCode,
    required this.photos,
    required this.createdAt,
    required this.technician,
  });

  factory ResolutionRecord.fromJson(Map<String, dynamic> json) {
    return ResolutionRecord(
      id: json['id'] as String,
      workOrderId: json['workOrderId'] as String,
      solutionDescription: json['solutionDescription'] as String,
      faultCode: json['faultCode'] != null
          ? FaultCode.fromString(json['faultCode'] as String)
          : null,
      photos: List<String>.from(json['photos'] as List? ?? []),
      createdAt: DateTime.parse(json['createdAt'] as String),
      technician: json['technician'] as String,
    );
  }
}
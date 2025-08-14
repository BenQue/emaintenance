import 'user.dart';
import 'asset.dart';

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
      case WorkOrderStatus.waitingExternal:
        return '等待外部';
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



// 工单状态历史
class WorkOrderStatusHistory {
  final String id;
  final String workOrderId;
  final WorkOrderStatus? fromStatus;
  final WorkOrderStatus toStatus;
  final String changedById;
  final User changedBy;
  final String? notes;
  final DateTime createdAt;

  const WorkOrderStatusHistory({
    required this.id,
    required this.workOrderId,
    this.fromStatus,
    required this.toStatus,
    required this.changedById,
    required this.changedBy,
    this.notes,
    required this.createdAt,
  });

  factory WorkOrderStatusHistory.fromJson(Map<String, dynamic> json) {
    return WorkOrderStatusHistory(
      id: json['id'] as String,
      workOrderId: json['workOrderId'] as String,
      fromStatus: json['fromStatus'] != null 
          ? WorkOrderStatus.fromString(json['fromStatus'] as String)
          : null,
      toStatus: WorkOrderStatus.fromString(json['toStatus'] as String),
      changedById: json['changedById'] as String,
      changedBy: User.fromJson(json['changedBy'] as Map<String, dynamic>),
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workOrderId': workOrderId,
      'fromStatus': fromStatus?.value,
      'toStatus': toStatus.value,
      'changedById': changedById,
      'changedBy': changedBy.toJson(),
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

// 包含完整信息的工单
class WorkOrderWithRelations {
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
  final Asset asset;
  final User createdBy;
  final User? assignedTo;
  final List<WorkOrderStatusHistory>? statusHistory;

  const WorkOrderWithRelations({
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
    required this.asset,
    required this.createdBy,
    this.assignedTo,
    this.statusHistory,
  });

  factory WorkOrderWithRelations.fromJson(Map<String, dynamic> json) {
    return WorkOrderWithRelations(
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
      asset: Asset.fromWorkOrderJson(json['asset'] as Map<String, dynamic>),
      createdBy: User.fromJson(json['createdBy'] as Map<String, dynamic>),
      assignedTo: json['assignedTo'] != null 
          ? User.fromJson(json['assignedTo'] as Map<String, dynamic>)
          : null,
      statusHistory: json['statusHistory'] != null
          ? (json['statusHistory'] as List)
              .map((item) => WorkOrderStatusHistory.fromJson(item as Map<String, dynamic>))
              .toList()
          : null,
    );
  }

  String get statusDisplayName {
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

// 状态更新请求
class UpdateWorkOrderStatusRequest {
  final WorkOrderStatus status;
  final String? notes;

  const UpdateWorkOrderStatusRequest({
    required this.status,
    this.notes,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'status': status.value,
    };
    
    // Only include notes if it's not null and not empty
    if (notes != null && notes!.isNotEmpty) {
      json['notes'] = notes;
    }
    
    return json;
  }
}

// 分页工单响应
class PaginatedWorkOrders {
  final List<WorkOrderWithRelations> workOrders;
  final int total;
  final int page;
  final int limit;
  final int totalPages;

  const PaginatedWorkOrders({
    required this.workOrders,
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
  });

  factory PaginatedWorkOrders.fromJson(Map<String, dynamic> json) {
    return PaginatedWorkOrders(
      workOrders: (json['workOrders'] as List)
          .map((item) => WorkOrderWithRelations.fromJson(item as Map<String, dynamic>))
          .toList(),
      total: json['total'] as int,
      page: json['page'] as int,
      limit: json['limit'] as int,
      totalPages: json['totalPages'] as int,
    );
  }
}

// 解决方案照片
class ResolutionPhoto {
  final String id;
  final String filename;
  final String originalName;
  final String filePath;
  final int fileSize;
  final String mimeType;
  final DateTime uploadedAt;

  const ResolutionPhoto({
    required this.id,
    required this.filename,
    required this.originalName,
    required this.filePath,
    required this.fileSize,
    required this.mimeType,
    required this.uploadedAt,
  });

  factory ResolutionPhoto.fromJson(Map<String, dynamic> json) {
    return ResolutionPhoto(
      id: json['id'] as String,
      filename: json['filename'] as String,
      originalName: json['originalName'] as String,
      filePath: json['filePath'] as String,
      fileSize: json['fileSize'] as int,
      mimeType: json['mimeType'] as String,
      uploadedAt: DateTime.parse(json['uploadedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'filename': filename,
      'originalName': originalName,
      'filePath': filePath,
      'fileSize': fileSize,
      'mimeType': mimeType,
      'uploadedAt': uploadedAt.toIso8601String(),
    };
  }
}

// 解决方案记录
class ResolutionRecord {
  final String id;
  final String workOrderId;
  final String solutionDescription;
  final FaultCode? faultCode;
  final String resolvedById;
  final User resolvedBy;
  final List<ResolutionPhoto> photos;
  final DateTime completedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ResolutionRecord({
    required this.id,
    required this.workOrderId,
    required this.solutionDescription,
    this.faultCode,
    required this.resolvedById,
    required this.resolvedBy,
    required this.photos,
    required this.completedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ResolutionRecord.fromJson(Map<String, dynamic> json) {
    return ResolutionRecord(
      id: json['id'] as String,
      workOrderId: json['workOrderId'] as String,
      solutionDescription: json['solutionDescription'] as String,
      faultCode: json['faultCode'] != null 
          ? FaultCode.fromString(json['faultCode'] as String)
          : null,
      resolvedById: json['resolvedById'] as String,
      resolvedBy: User.fromJson(json['resolvedBy'] as Map<String, dynamic>),
      photos: (json['photos'] as List)
          .map((item) => ResolutionPhoto.fromJson(item as Map<String, dynamic>))
          .toList(),
      completedAt: DateTime.parse(json['completedAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workOrderId': workOrderId,
      'solutionDescription': solutionDescription,
      'faultCode': faultCode?.value,
      'resolvedById': resolvedById,
      'resolvedBy': resolvedBy.toJson(),
      'photos': photos.map((photo) => photo.toJson()).toList(),
      'completedAt': completedAt.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

// 包含解决方案记录的工单
class WorkOrderWithResolution extends WorkOrderWithRelations {
  final ResolutionRecord? resolutionRecord;

  const WorkOrderWithResolution({
    required super.id,
    required super.title,
    required super.description,
    required super.category,
    required super.reason,
    super.location,
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
    required super.assetId,
    required super.createdById,
    super.assignedToId,
    required super.asset,
    required super.createdBy,
    super.assignedTo,
    super.statusHistory,
    this.resolutionRecord,
  });

  factory WorkOrderWithResolution.fromJson(Map<String, dynamic> json) {
    return WorkOrderWithResolution(
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
      asset: Asset.fromWorkOrderJson(json['asset'] as Map<String, dynamic>),
      createdBy: User.fromJson(json['createdBy'] as Map<String, dynamic>),
      assignedTo: json['assignedTo'] != null 
          ? User.fromJson(json['assignedTo'] as Map<String, dynamic>)
          : null,
      statusHistory: json['statusHistory'] != null
          ? (json['statusHistory'] as List)
              .map((item) => WorkOrderStatusHistory.fromJson(item as Map<String, dynamic>))
              .toList()
          : null,
      resolutionRecord: json['resolutionRecord'] != null
          ? ResolutionRecord.fromJson(json['resolutionRecord'] as Map<String, dynamic>)
          : null,
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
      'asset': asset.toJson(),
      'createdBy': createdBy.toJson(),
      'assignedTo': assignedTo?.toJson(),
      'statusHistory': statusHistory?.map((h) => h.toJson()).toList(),
      'resolutionRecord': resolutionRecord?.toJson(),
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
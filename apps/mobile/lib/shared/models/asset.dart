class Asset {
  final String id;
  final String assetCode;
  final String name;
  final String? description;
  final String? model;
  final String? manufacturer;
  final String? serialNumber;
  final String location;
  final DateTime? installDate;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? ownerId;
  final String? administratorId;

  const Asset({
    required this.id,
    required this.assetCode,
    required this.name,
    this.description,
    this.model,
    this.manufacturer,
    this.serialNumber,
    required this.location,
    this.installDate,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
    this.ownerId,
    this.administratorId,
  });

  factory Asset.fromJson(Map<String, dynamic> json) {
    return Asset(
      id: json['id'] as String,
      assetCode: json['assetCode'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      model: json['model'] as String?,
      manufacturer: json['manufacturer'] as String?,
      serialNumber: json['serialNumber'] as String?,
      location: json['location'] as String,
      installDate: json['installDate'] != null 
          ? DateTime.parse(json['installDate'] as String)
          : null,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt'] as String) 
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt'] as String) 
          : DateTime.now(),
      ownerId: json['ownerId'] as String?,
      administratorId: json['administratorId'] as String?,
    );
  }

  /// Factory constructor for partial asset data from work order responses
  factory Asset.fromWorkOrderJson(Map<String, dynamic> json) {
    return Asset(
      id: json['id'] as String,
      assetCode: json['assetCode'] as String,
      name: json['name'] as String,
      description: null,
      model: null,
      manufacturer: null,
      serialNumber: null,
      location: json['location'] as String,
      installDate: null,
      isActive: true, // Default to true for work order assets
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      ownerId: null,
      administratorId: null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'assetCode': assetCode,
      'name': name,
      'description': description,
      'model': model,
      'manufacturer': manufacturer,
      'serialNumber': serialNumber,
      'location': location,
      'installDate': installDate?.toIso8601String(),
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'ownerId': ownerId,
      'administratorId': administratorId,
    };
  }

  String get displayInfo {
    final buffer = StringBuffer();
    buffer.write(name);
    if (model != null && model!.isNotEmpty) {
      buffer.write(' ($model)');
    }
    return buffer.toString();
  }

  String get fullDescription {
    final parts = <String>[];
    
    if (description != null && description!.isNotEmpty) {
      parts.add(description!);
    }
    
    if (manufacturer != null && manufacturer!.isNotEmpty) {
      parts.add('制造商: $manufacturer');
    }
    
    if (serialNumber != null && serialNumber!.isNotEmpty) {
      parts.add('序列号: $serialNumber');
    }
    
    return parts.join('\n');
  }
}
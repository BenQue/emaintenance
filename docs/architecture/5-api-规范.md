# 5. API 规范

采用 REST API 风格，使用 OpenAPI 3.0 标准进行定义。API 网关作为统一入口，管理对后端微服务的访问。

## 5.0 API 速率限制

所有 API 端点都实施分层速率限制策略：

### 查看操作（宽松限制）
- **限制**: 开发环境 10,000/15分钟，生产环境 1,000/15分钟
- **适用**: 所有 GET 请求
- **响应头**: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

### 创建/修改操作（严格限制）  
- **限制**: 开发环境 200/15分钟，生产环境 50/15分钟
- **适用**: POST/PUT/DELETE 请求
- **429 响应**: 包含 `retryAfter` 字段指示重试时间

## 5.1 工单照片相关API端点

### WorkOrder Service (Port: 3002)

#### 照片上传
```http
POST /api/work-orders/{workOrderId}/photos
Content-Type: multipart/form-data
Authorization: Bearer {jwt_token}

Body:
- attachments: File[] (最多5个文件，每个最大10MB)

Response:
{
  "photos": [
    {
      "id": "photo_id",
      "filename": "generated_filename.jpg",
      "originalName": "device_fault.jpg",
      "filePath": "2025/01/workorder123-1642345678-device_fault.jpg",
      "fileSize": 2048000,
      "mimeType": "image/jpeg",
      "uploadedAt": "2025-01-07T10:30:00Z"
    }
  ]
}
```

#### 获取工单照片列表
```http
GET /api/work-orders/{workOrderId}/photos
Authorization: Bearer {jwt_token}

Response:
{
  "photos": [
    {
      "id": "photo_id",
      "originalName": "device_fault.jpg", 
      "fileSize": 2048000,
      "uploadedAt": "2025-01-07T10:30:00Z",
      "thumbnailUrl": "/api/work-orders/{workOrderId}/photos/{photoId}/thumbnail",
      "fullUrl": "/api/work-orders/{workOrderId}/photos/{photoId}"
    }
  ]
}
```

#### 获取照片文件（原图）
```http
GET /api/work-orders/{workOrderId}/photos/{photoId}
Authorization: Bearer {jwt_token}

Response: 
- Binary image data with appropriate Content-Type header
- Content-Disposition: inline; filename="original_name.jpg"
```

#### 获取照片缩略图
```http
GET /api/work-orders/{workOrderId}/photos/{photoId}/thumbnail
Authorization: Bearer {jwt_token}

Response:
- Compressed JPEG thumbnail (300x300px max)
- Content-Type: image/jpeg
```

## 5.2 文件存储规范

### 存储路径结构
```
/uploads/work-orders/
├── 2025/
│   ├── 01/
│   │   ├── WO123-1642345678-device_fault.jpg
│   │   ├── WO123-1642345690-repair_complete.jpg
│   │   └── thumbnails/
│   │       ├── thumb_WO123-1642345678-device_fault.jpg
│   │       └── thumb_WO123-1642345690-repair_complete.jpg
│   └── 02/
└── 2024/
```

### 文件命名规范
- 格式: `{workOrderId}-{timestamp}-{randomId}.{ext}`
- 示例: `WO123-1642345678-a1b2c3d4.jpg`
- 缩略图前缀: `thumb_`

### 支持的文件格式
- 图片: JPEG, PNG, GIF, WebP
- 文档: PDF, TXT (仅工单附件，非照片)
- 大小限制: 10MB/文件
- 数量限制: 5个文件/请求

# 灵活API配置系统使用指南

## 概述

新的灵活API配置系统彻底解决了Docker部署环境下的API访问问题，无论服务器地址或端口如何变化，都能自动适配。

## 核心特性

### 🎯 智能环境检测
- 自动检测运行环境（本地开发 vs Docker容器）
- 动态选择最佳的API访问策略
- 支持服务器地址和端口的任意变更

### 🔄 多层配置优先级
1. **环境变量配置** - 最高优先级
2. **运行时检测** - 智能判断当前环境
3. **默认回退值** - 确保系统可用性

### 📱 统一的Web和移动端支持
- Web端使用统一的API配置系统
- 移动端支持网络发现和自动配置
- 一次配置，全平台适用

## 快速使用

### 方案一：一键修复（推荐）

```bash
cd /Users/benque/Project/Emaintenance/deploy
./quick-fix-api.sh
```

### 方案二：交互式配置

```bash
cd /Users/benque/Project/Emaintenance/deploy
./fix-docker-api-access.sh
```

### 方案三：手动配置

1. 复制环境配置文件：
   ```bash
   cp .env.example .env
   ```

2. 编辑`.env`文件：
   ```bash
   # 获取你的IP地址
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # 在.env中设置
   API_GATEWAY_URL=http://你的IP地址
   MOBILE_API_HOST=你的IP地址
   ```

3. 重新部署：
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## 配置选项详解

### 环境变量配置

#### Web应用环境变量
```bash
# Docker环境标识
RUNNING_IN_DOCKER=true

# API网关地址（可选）
API_GATEWAY_URL=http://192.168.1.100    # 局域网访问
# API_GATEWAY_URL=https://example.com   # 域名访问
# API_GATEWAY_URL=                      # 留空使用相对路径

# 单独服务URL（通常留空）
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_USER_SERVICE_URL=
NEXT_PUBLIC_WORK_ORDER_SERVICE_URL=
NEXT_PUBLIC_ASSET_SERVICE_URL=
```

#### 移动端配置
```bash
MOBILE_API_HOST=192.168.1.100    # 服务器IP地址
MOBILE_API_PORT=80               # 服务器端口
MOBILE_API_PROTOCOL=http         # 协议（http/https）
```

### 自动配置逻辑

#### Web端配置逻辑
```typescript
// 优先级：环境变量 > 自动检测 > 默认值
function getBaseUrl(): string {
  if (isBrowser) {
    // 浏览器环境
    const apiGateway = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
    if (apiGateway) return apiGateway;
    
    // Docker环境使用相对路径
    if (isDocker) return '';
    
    // 开发环境使用localhost
    return 'http://localhost';
  }
  
  // 服务器端环境
  return isDocker ? 'http://nginx' : 'http://localhost';
}
```

#### 移动端配置逻辑
```dart
// 自动网络发现 + 用户配置
Future<String> getBaseUrl() async {
  // 1. 用户自定义服务器
  final customServer = prefs.getString('custom_server_url');
  if (customServer != null) return customServer;
  
  // 2. 环境预设
  final selectedEnv = prefs.getString('selected_environment');
  if (selectedEnv != null) return _defaultServers[selectedEnv]!;
  
  // 3. 自动发现
  final discovered = await NetworkDiscoveryService.discoverServers();
  if (discovered.isNotEmpty) return discovered.first;
  
  // 4. 默认值
  return _defaultServers['development']!;
}
```

## 使用场景

### 场景1：本地开发
```bash
# 不需要特殊配置，系统自动使用localhost
cd deploy
docker-compose up -d
```

### 场景2：局域网访问
```bash
# 设置API网关为局域网IP
echo "API_GATEWAY_URL=http://192.168.1.100" > .env
docker-compose up -d
```

### 场景3：公网域名
```bash
# 设置API网关为域名
echo "API_GATEWAY_URL=https://emaintenance.example.com" > .env
docker-compose up -d
```

### 场景4：端口变更
```bash
# 更改Nginx端口
docker-compose -p custom-port -f docker-compose.yml up -d
# 系统会自动适配新的端口配置
```

## 移动端配置

### 自动发现服务器

移动端应用内置了网络发现功能：

1. **打开移动端应用**
2. **进入设置 > 服务器设置**
3. **点击"发现服务器"**
4. **选择检测到的服务器**

### 手动配置服务器

如果自动发现失败：

1. **获取服务器IP地址**：
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1
   ```

2. **在移动端输入**：
   - 服务器地址：`http://你的IP地址`
   - 端口：`80`（默认）

### 验证连接

移动端会自动测试连接：
- ✅ 健康检查通过
- ✅ API端点可访问
- ✅ 响应时间 < 1000ms

## 故障排除

### Web端API 404错误

**症状**：工单创建、状态更新等操作返回404

**解决**：
```bash
# 检查当前配置
docker-compose -f docker-compose.yml logs web | grep -i api

# 使用一键修复
./quick-fix-api.sh

# 手动重启
docker-compose restart web nginx
```

### 移动端连接失败

**症状**：登录后显示"未知错误"

**解决**：
1. **确认服务器可访问**：
   ```bash
   curl http://你的IP地址/health
   curl http://你的IP地址/api/users/health
   ```

2. **在移动端重新配置服务器**
3. **使用网络发现功能**

### Nginx代理问题

**症状**：某些API端点访问失败

**解决**：
```bash
# 检查Nginx配置
docker-compose -f docker-compose.yml logs nginx

# 检查服务状态
docker-compose -f docker-compose.yml ps

# 重启Nginx
docker-compose restart nginx
```

## 配置验证

### Web端验证
```bash
# 检查API配置
curl http://localhost/api/users/health
curl http://localhost/api/work-orders
curl http://localhost/api/assets/health

# 检查控制台日志
docker-compose logs web | grep -i "api.*config"
```

### 移动端验证
```bash
# 服务器端检查连接
curl -v http://你的IP地址/api/users/health

# 移动端查看连接状态
# 设置 > 服务器设置 > 连接状态
```

## 高级配置

### 多环境切换

支持在不同环境间快速切换：

```bash
# 开发环境
export API_GATEWAY_URL=""
docker-compose up -d

# 测试环境  
export API_GATEWAY_URL="http://test.example.com"
docker-compose up -d

# 生产环境
export API_GATEWAY_URL="https://prod.example.com"  
docker-compose up -d
```

### 负载均衡支持

系统支持多服务器负载均衡：

```bash
# 配置多个API网关
API_GATEWAY_URL="http://lb.example.com"
# Nginx会自动处理负载均衡
```

### SSL/TLS配置

支持HTTPS访问：

```bash
# 启用HTTPS
API_GATEWAY_URL="https://secure.example.com"
MOBILE_API_PROTOCOL=https
```

## 最佳实践

1. **开发环境**：使用默认配置，无需修改
2. **测试环境**：使用IP地址配置，便于团队访问
3. **生产环境**：使用域名配置，启用HTTPS
4. **移动端**：优先使用自动发现，备用手动配置
5. **备份配置**：定期备份`.env`文件

## 技术实现

### 前端API配置系统
- 位置：`apps/web/lib/config/api-config.ts`
- 功能：统一的API端点管理和动态路由
- 特性：环境检测、自动代理、错误处理

### 移动端灵活配置
- 位置：`apps/mobile/lib/shared/config/environment_flexible.dart`
- 功能：动态服务器配置和网络发现
- 特性：自动发现、连接测试、配置持久化

### Docker配置
- 位置：`deploy/docker-compose.yml`
- 功能：灵活的环境变量配置
- 特性：多环境支持、自动检测、配置回退

这个系统确保了无论你如何调整服务器地址或端口，API访问都会自动适配，彻底解决了Docker部署的网络访问问题。
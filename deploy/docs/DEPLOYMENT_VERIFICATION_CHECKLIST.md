# E-Maintenance 部署验证清单

**文档版本**: v1.0  
**创建日期**: 2025年8月30日  
**适用场景**: 本地开发、测试环境、生产环境部署验证

---

## 📋 部署前检查清单

### ✅ **环境准备**
- [ ] Docker和docker-compose已安装并正常工作
- [ ] 所需端口未被占用 (80, 443, 3000-3003, 5433, 6380)
- [ ] 系统有足够的磁盘空间 (至少10GB可用)
- [ ] Docker用户权限配置正确 (`docker ps` 无需sudo)

### ✅ **代码和配置**
- [ ] 代码已拉取到最新版本 (`git pull`)
- [ ] 环境变量文件已正确配置
- [ ] Docker镜像构建成功，无构建错误
- [ ] 所有服务的健康检查端点已定义

### ✅ **网络和反向代理**
- [ ] Nginx配置包含所有必要的API路由
- [ ] Nginx配置正确传递查询参数 (`$is_args$args`)
- [ ] 上游服务地址使用容器网络名称而非localhost

---

## 🔧 部署后功能验证

### ✅ **基础服务健康检查**

#### 数据库和缓存
```bash
# PostgreSQL连接测试
docker exec emaintenance-postgres pg_isready -U postgres

# Redis连接测试  
docker exec emaintenance-redis redis-cli ping

# 预期结果: 都应该返回成功状态
```

#### 微服务健康检查
```bash
# 用户服务
curl -f http://localhost:3001/health || echo "❌ 用户服务不健康"

# 工单服务  
curl -f http://localhost:3002/health || echo "❌ 工单服务不健康"

# 资产服务
curl -f http://localhost:3003/health || echo "❌ 资产服务不健康"

# 预期结果: 所有服务都应该返回200状态
```

#### Nginx反向代理
```bash
# Nginx健康检查
curl -f http://localhost/health || echo "❌ Nginx代理不健康"

# Web应用首页
curl -f http://localhost/ || echo "❌ Web应用无法访问"
```

### ✅ **API路由验证**

#### 认证服务
```bash
# 登录API测试
RESPONSE=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"admin123"}')

# 验证返回结构
echo $RESPONSE | jq '.success' | grep -q true || echo "❌ 登录API异常"

# 提取认证令牌用于后续测试
# JWT_AUTH=$(echo $RESPONSE | jq -r '.data.token')
# 注意: 实际使用时取消注释上一行，并替换下面的示例
JWT_AUTH="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # 替换为实际获取的JWT
echo "✅ 认证服务正常，获得认证信息"
```

#### 工单服务路由验证
```bash
# 工单列表API (验证查询参数传递)
curl -s -H "Authorization: Bearer $JWT_AUTH" \
  "http://localhost/api/work-orders?page=1&limit=5" | \
  jq '.status' | grep -q success || echo "❌ 工单列表API异常"

# 如果有现存工单，测试状态更新 (关键检查点)
WORK_ORDERS=$(curl -s -H "Authorization: Bearer $JWT_AUTH" "http://localhost/api/work-orders")
WORK_ORDER_ID=$(echo $WORK_ORDERS | jq -r '.data.workOrders[0].id // empty')

if [ ! -z "$WORK_ORDER_ID" ]; then
  # 测试状态更新API (POST方法，非PUT)
  STATUS_UPDATE=$(curl -s -X POST "http://localhost/api/work-orders/$WORK_ORDER_ID/status" \
    -H "Authorization: Bearer $JWT_AUTH" \
    -H "Content-Type: application/json" \
    -d '{"status": "IN_PROGRESS", "notes": "部署验证测试"}')
  
  # 验证不是404错误
  echo $STATUS_UPDATE | grep -q '"status":"error"' && \
    echo $STATUS_UPDATE | grep -q "404" && echo "❌ 状态更新API路由错误 (404)"
  
  # 测试状态历史API (/history路径，非/status-history)
  HISTORY=$(curl -s -H "Authorization: Bearer $JWT_AUTH" \
    "http://localhost/api/work-orders/$WORK_ORDER_ID/history")
    
  echo $HISTORY | grep -q '"statusHistory"' || echo "❌ 状态历史API异常"
  
  echo "✅ 工单状态管理API验证完成"
else
  echo "⚠️  无现存工单，跳过状态更新测试"
fi
```

#### 其他服务API验证
```bash
# 用户管理API
curl -s -H "Authorization: Bearer $JWT_AUTH" \
  "http://localhost/api/users" | \
  jq '.status' | grep -q success || echo "❌ 用户管理API异常"

# 系统设置API
curl -s -H "Authorization: Bearer $JWT_AUTH" \
  "http://localhost/api/settings/categories" | \
  jq '.status' | grep -q success || echo "❌ 系统设置API异常"

# 资产管理API
curl -s -H "Authorization: Bearer $JWT_AUTH" \
  "http://localhost/api/assets" | \
  jq '.status' | grep -q success || echo "❌ 资产管理API异常"
```

### ✅ **前端功能验证**

#### 页面可访问性
```bash
# 主要页面HTTP状态检查
PAGES=(
  "/"
  "/login"
  "/dashboard"
  "/dashboard/work-orders"
  "/dashboard/assets"
  "/dashboard/users"
  "/dashboard/settings"
)

for PAGE in "${PAGES[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost$PAGE")
  if [ "$STATUS" = "200" ]; then
    echo "✅ $PAGE - $STATUS"
  else
    echo "❌ $PAGE - $STATUS"
  fi
done
```

#### JavaScript错误检查
使用浏览器开发者工具或自动化工具检查：
- [ ] 控制台无404 API错误
- [ ] 控制台无未捕获的JavaScript异常
- [ ] 网络面板显示所有API请求成功或正常认证失败

### ✅ **关键业务流程验证**

#### 完整工单处理流程
1. **登录系统**
   - [ ] 能够使用管理员账户登录
   - [ ] 登录后正确跳转到仪表板

2. **工单管理**
   - [ ] 工单列表正确显示
   - [ ] 筛选和分页功能正常工作
   - [ ] 能够查看工单详情

3. **状态更新** (关键功能)
   - [ ] 状态更新操作不报告404错误
   - [ ] 状态更新后能正常加载历史记录
   - [ ] 状态变更正确反映在工单列表中

4. **其他核心功能**
   - [ ] 用户管理功能正常
   - [ ] 资产管理功能正常
   - [ ] 系统设置功能正常

---

## 🚨 常见问题快速诊断

### 404 Not Found 错误
```bash
# 1. 检查Nginx日志中的404请求
docker logs emaintenance-nginx | grep "404"

# 2. 检查具体的失败请求路径
# 如果看到API路径的404，检查nginx配置是否包含该路由

# 3. 验证后端服务是否实际定义了该路由
docker exec emaintenance-work-order-service curl -f http://localhost:3002/health
```

### 认证问题
```bash
# 1. 验证JWT密钥一致性
docker exec emaintenance-user-service printenv | grep JWT_SECRET
docker exec emaintenance-work-order-service printenv | grep JWT_SECRET

# 2. 检查认证令牌格式和有效性
echo $JWT_AUTH | cut -d'.' -f1 | base64 -d | jq .

# 3. 检查服务日志中的认证错误
docker logs emaintenance-work-order-service | grep -i auth
```

### 网络连接问题
```bash
# 1. 检查容器网络连通性
docker exec emaintenance-nginx ping -c 2 emaintenance-user-service
docker exec emaintenance-nginx ping -c 2 emaintenance-work-order-service

# 2. 检查端口监听状态  
docker exec emaintenance-user-service netstat -tlnp | grep :3001
docker exec emaintenance-work-order-service netstat -tlnp | grep :3002
```

---

## 📊 验证报告模板

```markdown
# E-Maintenance 部署验证报告

**部署环境**: [本地开发/测试/生产]
**部署时间**: [YYYY-MM-DD HH:mm]
**验证执行者**: [姓名]
**系统版本**: [Git提交哈希]

## 基础服务状态
- [ ] PostgreSQL: 健康/异常
- [ ] Redis: 健康/异常  
- [ ] 用户服务: 健康/异常
- [ ] 工单服务: 健康/异常
- [ ] 资产服务: 健康/异常
- [ ] Web应用: 健康/异常
- [ ] Nginx代理: 健康/异常

## API验证结果
- [ ] 认证API: 正常/异常
- [ ] 工单管理API: 正常/异常
- [ ] 工单状态更新API: 正常/异常 [关键]
- [ ] 工单历史记录API: 正常/异常 [关键]
- [ ] 用户管理API: 正常/异常
- [ ] 资产管理API: 正常/异常
- [ ] 系统设置API: 正常/异常

## 前端功能验证
- [ ] 页面加载: 正常/异常
- [ ] 登录功能: 正常/异常
- [ ] 工单筛选: 正常/异常
- [ ] 状态更新: 正常/异常 [关键]
- [ ] JavaScript错误: 无/有异常

## 发现问题
[列出验证过程中发现的问题和解决方案]

## 整体评估
- [ ] ✅ 系统可以投入使用
- [ ] ⚠️  系统有轻微问题但可以使用
- [ ] ❌ 系统有严重问题，不建议使用

**备注**: [其他说明]
```

---

## 🔄 持续改进

### 自动化验证脚本
创建 `scripts/deploy-verification.sh`:
```bash
#!/bin/bash
# E-Maintenance 部署自动验证脚本

source "$(dirname "$0")/verify-basic-health.sh"
source "$(dirname "$0")/verify-api-routes.sh" 
source "$(dirname "$0")/verify-frontend.sh"

echo "🚀 开始 E-Maintenance 部署验证..."
verify_basic_health && verify_api_routes && verify_frontend
echo "✅ 部署验证完成！"
```

### CI/CD集成
```yaml
# .github/workflows/deploy-verify.yml
name: Deployment Verification
on:
  deployment_status:
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run deployment verification
        run: ./scripts/deploy-verification.sh
```

---

**重要提醒**: 每次部署后都应该执行这个验证清单，特别关注API路由相关的检查，确保前后端契约一致性。如果发现问题，立即参考 [API_ROUTE_MISMATCH_ISSUES.md](./API_ROUTE_MISMATCH_ISSUES.md) 进行排查和修复。

*最后更新: 2025-08-30*
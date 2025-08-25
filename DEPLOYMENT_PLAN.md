# E-Maintenance System 部署计划
## MacBook M4 Pro → Linux Ubuntu 服务器迁移

### 项目概况
- **源环境**: MacBook M4 Pro (ARM64)
- **目标环境**: Linux Ubuntu 服务器 (x86_64)
- **部署策略**: 方案二 - 远程构建 (通过GitHub仓库)
- **架构**: Turborepo单体仓库 + 微服务架构

---

## 阶段一: MacBook本地部署测试

### 1.1 环境准备
```bash
# 确保Docker Desktop运行正常
docker --version
docker-compose --version

# 检查当前架构
uname -m  # 应该显示arm64

# 检查项目状态
cd /Users/benque/Project/Emaintenance
git status
```

### 1.2 本地Docker构建测试
```bash
# 进入部署目录
cd deploy

# 执行本地部署脚本 (自动化所有步骤)
./scripts/deploy-local.sh

# 或者手动执行:
# 复制环境配置
cp env-templates/.env.example .env

# 构建并启动所有服务
docker-compose up --build -d

# 验证所有服务状态
docker-compose ps
```

### 1.3 功能验证清单
- [ ] Web应用访问: http://localhost:80
- [ ] 用户服务健康检查: http://localhost:3001/health
- [ ] 工单服务健康检查: http://localhost:3002/health  
- [ ] 资产服务健康检查: http://localhost:3003/health
- [ ] 数据库连接正常
- [ ] 用户登录功能
- [ ] 工单创建/查看功能
- [ ] 资产管理功能

### 1.4 本次部署问题记录 (2025-08-25)

#### 问题1: Tailwind CSS样式完全丢失 🚨
- **症状**: 页面加载正常但所有样式丢失，元素重叠堆积
- **根本原因**: PostCSS配置使用了`@tailwindcss/postcss`，与Tailwind CSS v3.4.17不兼容
- **解决方案**: 
  1. 修改`apps/web/postcss.config.js`为简单对象格式
  2. 添加缺失的`tailwindcss-animate`依赖
  3. 重新构建web容器
- **验证**: 页面样式恢复，Tailwind类正常工作
- **关键教训**: PostCSS配置必须与Tailwind版本兼容，修改后必须重建容器

#### 问题2: API路由404错误
- **症状**: `/api/assignment-rules` 返回404错误
- **根本原因**: 
  1. 后端路由被注释掉未启用
  2. NGINX代理配置缺失相应路由规则
- **解决方案**:
  1. 在`work-order-service/src/index.ts`中取消注释assignment-rules路由
  2. 在`deploy/configs/nginx.conf`中添加代理规则
  3. 重启相关容器
- **验证**: API调用返回正确数据，功能正常

#### 问题3: 工单详情页API端点缺失
- **症状**: 工单历史和解决方案页面加载失败
- **根本原因**: 工单路由中缺少`/history`和`/resolution`端点
- **解决方案**: 在`workOrders.ts`中添加缺失的路由处理器
- **验证**: 工单详情页各个标签页正常显示

#### 问题4: 工单照片API路径不匹配
- **症状**: 工单照片功能报404错误
- **根本原因**: 前端期望`/work-order-photos`，后端只有`/photos`
- **解决方案**: 添加路由别名以兼容前端API调用
- **验证**: 工单照片功能恢复正常

#### 问题5: 资产维修历史路径不匹配
- **症状**: 设备维修历史页面加载失败
- **根本原因**: 前端使用`/assets/`(复数)，后端使用`/asset/`(单数)
- **解决方案**: 添加复数形式的路由别名
- **验证**: 设备维修历史正常显示

#### 问题6: 工单操作菜单无响应
- **症状**: 三个点操作菜单点击无反应
- **根本原因**: 
  1. 缺少权限管理系统
  2. 操作函数未正确实现
- **解决方案**:
  1. 创建用户类型定义和权限钩子
  2. 实现基于角色的操作权限控制
  3. 添加状态变更操作（完成、取消、重新打开）
  4. 限制删除操作仅管理员可用
- **验证**: 不同角色看到合适的操作选项，权限控制正常

#### 问题7: 主题切换功能失效
- **症状**: 主题切换按钮显示错误，点击无反应
- **根本原因**:
  1. 根布局缺少ThemeProvider配置
  2. 组件导入路径错误
- **解决方案**:
  1. 在`app/layout.tsx`中配置ThemeProvider
  2. 修复组件导入路径
  3. 重新构建web容器
- **验证**: 主题切换功能正常，支持浅色/深色/系统模式

### 1.5 问题记录模板（用于未来）
```
问题: [描述问题]
错误日志: [docker logs container-name]
解决方案: [记录解决步骤]
验证: [如何确认问题已解决]
关键教训: [避免重复问题的要点]
```

---

## 阶段二: 代码推送到GitHub

### 2.1 代码清理和提交
```bash
# 清理构建产物(避免推送不必要文件)
npm run clean

# 检查.gitignore确保以下文件被忽略
echo "检查.gitignore内容:"
cat .gitignore | grep -E "(node_modules|dist|.next|coverage|local-data|local-logs)"

# 提交所有更改
git add .
git commit -m "feat: prepare for remote deployment on Linux Ubuntu server

- Clean build artifacts
- Update deployment configurations  
- Verify Docker compose files for cross-platform compatibility
- Ready for remote server deployment

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 推送到GitHub主分支
git push origin main
```

### 2.2 验证GitHub仓库状态
- [ ] 所有源代码已推送
- [ ] Docker配置文件完整
- [ ] 环境变量模板文件存在
- [ ] 部署脚本可执行

---

## 阶段三: Linux Ubuntu服务器部署

### 3.1 服务器环境准备
```bash
# 在Ubuntu服务器执行以下命令

# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
uname -m  # 应该显示x86_64
```

### 3.2 克隆项目仓库
```bash
# 克隆GitHub仓库
git clone https://github.com/your-username/Emaintenance.git
cd Emaintenance

# 验证项目文件
ls -la
ls -la local-deploy/
ls -la docker-deploy/
```

### 3.3 环境配置
```bash
# 创建环境变量文件
cp .env.example .env

# 编辑环境变量(根据服务器实际情况调整)
nano .env

# 主要配置项:
DATABASE_URL="postgresql://postgres:your-password@localhost:5432/emaintenance"
JWT_SECRET="your-strong-jwt-secret"
REDIS_URL="redis://localhost:6379"
NODE_ENV="production"
```

### 3.4 创建数据存储目录
```bash
# 创建数据持久化目录
mkdir -p /opt/emaintenance/data
mkdir -p /opt/emaintenance/logs

# 设置权限
sudo chown -R $USER:$USER /opt/emaintenance/
chmod -R 755 /opt/emaintenance/
```

### 3.5 远程构建和部署
```bash
# 进入部署目录
cd deploy

# 方式1: 使用自动化部署脚本 (推荐)
./scripts/deploy-server.sh

# 方式2: 手动部署
# 复制并配置环境文件
cp env-templates/.env.example .env
nano .env  # 编辑生产环境配置

# 构建并启动所有服务
docker-compose up --build -d

# 检查服务健康状态
./scripts/health-check.sh
```

### 3.6 数据库初始化
```bash
# 等待数据库启动
sleep 30

# 执行数据库迁移
docker-compose exec web-local npm run db:push
docker-compose exec web-local npm run db:seed

# 验证数据库
docker-compose exec postgres-local psql -U postgres -d emaintenance -c "SELECT count(*) FROM users;"
```

---

## 阶段四: 部署验证和监控

### 4.1 服务状态检查
```bash
# 进入部署目录
cd deploy

# 执行健康检查脚本
./scripts/health-check.sh

# 手动检查容器状态
docker-compose ps

# 检查服务日志
docker-compose logs --tail=50 web
docker-compose logs --tail=50 user-service
docker-compose logs --tail=50 work-order-service
docker-compose logs --tail=50 asset-service
```

### 4.2 功能测试清单
- [ ] Web应用访问正常 (服务器IP或域名)
- [ ] 用户注册/登录功能
- [ ] API服务响应正常
- [ ] 数据库连接稳定
- [ ] 文件上传功能(如果有)
- [ ] 移动端API调用(如果需要)

### 4.3 性能和安全检查
```bash
# 检查端口开放情况
sudo netstat -tlnp | grep docker

# 检查系统资源使用
docker stats

# 检查磁盘使用
df -h
du -sh /opt/emaintenance/
```

---

## 问题排查指南

### 常见问题和解决方案

#### 1. 架构兼容性问题
```bash
# 症状: 镜像无法启动，显示架构错误
# 解决: 在服务器重新构建
docker-compose build --no-cache
```

#### 2. Node.js依赖问题
```bash
# 症状: npm install失败或运行时错误
# 解决: 清理并重新安装
docker-compose exec web-local rm -rf node_modules package-lock.json
docker-compose exec web-local npm install
```

#### 3. Prisma Client问题
```bash
# 症状: 数据库连接失败
# 解决: 重新生成Prisma Client
docker-compose exec web-local npx prisma generate
```

#### 4. 文件权限问题
```bash
# 症状: 文件读写权限错误
# 解决: 调整容器用户权限
sudo chown -R 1000:1000 /opt/emaintenance/
```

#### 5. 网络连接问题
```bash
# 症状: 服务间无法通信
# 解决: 检查Docker网络配置
docker network ls
docker network inspect emaintenance_default
```

#### 6. ⚠️ **CSS样式丢失问题** (重要 - 反复出现的问题)
```bash
# 症状: 页面加载但样式完全丢失，元素堆积，Tailwind CSS类不生效
# 原因: PostCSS配置与Tailwind CSS v3不兼容
# 解决方案:
# 1. 检查PostCSS配置文件 apps/web/postcss.config.js:
#    必须使用简单对象格式，不要使用 @tailwindcss/postcss
cat apps/web/postcss.config.js
# 应该是:
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

# 2. 确认Tailwind配置正确支持dark模式:
grep "darkMode" apps/web/tailwind.config.js
# 应该包含: darkMode: ["class"]

# 3. 重新构建web容器 (必须完全重建):
docker-compose build --no-cache web
docker-compose up -d web

# 4. 验证CSS生成:
docker-compose exec web ls -la .next/static/css/
docker-compose exec web head -20 .next/static/css/[文件名].css

# 预防措施:
# - 使用Tailwind CSS v3时，避免使用@tailwindcss/postcss
# - 修改PostCSS配置后必须重新构建容器
# - 确保globals.css中包含@tailwind指令和CSS变量定义
```

#### 7. API路由404错误
```bash
# 症状: 前端调用API时返回404或Route not found
# 原因: 
#   - 后端路由未正确注册
#   - NGINX代理配置缺失
#   - 前后端API路径不匹配
# 解决方案:
# 1. 检查后端路由注册:
grep -r "api/work-orders" apps/api/work-order-service/src/index.ts
# 2. 检查NGINX配置:
grep -A 5 "work-orders" deploy/configs/nginx.conf
# 3. 添加缺失的API代理规则和重启NGINX
```

#### 8. 工单操作菜单不响应
```bash
# 症状: 点击三个点图标没有反应，下拉菜单不出现
# 原因:
#   - 权限系统未正确配置
#   - ThemeProvider未设置导致组件渲染问题
#   - 操作处理函数未正确绑定
# 解决方案:
# 1. 配置权限系统和用户角色
# 2. 设置ThemeProvider在根布局
# 3. 实现具体的操作处理函数
# 4. 重新构建并测试权限控制
```

#### 9. 主题切换功能失效
```bash
# 症状: 主题切换按钮显示错误，点击无反应，暗色/浅色模式不切换
# 原因:
#   - 根布局中缺少ThemeProvider配置
#   - next-themes包配置不正确
#   - 导入路径错误
# 解决方案:
# 1. 在app/layout.tsx中配置ThemeProvider:
<ThemeProvider
  attribute="class"
  defaultTheme="system" 
  enableSystem
  disableTransitionOnChange
>

# 2. 确认Tailwind配置支持dark模式
# 3. 修复组件导入路径
# 4. 重新构建web容器
```

---

## 回滚计划

### 快速回滚步骤
```bash
# 1. 停止所有服务
docker-compose down

# 2. 恢复到上一个工作版本
git checkout previous-working-commit
docker-compose build
docker-compose up -d

# 3. 恢复数据库(如果有备份)
# 根据备份策略执行恢复操作
```

---

## 监控和维护

### 日常维护命令
```bash
# 查看服务状态
docker-compose ps

# 重启特定服务
docker-compose restart web-local

# 查看日志
docker-compose logs -f service-name

# 清理未使用的镜像
docker system prune -f

# 备份数据库
docker-compose exec postgres-local pg_dump -U postgres emaintenance > backup_$(date +%Y%m%d).sql
```

### 性能监控
- CPU使用率: `docker stats`
- 内存使用: `free -h`
- 磁盘空间: `df -h`
- 网络连接: `ss -tlnp`

---

## 完成检查清单

### MacBook本地部署 ✅
- [ ] 环境准备完成
- [ ] Docker构建成功
- [ ] 所有服务启动正常
- [ ] 功能测试通过
- [ ] 问题记录和解决

### GitHub推送 ✅  
- [ ] 代码清理完成
- [ ] 提交推送成功
- [ ] 仓库状态验证

### 服务器部署 ✅
- [ ] 服务器环境准备
- [ ] 项目克隆完成
- [ ] 环境配置正确
- [ ] 远程构建成功
- [ ] 服务启动正常
- [ ] 数据库初始化完成

### 验证和监控 ✅
- [ ] 功能测试通过
- [ ] 性能检查正常
- [ ] 监控配置完成
- [ ] 文档更新完成

---

**注意事项:**
1. 每个阶段完成后记录执行结果
2. 遇到问题及时记录和解决
3. 保持GitHub仓库和服务器代码同步
4. 定期备份重要数据
5. 监控服务器资源使用情况

**预计总耗时:** 2-4小时 (包括测试和问题解决时间)
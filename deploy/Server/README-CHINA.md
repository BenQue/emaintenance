# 🇨🇳 中国服务器部署专用指南

本指南专门针对**中国大陆服务器**的网络环境，提供优化的部署方案。

## 🚀 快速开始 (推荐流程)

### 方案 A: 自动配置镜像源 + 在线部署
```bash
# 1. 环境准备 - 配置中国镜像源
cd deploy/Server/infrastructure
./setup-china-mirrors.sh

# 2. 基础设施部署
./deploy.sh

# 3. 后续服务部署
cd ../database && ./init.sh
cd ../user-service && ./deploy.sh
# ... 其他服务
```

### 方案 B: 离线部署 (网络受限推荐)
```bash
# 在有网络的环境 (如本地 MacBook) 准备离线包
cd deploy/Server/scripts
./offline-deployment.sh prepare

# 将生成的 .tar.gz 文件传输到目标服务器
scp emaintenance-offline-*.tar.gz user@server:/root/

# 在目标服务器解压并部署
tar -xzf emaintenance-offline-*.tar.gz
./offline-deploy.sh
cd ../infrastructure && ./deploy.sh
```

## 🎯 中国网络环境优化

### 1. Docker 镜像源配置
自动配置以下镜像加速器：
- **中科大镜像**: `https://docker.mirrors.ustc.edu.cn`
- **网易镜像**: `https://hub-mirror.c.163.com`
- **百度镜像**: `https://mirror.baidubce.com`
- **腾讯云镜像**: `https://ccr.ccs.tencentyun.com`

### 2. npm 镜像源配置
- **淘宝镜像**: `https://registry.npmmirror.com`
- **相关二进制文件**: 自动配置国内 CDN

### 3. Ubuntu apt 源配置
- **清华大学镜像**: 主要源
- **阿里云镜像**: 备用源

### 4. 预拉取镜像策略
提前下载以下关键镜像：
```
postgres:16-alpine    # 数据库
redis:7-alpine        # 缓存
nginx:alpine          # 反向代理
node:18-alpine        # 应用运行时
node:20-alpine        # 构建环境
```

## 📦 离线部署详解

### 适用场景
- 服务器无法访问外网
- 网络极不稳定
- 需要重复部署多台服务器
- 严格的安全环境

### 离线包准备 (在有网络环境执行)
```bash
# 准备完整离线包
./offline-deployment.sh prepare

# 仅保存镜像
./offline-deployment.sh save

# 验证离线包
./offline-deployment.sh verify
```

### 离线包内容
```
emaintenance-offline-[timestamp].tar.gz
├── docker-images/          # 所有 Docker 镜像
│   ├── postgres__16-alpine.tar.gz
│   ├── redis__7-alpine.tar.gz
│   └── ...
├── offline-package/        # 项目文件和依赖
│   ├── npm-cache/          # npm 缓存
│   └── Server/             # 部署配置
└── offline-deploy.sh       # 离线部署脚本
```

### 目标服务器执行
```bash
# 1. 传输离线包
scp emaintenance-offline-*.tar.gz user@server:/opt/

# 2. 解压
cd /opt
tar -xzf emaintenance-offline-*.tar.gz

# 3. 加载镜像和配置
./offline-deploy.sh

# 4. 开始部署
cd infrastructure
OFFLINE_MODE=true ./deploy.sh
```

## 🛠 网络问题排查

### 常见网络问题诊断
```bash
# 检测网络连通性
curl -I https://github.com              # GitHub 访问
curl -I https://hub.docker.com          # Docker Hub 访问
curl -I https://registry.npmjs.org      # npm 官方源

# 检测 DNS 解析
nslookup github.com
nslookup docker.io

# 测试镜像拉取速度
time docker pull hello-world
```

### 网络优化建议
1. **使用 CDN 加速**: 选择离服务器最近的镜像源
2. **并发下载控制**: 避免过多并发连接导致限流
3. **超时设置优化**: 增加网络超时时间
4. **重试机制**: 失败时自动重试

## 🔧 故障排查指南

### 镜像拉取失败
```bash
# 检查镜像源配置
docker info | grep -A 10 "Registry Mirrors"

# 手动测试镜像源
docker pull docker.mirrors.ustc.edu.cn/library/hello-world

# 重新配置镜像源
./setup-china-mirrors.sh
```

### npm 依赖安装失败
```bash
# 检查 npm 配置
npm config list

# 手动设置镜像源
npm config set registry https://registry.npmmirror.com

# 清理缓存重试
npm cache clean --force
```

### DNS 解析问题
```bash
# 配置国内 DNS
echo "nameserver 223.5.5.5" | sudo tee /etc/resolv.conf
echo "nameserver 114.114.114.114" | sudo tee -a /etc/resolv.conf

# 刷新 DNS 缓存
sudo systemctl restart systemd-resolved
```

## 📊 部署时间对比

| 部署方式 | 网络环境 | 预计时间 | 稳定性 |
|----------|----------|----------|--------|
| 标准部署 | 国外优质网络 | 10-15分钟 | ⭐⭐⭐⭐⭐ |
| 镜像源部署 | 中国网络 | 15-25分钟 | ⭐⭐⭐⭐ |
| 离线部署 | 任何环境 | 5-10分钟 | ⭐⭐⭐⭐⭐ |

## ⚡ 性能优化建议

### 服务器配置建议
- **CPU**: 4核心+ (推荐 8核心)
- **内存**: 8GB+ (推荐 16GB)
- **磁盘**: SSD 50GB+ (推荐 100GB)
- **带宽**: 10Mbps+ (推荐 100Mbps)

### 网络优化配置
```bash
# 增加 TCP 连接数限制
echo 'net.core.somaxconn = 65535' >> /etc/sysctl.conf

# 优化 TCP 参数
echo 'net.ipv4.tcp_max_syn_backlog = 65535' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_fin_timeout = 10' >> /etc/sysctl.conf

# 应用配置
sysctl -p
```

## 📞 技术支持

### 部署前检查清单
- [ ] 服务器位于中国大陆
- [ ] 网络访问 GitHub/Docker Hub 受限
- [ ] 已运行镜像源配置脚本
- [ ] 已验证 Docker 镜像源生效
- [ ] 如需离线部署，已准备离线包

### 联系信息
遇到部署问题时，请提供：
1. 服务器地理位置和网络运营商
2. Docker 版本和镜像源配置
3. 具体错误日志和网络测试结果
4. 部署模式 (在线/离线)

---
**专为中国用户优化 🇨🇳 | 支持离线部署 📦 | 网络问题自动修复 🔧**
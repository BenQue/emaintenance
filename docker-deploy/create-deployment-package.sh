#!/bin/bash

# 创建生产环境部署包脚本
# 用于打包所有部署文件，方便上传到服务器

set -e

# 配置
PACKAGE_NAME="emaintenance-deployment-$(date +%Y%m%d_%H%M%S)"
PACKAGE_DIR="/tmp/$PACKAGE_NAME"
ARCHIVE_NAME="$PACKAGE_NAME.tar.gz"

echo "🚀 创建E-Maintenance生产环境部署包..."

# 创建临时目录
mkdir -p "$PACKAGE_DIR"

# 复制部署文件
echo "📂 复制部署文件..."
cp -r docker-deploy/* "$PACKAGE_DIR/"

# 从根目录复制必要的文件
echo "📂 复制项目文件..."
mkdir -p "$PACKAGE_DIR/project"

# 复制应用源码
cp -r apps "$PACKAGE_DIR/project/"
cp -r packages "$PACKAGE_DIR/project/"

# 复制配置文件
cp package.json "$PACKAGE_DIR/project/"
cp package-lock.json "$PACKAGE_DIR/project/" 2>/dev/null || true
cp turbo.json "$PACKAGE_DIR/project/"

# 复制Docker相关文件
find . -name "Dockerfile*" -not -path "./docker-deploy/*" -exec cp {} "$PACKAGE_DIR/project/" \; 2>/dev/null || true

# 创建部署说明
cat > "$PACKAGE_DIR/DEPLOY_INSTRUCTIONS.md" << 'EOF'
# E-Maintenance 生产环境部署说明

## 快速部署

1. 上传并解压部署包到服务器：
   ```bash
   scp emaintenance-deployment-*.tar.gz user@10.163.144.13:/opt/
   ssh user@10.163.144.13
   cd /opt
   sudo tar -xzf emaintenance-deployment-*.tar.gz
   sudo chown -R $USER:$USER emaintenance-deployment-*
   cd emaintenance-deployment-*
   ```

2. 运行自动化部署：
   ```bash
   ./deploy.sh
   ```

3. 检查部署状态：
   ```bash
   ./health-check.sh
   ```

## 手动部署步骤

如果自动化部署失败，可以手动执行：

1. 确保Docker和Docker Compose已安装
2. 修改 `.env.production` 中的配置（如果需要）
3. 构建和启动服务：
   ```bash
   docker-compose -f docker-compose.production.yml up -d --build
   ```

## 访问地址

- Web应用: http://10.163.144.13
- API服务: http://10.163.144.13:3001-3003

## 默认登录

- 邮箱: admin@bizlink.com.my  
- 密码: admin123

详细文档请查看 README.md
EOF

# 创建服务器设置脚本
cat > "$PACKAGE_DIR/setup-server.sh" << 'EOF'
#!/bin/bash

# 服务器环境设置脚本
# 安装Docker、Docker Compose和其他必要软件

set -e

echo "🔧 设置Ubuntu服务器环境..."

# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要软件
sudo apt install -y curl wget git unzip htop

# 安装Docker
if ! command -v docker &> /dev/null; then
    echo "📦 安装Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    echo "✅ Docker已安装"
fi

# 安装Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "📦 安装Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "✅ Docker Compose已安装"
fi

# 创建必要目录
sudo mkdir -p /opt/emaintenance/{logs,backups,data}
sudo chown -R $USER:$USER /opt/emaintenance

# 配置防火墙
echo "🔒 配置防火墙..."
sudo ufw allow 80/tcp
sudo ufw allow 3001:3003/tcp
sudo ufw allow 22/tcp
sudo ufw --force enable

# 优化系统设置
echo "⚡ 优化系统设置..."
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

echo "✅ 服务器环境设置完成！"
echo "请重新登录以应用Docker组权限，然后运行部署脚本。"
EOF

chmod +x "$PACKAGE_DIR/setup-server.sh"

# 创建压缩包
echo "📦 创建压缩包..."
cd /tmp
tar -czf "$ARCHIVE_NAME" "$PACKAGE_NAME"

# 移动到当前目录
mv "/tmp/$ARCHIVE_NAME" "."

# 清理临时目录
rm -rf "$PACKAGE_DIR"

echo "✅ 部署包创建完成："
echo "   文件: $ARCHIVE_NAME"
echo "   大小: $(du -h "$ARCHIVE_NAME" | cut -f1)"
echo ""
echo "🚀 部署步骤："
echo "1. 上传到服务器: scp $ARCHIVE_NAME user@10.163.144.13:/opt/"
echo "2. 解压: tar -xzf $ARCHIVE_NAME"
echo "3. 运行: ./setup-server.sh (首次) 或 ./deploy.sh"
EOF
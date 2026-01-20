# CentOS 7.9 部署指南 (Node.js 16.20)

本指南适用于在 CentOS 7.9.2009 系统上部署 Blood8 项目。

## 系统要求

- **操作系统**: CentOS 7.9.2009 x86_64
- **Node.js**: 16.20.x (LTS)
- **内存**: 至少 2GB RAM
- **磁盘**: 至少 5GB 可用空间

---

## 第一步：安装 Node.js 16

### 方法1：使用 NodeSource 官方仓库（推荐）

```bash
# 1. 清理旧版本（如果有）
sudo yum remove nodejs npm -y
sudo rm -rf /etc/yum.repos.d/nodesource*.repo

# 2. 添加 NodeSource Node.js 16.x 仓库
curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo bash -

# 3. 安装 Node.js 16
sudo yum install nodejs -y

# 4. 验证安装
node --version   # 应该显示 v16.20.x
npm --version    # 应该显示 8.x.x
```

### 方法2：使用 nvm（推荐用于多版本管理）

```bash
# 1. 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 2. 重新加载环境变量
source ~/.bashrc

# 3. 安装 Node.js 16 LTS
nvm install 16
nvm use 16
nvm alias default 16

# 4. 验证
node --version
npm --version
```

---

## 第二步：配置 npm 镜像（可选但推荐）

```bash
# 使用淘宝镜像加速下载
npm config set registry https://registry.npmmirror.com

# 验证配置
npm config get registry
```

---

## 第三步：上传项目到服务器

### 方法1：使用 Git Clone

```bash
# 1. 安装 git（如果没有）
sudo yum install git -y

# 2. 克隆项目
cd /home/your_user
git clone https://github.com/smileforsword/web3.git blood8
cd blood8
```

### 方法2：使用 SCP/SFTP 上传

```bash
# 从本地上传到服务器
scp -r /path/to/web3 user@server:/home/your_user/blood8
```

---

## 第四步：安装项目依赖

### 安装后端依赖

```bash
cd ~/blood8/backend

# 安装依赖（约2-3分钟）
npm install

# 验证安装
npm list --depth=0
```

**预期输出**：
```
backend@1.0.0
├── cors@2.8.5
├── dotenv@16.3.1
├── ethers@6.9.2
├── express@4.18.2
└── pg@8.11.3
```

### 安装前端依赖（如果需要前端）

```bash
cd ~/blood8/frontend

# 安装依赖（约2-3分钟）
npm install

# 构建生产版本
npm run build
```

### 安装合约依赖（如果需要部署合约）

```bash
cd ~/blood8/contracts

# 安装依赖（约2-3分钟）
npm install

# 编译合约
npm run compile
```

---

## 第五步：配置环境变量

### 后端配置

```bash
cd ~/blood8/backend

# 复制示例配置文件
cp .env.example .env

# 编辑配置文件
vi .env
```

**必须配置的环境变量**：

```bash
# Blockchain Configuration
WEB_AUTH_PRIVATE_KEY=你的后端签名私钥
OPBNB_TESTNET_RPC=https://opbnb-testnet-rpc.bnbchain.org
NETWORK=opbnb-testnet
FACTORY_ADDRESS=0x2c4d36e6fEBC8a8F2b546fa6080f10117af44861
TOKEN_ADDRESS=0x9Aaf5A530835dE34698495BB01950AC7ce780E2c

# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration (如果使用数据库)
DATABASE_URL=postgresql://user:password@localhost:5432/blood8

# Security
SIGNATURE_DEADLINE_WINDOW=180
RATE_LIMIT_SIGN=10
ENABLE_EVENT_LISTENER=true
```

**⚠️ 重要提醒**：
- `WEB_AUTH_PRIVATE_KEY` 必须保密，这是后端签名的关键
- 可以使用 `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 生成私钥

### 前端配置（如果需要）

```bash
cd ~/blood8/frontend

cp .env.example .env
vi .env
```

```bash
VITE_NETWORK=opbnb-testnet
VITE_API_URL=http://your-server-ip:3000
```

---

## 第六步：安装并配置 PM2（生产环境进程管理）

```bash
# 1. 全局安装 PM2
sudo npm install -g pm2

# 2. 启动后端服务
cd ~/blood8/backend
pm2 start src/index.js --name blood8-backend

# 3. 查看日志
pm2 logs blood8-backend

# 4. 查看状态
pm2 status

# 5. 设置开机自启
pm2 startup
pm2 save
```

---

## 第七步：配置防火墙

```bash
# 开放后端端口（默认 3000）
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# 验证
sudo firewall-cmd --list-ports
```

---

## 第八步：验证部署

### 测试后端 API

```bash
# 测试健康检查端点
curl http://localhost:3000/health

# 预期输出
{"status":"ok"}
```

### 测试签名服务

```bash
# 测试签名端点（需要提供正确的参数）
curl -X POST http://localhost:3000/api/sign \
  -H "Content-Type: application/json" \
  -d '{
    "user": "0xYourAddress",
    "amount": "1000000000000000000",
    "roomAddress": "0xRoomAddress"
  }'
```

---

## PM2 常用命令

```bash
# 查看所有进程
pm2 list

# 查看日志
pm2 logs blood8-backend

# 实时监控
pm2 monit

# 重启服务
pm2 restart blood8-backend

# 停止服务
pm2 stop blood8-backend

# 删除进程
pm2 delete blood8-backend

# 查看详细信息
pm2 show blood8-backend
```

---

## 性能优化建议

### 1. 启用 PM2 集群模式（多核CPU）

```bash
# 使用所有CPU核心
pm2 start src/index.js --name blood8-backend -i max

# 或指定进程数
pm2 start src/index.js --name blood8-backend -i 4
```

### 2. 配置日志轮转

```bash
# 安装 pm2-logrotate
pm2 install pm2-logrotate

# 配置日志大小限制（10MB）
pm2 set pm2-logrotate:max_size 10M

# 保留最近30天的日志
pm2 set pm2-logrotate:retain 30
```

---

## 数据库配置（PostgreSQL）

如果使用数据库功能：

```bash
# 1. 安装 PostgreSQL
sudo yum install postgresql-server postgresql-contrib -y

# 2. 初始化数据库
sudo postgresql-setup initdb

# 3. 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 4. 创建数据库和用户
sudo -u postgres psql
```

在 PostgreSQL 控制台中：

```sql
CREATE DATABASE blood8;
CREATE USER blood8user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE blood8 TO blood8user;
\q
```

---

## 常见问题排查

### 1. 端口被占用

```bash
# 查看端口占用
sudo netstat -tulpn | grep :3000

# 或使用
sudo lsof -i :3000

# 杀死占用进程
sudo kill -9 <PID>
```

### 2. 权限问题

```bash
# 给予执行权限
chmod +x backend/src/index.js

# 修改文件所有者
sudo chown -R $USER:$USER ~/blood8
```

### 3. 内存不足

```bash
# 查看内存使用
free -h

# 如果内存不足，增加 swap
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 4. npm install 失败

```bash
# 清理 npm 缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

---

## 安全检查清单

- [ ] `.env` 文件权限设置为 600 (`chmod 600 .env`)
- [ ] `WEB_AUTH_PRIVATE_KEY` 已配置且保密
- [ ] 防火墙已配置，只开放必要端口
- [ ] PM2 已设置开机自启
- [ ] 日志轮转已配置
- [ ] 数据库密码已修改（如果使用）
- [ ] 定期备份 `.env` 文件（加密保存）

---

## 监控和维护

### 设置监控脚本

创建 `~/blood8/monitor.sh`：

```bash
#!/bin/bash
# 监控后端服务健康状态

ENDPOINT="http://localhost:3000/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $ENDPOINT)

if [ $RESPONSE -ne 200 ]; then
    echo "$(date): Service down, restarting..."
    pm2 restart blood8-backend
    # 可选：发送告警邮件或短信
fi
```

```bash
# 设置执行权限
chmod +x ~/blood8/monitor.sh

# 添加到 crontab（每5分钟检查一次）
crontab -e
# 添加：*/5 * * * * /home/your_user/blood8/monitor.sh >> /var/log/blood8-monitor.log 2>&1
```

---

## 更新部署

```bash
# 1. 拉取最新代码
cd ~/blood8
git pull origin master

# 2. 更新依赖
cd backend && npm install
cd ../frontend && npm install && npm run build
cd ../contracts && npm install

# 3. 重启服务
pm2 restart blood8-backend

# 4. 查看日志确认
pm2 logs blood8-backend --lines 50
```

---

## 版本信息

- **项目版本**: 1.0.0
- **Node.js**: 16.20.x
- **部署环境**: CentOS 7.9.2009
- **网络**: opBNB Testnet (chainId: 5611)
- **最后更新**: 2025-01-20

---

## 技术支持

如果遇到问题：

1. 查看 PM2 日志: `pm2 logs blood8-backend`
2. 检查系统日志: `sudo journalctl -xe`
3. 验证 Node.js 版本: `node --version`
4. 检查网络连接: `curl -I https://opbnb-testnet-rpc.bnbchain.org`

---

## 附录：完整部署脚本

创建 `deploy.sh` 一键部署脚本：

```bash
#!/bin/bash
set -e

echo "=== Blood8 一键部署脚本 ==="

# 1. 检查 Node.js 版本
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js 版本过低，需要 16.20+"
    exit 1
fi
echo "✅ Node.js 版本: $(node --version)"

# 2. 安装后端依赖
echo "📦 安装后端依赖..."
cd ~/blood8/backend
npm install --production

# 3. 配置环境变量
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，请先配置环境变量"
    cp .env.example .env
    echo "📝 已创建 .env 文件，请编辑后重新运行"
    exit 1
fi

# 4. 启动服务
echo "🚀 启动后端服务..."
pm2 delete blood8-backend 2>/dev/null || true
pm2 start src/index.js --name blood8-backend
pm2 save

echo "✅ 部署完成！"
echo "📊 查看状态: pm2 status"
echo "📜 查看日志: pm2 logs blood8-backend"
```

使用方法：
```bash
chmod +x deploy.sh
./deploy.sh
```

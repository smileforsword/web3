# 🚀 Blood8 快速启动指南

## 5分钟快速部署

### 步骤 1: 安装所有依赖（2分钟）

```bash
# 打开终端，进入项目根目录
cd D:\claude\web3

# 安装所有依赖（并行执行）
cd contracts && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 步骤 2: 配置环境变量（1分钟）

**生成后端签名私钥：**
```bash
# 运行这个命令生成一个新的私钥
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
```

**创建 contracts/.env：**
```env
DEPLOYER_PRIVATE_KEY=你的MetaMask私钥（用于部署合约）
```

**创建 backend/.env：**
```env
WEB_AUTH_PRIVATE_KEY=刚刚生成的后端签名私钥
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/blood8
PORT=3000
ENABLE_EVENT_LISTENER=true
```

### 步骤 3: 设置数据库（30秒）

```bash
# 创建数据库
createdb blood8

# 或使用 psql
psql -U postgres -c "CREATE DATABASE blood8;"

# 运行迁移
psql -U postgres -d blood8 -f backend/migrations/001_initial_schema.sql
```

### 步骤 4: 部署智能合约（1分钟）

```bash
cd contracts

# 部署到 BSC Testnet（需要 tBNB 支付 gas）
npx hardhat run scripts/deploy.js --network bscTestnet

# 部署完成后，会自动：
# ✓ 导出 ABIs 到 frontend/src/contracts/abis/
# ✓ 更新 frontend/src/contracts/addresses.js
# ✓ 保存地址到 contracts/addresses.json

# 记下输出的 Factory 和 Token 地址
```

**如果还没有 tBNB：**
- 访问 https://testnet.binance.org/faucet-smart
- 输入你的钱包地址
- 领取测试币

### 步骤 5: 更新后端配置（30秒）

编辑 `backend/.env`，添加部署的合约地址：

```env
FACTORY_ADDRESS=0x你的Factory地址
TOKEN_ADDRESS=0x你的Token地址
```

### 步骤 6: Mint 测试代币（30秒）

```bash
cd contracts

# Mint 1000 个代币到你的地址
npx hardhat run scripts/mintTokens.js --network bscTestnet -- 你的钱包地址 1000
```

### 步骤 7: 启动系统（30秒）

**打开 3 个终端：**

**终端 1 - 后端：**
```bash
cd backend
npm start
```
看到 "Server running on port 3000" 表示成功 ✓

**终端 2 - 前端：**
```bash
cd frontend
npm run dev
```
看到 "Local: http://localhost:5173" 表示成功 ✓

**终端 3 - 测试（可选）：**
```bash
cd backend
npm run test:signature
```
验证签名服务正常工作 ✓

### 步骤 8: 使用系统

1. **打开浏览器** → `http://localhost:5173`
2. **连接 MetaMask** → 点击 "Connect Wallet"
3. **切换网络** → 自动提示切换到 BSC Testnet（chainId: 97）
4. **创建房间** → 点击 "Create New Room" → 确认交易
5. **下注** → 进入房间 → 输入金额 → 点击 "Place Bet"
   - 第一次交易：批准代币 ✓
   - 自动获取后端签名 ✓
   - 第二次交易：提交下注 ✓
6. **查看结果** → 下注记录显示在列表中 ✓

---

## ⚡ 超快速启动（使用已部署的合约）

如果你想跳过部署，可以使用 README.md 中的现有合约地址：

```env
# backend/.env
FACTORY_ADDRESS=0x5da0A10bc48fA54Bd97486a7BB314C81f85fDF17
TOKEN_ADDRESS=0xA4A269d7D20BBCaE87d21942DeC0b399AC5fED56
```

然后更新 `frontend/src/contracts/addresses.js`：
```javascript
export const FACTORY_ADDRESS = "0x5da0A10bc48fA54Bd97486a7BB314C81f85fDF17";
export const TOKEN_ADDRESS = "0xA4A269d7D20BBCaE87d21942DeC0b399AC5fED56";
```

**注意**：你仍需要自己的 `WEB_AUTH_PRIVATE_KEY` 用于后端签名。

---

## 🔍 验证清单

运行这些命令验证系统正常工作：

```bash
# 1. 检查后端健康状态
curl http://localhost:3000/health
# 应返回: {"status":"ok","signer":"0x...","timestamp":"..."}

# 2. 获取后端配置
curl http://localhost:3000/api/config
# 应返回: {"authorizedSigner":"0x...","chainId":97,"network":"BSC Testnet"}

# 3. 查看所有房间
curl http://localhost:3000/api/rooms
# 应返回: [] 或房间列表

# 4. 检查数据库
psql -U postgres -d blood8 -c "SELECT * FROM rooms;"
```

---

## 🐛 常见问题快速解决

### "MetaMask not installed"
→ 安装 MetaMask 浏览器扩展

### "Wrong Network"
→ 点击前端的 "Switch to BSC Testnet" 按钮

### "Insufficient funds"
→ 从水龙头获取 tBNB: https://testnet.binance.org/faucet-smart

### "bad signer"
→ 检查 backend/.env 中的 WEB_AUTH_PRIVATE_KEY 是否正确设置

### "connection refused" (后端)
→ 确保 PostgreSQL 正在运行：`pg_ctl status`

### "Module not found"
→ 删除 node_modules 重新安装：`rm -rf node_modules && npm install`

---

## 📱 访问地址

- **前端**: http://localhost:5173
- **后端 API**: http://localhost:3000
- **健康检查**: http://localhost:3000/health
- **BSCScan Testnet**: https://testnet.bscscan.com

---

## 🎯 下一步

系统运行后，你可以：
1. 查看 `DEPLOYMENT_GUIDE.md` 了解详细文档
2. 查看 `IMPLEMENTATION_SUMMARY.md` 了解技术细节
3. 修改 UI 样式（`frontend/src/App.vue`）
4. 添加新功能（参考项目架构）
5. 部署到生产环境（BSC Mainnet）

---

**享受你的 Web3 下注房间系统！** 🎉

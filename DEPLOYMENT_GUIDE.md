# Blood8 项目部署和使用指南

## 📋 系统概述

Blood8 是一个完整的 Web3 下注房间系统，包含：
- ✅ **智能合约** (Solidity + Hardhat) - 已编译成功
- ✅ **后端服务** (Node.js + Express + PostgreSQL)
- ✅ **前端应用** (Vue 3 + ethers.js v6)

## 🚀 快速部署指南

### 前提条件

1. **Node.js** v18+ 和 npm
2. **PostgreSQL** 数据库
3. **MetaMask** 浏览器插件
4. **BSC Testnet** 测试币 (tBNB)

### 步骤 1: 部署智能合约

```bash
cd contracts

# 创建环境变量文件
cp .env.example .env

# 编辑 .env 文件，设置部署者私钥
# DEPLOYER_PRIVATE_KEY=your_private_key_here

# 合约已经编译完成，直接部署
npx hardhat run scripts/deploy.js --network bscTestnet
```

**重要提示**：
- 部署脚本会自动将 ABIs 和地址导出到 `frontend/src/contracts/`
- 保存输出的 Factory 和 Token 地址

### 步骤 2: 设置数据库

```bash
# 创建数据库
createdb blood8

# 或使用 psql
psql -U postgres
CREATE DATABASE blood8;
\q

# 运行迁移脚本
cd backend
psql -U postgres -d blood8 -f migrations/001_initial_schema.sql
```

### 步骤 3: 配置后端

```bash
cd backend

# 创建 .env 文件
cp .env.example .env
```

编辑 `backend/.env`：

```env
# 后端签名私钥（关键！必须设置）
WEB_AUTH_PRIVATE_KEY=0x你的后端签名私钥

# BSC Testnet RPC
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545

# 合约地址（从步骤1的部署输出获取）
FACTORY_ADDRESS=0x...
TOKEN_ADDRESS=0x...

# 数据库连接
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/blood8

# 服务器配置
PORT=3000
NODE_ENV=development

# 事件监听器（可选，生产环境建议开启）
ENABLE_EVENT_LISTENER=true
```

**生成后端签名私钥**：
```bash
# 使用 Node.js 生成新的私钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 输出: 一个64字符的十六进制字符串
# 添加 0x 前缀使用: 0x你的私钥
```

**重要**：
- `WEB_AUTH_PRIVATE_KEY` 是后端用于签名的私钥
- 这个地址必须在创建房间时设置为 `authorizedSigner`
- 前端会自动从 `/api/config` 获取这个地址

### 步骤 4: 启动后端服务

```bash
cd backend
npm start
```

后端将在 `http://localhost:3000` 运行。

测试后端：
```bash
curl http://localhost:3000/health
# 应该返回: {"status":"ok","signer":"0x...","timestamp":"..."}
```

### 步骤 5: 启动前端应用

```bash
cd frontend
npm run dev
```

前端将在 `http://localhost:5173` 运行。

## 🎮 使用流程

### 1. 准备工作

1. **安装 MetaMask** 并切换到 BSC Testnet
2. **获取测试币**：
   - tBNB 水龙头: https://testnet.binance.org/faucet-smart
   - 需要 tBNB 支付 gas 费用

3. **获取测试代币**：
   ```bash
   # 使用 Hardhat console 调用 mint 函数
   cd contracts
   npx hardhat console --network bscTestnet

   > const Token = await ethers.getContractAt("MockERC20", "你的TOKEN_ADDRESS");
   > await Token.mint("你的钱包地址", ethers.parseUnits("1000", 18));
   ```

### 2. 创建房间

1. 访问 `http://localhost:5173`
2. 点击 "Connect Wallet" 连接 MetaMask
3. 确认切换到 BSC Testnet（如果需要）
4. 点击 "Create New Room"
5. 确认 MetaMask 交易
6. 等待交易确认，获取房间地址

### 3. 下注（Place Bet）

1. 进入房间详情页
2. 输入下注金额（例如：10）
3. 点击 "Place Bet"
4. 系统会自动：
   - **第一次交易**：授权代币（Approve）
   - **后端签名**：请求 EIP-712 签名
   - **第二次交易**：提交下注（Pay）
5. 确认两次 MetaMask 交易
6. 等待交易确认，下注记录将显示在列表中

### 4. 查看所有房间

访问 "Rooms" 页面查看所有创建的房间。

## 🔍 验证系统运行

### 检查后端

```bash
# 检查健康状态
curl http://localhost:3000/health

# 查看所有房间
curl http://localhost:3000/api/rooms

# 获取后端配置
curl http://localhost:3000/api/config
```

### 检查数据库

```bash
psql -U postgres -d blood8

# 查看房间
SELECT * FROM rooms;

# 查看下注记录
SELECT * FROM bets;

# 查看签名请求（审计日志）
SELECT * FROM signature_requests;
```

### 在 BSCScan 上验证

访问 https://testnet.bscscan.com/ 并搜索：
- 你的房间地址
- 你的交易哈希
- Factory 合约地址
- Token 合约地址

## 🐛 常见问题

### 1. "MetaMask not installed"
**解决**：安装 MetaMask 浏览器插件

### 2. "Wrong Network"
**解决**：点击 "Switch to BSC Testnet" 按钮

### 3. "Insufficient funds"
**解决**：从水龙头获取 tBNB

### 4. "transfer fail"
**解决**：
- 检查代币余额：调用 `Token.balanceOf(yourAddress)`
- 重新授权：刷新页面并重试

### 5. "bad signer"
**解决**：
- 检查 `backend/.env` 中的 `WEB_AUTH_PRIVATE_KEY`
- 确保创建房间时使用的是后端签名者地址
- 获取后端地址：`curl http://localhost:3000/api/config`

### 6. "nonce_mismatch"
**解决**：刷新页面，后端会重新读取链上 nonce

### 7. "signature_failed"
**解决**：
- 检查后端日志
- 确认 `WEB_AUTH_PRIVATE_KEY` 已正确设置
- 检查房间地址和用户地址是否正确

### 8. "room_not_found"
**解决**：
- 检查房间地址是否正确
- 确认事件监听器正在运行或手动插入房间到数据库

### 9. 前端连接后端失败
**解决**：
- 检查后端是否在 `http://localhost:3000` 运行
- 检查 Vite 代理配置 (`vite.config.js`)
- 查看浏览器控制台网络请求

## 📊 系统架构流程

### 创建房间流程
```
前端 → MetaMask → Factory合约 → 触发 RoomCreated 事件
                                    ↓
后端事件监听器 → 保存到数据库 → rooms表
```

### 下注流程
```
前端 → 1. ERC20.approve(roomAddress, amount)
       ↓ (MetaMask 确认)
      2. 获取 nonce = room.nonces(user)
       ↓
      3. 计算 methodHash 和 payloadHash
       ↓
      4. POST /api/sign (请求后端签名)
       ↓
后端 → 验证请求 → 读取链上 nonce → 生成 EIP-712 签名 → 返回 {v,r,s}
       ↓
前端 → 5. room.pay(user, amount, deadline, v, r, s)
       ↓ (MetaMask 确认)
合约 → 验证签名 → 增加 nonce → transferFrom → 触发 Paid 事件
       ↓
后端事件监听器 → 保存到数据库 → bets表
```

## 🔐 安全注意事项

1. **私钥管理**
   - 后端 `WEB_AUTH_PRIVATE_KEY` 绝不暴露给前端
   - 生产环境使用密钥管理服务（AWS Secrets Manager、HashiCorp Vault）
   - 不要提交 `.env` 文件到 Git

2. **签名验证**
   - 每次签名前从链上读取最新 nonce
   - 签名有效期 180 秒
   - 后端记录所有签名请求（审计日志）

3. **生产环境建议**
   - 为 `/api/sign` 添加速率限制
   - 添加用户身份验证
   - 启用 HTTPS
   - 使用环境变量管理敏感信息
   - 启用 CORS 白名单

## 📁 项目文件结构

```
web3/
├── contracts/
│   ├── src/
│   │   ├── MinimalRoom.sol      # 房间合约 ✅
│   │   ├── Factory.sol           # 工厂合约 ✅
│   │   └── MockERC20.sol         # 测试代币 ✅
│   ├── scripts/
│   │   └── deploy.js             # 部署脚本 ✅
│   ├── hardhat.config.js         # Hardhat 配置 ✅
│   └── package.json              # 依赖管理 ✅
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js       # 数据库连接 ✅
│   │   │   └── blockchain.js     # Web3 Provider ✅
│   │   ├── services/
│   │   │   ├── signatureService.js   # EIP-712 签名 ✅
│   │   │   └── eventListener.js      # 事件监听 ✅
│   │   ├── routes/
│   │   │   ├── signRouter.js     # 签名 API ✅
│   │   │   └── roomsRouter.js    # 房间 API ✅
│   │   └── index.js              # 入口文件 ✅
│   ├── migrations/
│   │   └── 001_initial_schema.sql # 数据库架构 ✅
│   ├── .env.example              # 环境变量模板 ✅
│   └── package.json              # 依赖管理 ✅
│
└── frontend/
    ├── src/
    │   ├── views/
    │   │   ├── Home.vue          # 首页 ✅
    │   │   ├── CreateRoom.vue    # 创建房间 ✅
    │   │   ├── RoomDetail.vue    # 房间详情 ✅
    │   │   └── RoomsList.vue     # 房间列表 ✅
    │   ├── components/
    │   │   └── WalletConnect.vue # 钱包连接 ✅
    │   ├── composables/
    │   │   ├── useWallet.js      # 钱包逻辑 ✅
    │   │   └── useContract.js    # 合约交互 ✅
    │   ├── services/
    │   │   └── api.js            # API 客户端 ✅
    │   ├── contracts/
    │   │   ├── abis/             # 合约 ABI ✅
    │   │   └── addresses.js      # 合约地址 ✅
    │   ├── router/
    │   │   └── index.js          # 路由配置 ✅
    │   ├── App.vue               # 主应用 ✅
    │   └── main.js               # 入口文件 ✅
    ├── index.html                # HTML 模板 ✅
    ├── vite.config.js            # Vite 配置 ✅
    └── package.json              # 依赖管理 ✅
```

## 🎯 下一步开发建议

### MVP 已完成 ✅
- [x] 智能合约（Factory + MinimalRoom）
- [x] 后端签名服务
- [x] 数据库架构
- [x] 前端钱包连接
- [x] 创建房间功能
- [x] 下注功能
- [x] 房间列表

### 可选增强功能
- [ ] 管理员支付界面（Payout UI）
- [ ] 实时事件更新（WebSocket）
- [ ] 用户下注历史
- [ ] 房间统计信息（总下注额、参与人数）
- [ ] 移动端响应式优化
- [ ] 单元测试和集成测试
- [ ] 合约安全审计
- [ ] 性能优化和缓存

## 📞 支持

如遇到问题：
1. 检查浏览器控制台错误
2. 查看后端日志
3. 检查 BSCScan 上的交易状态
4. 参考上述常见问题部分

## 📜 许可证

ISC

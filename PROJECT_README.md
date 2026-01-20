# Blood8 Web3 Betting Room System

完整的 Web3 下注房间系统，基于 opBNB Testnet，使用 EIP-712 签名验证。

## 项目结构

```
web3/
├── contracts/      # Solidity 智能合约 (Hardhat)
├── backend/        # Express API 服务器 (EIP-712 签名服务)
└── frontend/       # Vue 3 前端应用
```

## 快速开始

### 1. 部署智能合约

```bash
cd contracts

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 并设置 DEPLOYER_PRIVATE_KEY

# 编译合约
npx hardhat compile

# 部署到 BSC Testnet
npx hardhat run scripts/deploy.js --network bscTestnet
```

部署完成后，合约地址和 ABI 将自动导出到 `frontend/src/contracts/`。

### 2. 设置后端服务器

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 并设置以下关键变量：
# - WEB_AUTH_PRIVATE_KEY: 后端签名私钥（必须）
# - DATABASE_URL: PostgreSQL 连接字符串
# - FACTORY_ADDRESS: 工厂合约地址（从部署脚本获取）
# - TOKEN_ADDRESS: ERC20 代币地址（从部署脚本获取）

# 创建数据库
createdb blood8

# 运行数据库迁移
psql -d blood8 -f migrations/001_initial_schema.sql

# 启动服务器
npm start
```

服务器将在 `http://localhost:3000` 运行。

### 3. 启动前端应用

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端应用将在 `http://localhost:5173` 运行。

## 核心功能流程

### 创建房间
1. 连接 MetaMask 钱包到 BSC Testnet
2. 点击 "Create Room" 按钮
3. 确认交易，部署新的房间合约
4. 获取房间地址

### 下注 (Place Bet)
1. 访问房间详情页
2. 输入下注金额
3. 系统自动执行：
   - 授权 ERC20 代币（如需要）
   - 向后端请求 EIP-712 签名
   - 提交下注交易
4. 交易确认后，下注记录显示在列表中

### 结算 (Payout)
由后端触发（需要管理员权限），暂未在前端 UI 中实现。

## 技术架构

### 智能合约（Solidity）
- **Factory.sol**: 工厂合约，用于创建新的房间
- **MinimalRoom.sol**: 房间合约，实现：
  - EIP-712 签名验证
  - 每用户 nonce 防重放攻击
  - 三个受保护方法：`pay`, `payout`, `finalize`
  - `ended` 标志控制房间状态

### 后端（Node.js/Express）
- **EIP-712 签名服务**: 使用后端私钥生成签名
- **API 端点**:
  - `POST /api/sign` - 生成签名
  - `GET /api/rooms` - 获取所有房间
  - `GET /api/rooms/:address` - 获取房间详情
  - `GET /api/rooms/:address/bets` - 获取下注记录
- **事件监听器**: 监听区块链事件并存入数据库（可选）
- **PostgreSQL 数据库**: 存储房间、下注、支付记录

### 前端（Vue 3）
- **钱包连接**: MetaMask 集成，自动切换到 BSC Testnet
- **合约交互**: 使用 ethers.js v6
- **Composables**:
  - `useWallet.js` - 钱包状态管理
  - `useContract.js` - 合约交互逻辑
- **视图组件**:
  - Home - 首页
  - CreateRoom - 创建房间
  - RoomDetail - 房间详情和下注界面
  - RoomsList - 所有房间列表

## EIP-712 签名规范

### Domain
```javascript
{
  name: "blood8-room",
  version: "1",
  chainId: 97,  // BSC Testnet
  verifyingContract: roomAddress
}
```

### Types
```javascript
{
  WebCall: [
    { name: "user", type: "address" },
    { name: "methodHash", type: "bytes32" },
    { name: "payloadHash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
}
```

### Method Signatures
- `pay`: `"pay(address,uint256,uint256)"`
- `payout`: `"payout(address,uint256,bool,address,uint256)"`
- `finalize`: `"finalize(address,uint256)"`

## 环境变量

### Backend .env
```env
WEB_AUTH_PRIVATE_KEY=0x...        # 后端签名私钥（关键）
BSC_TESTNET_RPC=https://...       # BSC Testnet RPC
FACTORY_ADDRESS=0x...             # 工厂合约地址
TOKEN_ADDRESS=0x...               # ERC20 代币地址
DATABASE_URL=postgresql://...     # PostgreSQL 连接
PORT=3000                         # 服务器端口
ENABLE_EVENT_LISTENER=false       # 是否启用事件监听
```

## 安全注意事项

1. **私钥管理**: `WEB_AUTH_PRIVATE_KEY` 只存储在服务器，绝不暴露给前端
2. **签名时效**: 所有签名 180 秒后过期
3. **Nonce 验证**: 每次签名前从链上读取最新 nonce
4. **房间状态检查**: 前端禁止在已结束的房间下注
5. **限流保护**: 生产环境应对 `/api/sign` 端点添加速率限制

## 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `bad signer` | 后端私钥与房间授权签名者不匹配 | 检查 WEB_AUTH_PRIVATE_KEY |
| `expired` | 签名已过期 | 重新请求签名 |
| `ended` | 房间已结束 | 创建新房间 |
| `nonce_mismatch` | Nonce 不匹配 | 刷新页面重试 |
| `transfer fail` | 代币余额或授权不足 | 检查余额并重新授权 |

## 测试网资源

- **BSC Testnet 水龙头**: https://testnet.binance.org/faucet-smart
- **BSCScan Testnet**: https://testnet.bscscan.com
- **ChainID**: 97
- **RPC**: https://data-seed-prebsc-1-s1.binance.org:8545/

## 开发命令

### 合约
```bash
npx hardhat compile          # 编译合约
npx hardhat test             # 运行测试
npx hardhat run scripts/deploy.js --network bscTestnet  # 部署
```

### 后端
```bash
npm start                    # 启动服务器
npm run dev                  # 开发模式
```

### 前端
```bash
npm run dev                  # 启动开发服务器
npm run build                # 构建生产版本
npm run preview              # 预览生产构建
```

## 项目状态

✅ 智能合约实现和部署脚本
✅ 后端 EIP-712 签名服务
✅ 后端 API 端点
✅ 数据库架构
✅ 前端钱包连接
✅ 房间创建界面
✅ 下注界面
✅ 房间列表
⏳ 事件监听器（可选）
⏳ 管理员支付界面
⏳ 测试套件

## 许可证

ISC

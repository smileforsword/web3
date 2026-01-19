# 网络和代币切换指南

## 概述

本文档说明如何在不同网络（测试网/主网）和不同代币（BLD8/USDT）之间切换。

## 支持的网络

| 网络 | 环境 | Chain ID | 代币 |
|------|------|----------|------|
| opBNB Testnet | 测试 | 5611 | BLD8 (自定义) |
| BSC Testnet | 测试 | 97 | USDT (需部署) |
| opBNB Mainnet | 生产 | 204 | USDT |
| BSC Mainnet | 生产 | 56 | USDT |

## 快速切换网络

### 1. 在 opBNB 测试网使用 BLD8（当前配置）

**后端配置** (`backend/.env`):
```env
NETWORK=opbnb-testnet
TOKEN=BLD8
```

**前端配置** (`frontend/.env`):
```env
VITE_NETWORK=opbnb-testnet
VITE_TOKEN=BLD8
```

### 2. 切换到 opBNB 主网使用 USDT

**步骤**:

a. **部署合约到 opBNB 主网**:
```bash
cd contracts
# 修改 .env 设置主网私钥和RPC
NETWORK=opbnb node scripts/deploy-standalone.js
```

b. **更新后端配置** (`backend/.env`):
```env
NETWORK=opbnb-mainnet
TOKEN=USDT
OPBNB_MAINNET_FACTORY=0x... # 新部署的factory地址
```

c. **更新前端配置** (`frontend/.env`):
```env
VITE_NETWORK=opbnb-mainnet
VITE_TOKEN=USDT
VITE_OPBNB_MAINNET_FACTORY=0x... # 新部署的factory地址
```

d. **重启服务**:
```bash
# 后端
cd backend
npm start

# 前端
cd frontend
npm run dev
```

### 3. 切换到 BSC 主网使用 USDT

与上述步骤类似，将 `opbnb-mainnet` 改为 `bsc-mainnet`。

## 测试网USDT部署

如果想在测试网使用USDT代币测试，可以部署一个测试USDT合约：

### 方法1：使用现有的BLD8作为USDT测试

最简单的方法是直接使用已部署的BLD8代币，只需修改显示名称：

**修改前端显示**:
```javascript
// frontend/src/config/networks.js
'opbnb-testnet': {
  tokens: {
    USDT: {  // 改名为USDT
      address: '0x9Aaf5A530835dE34698495BB01950AC7ce780E2c', // 使用BLD8地址
      decimals: 18,
      symbol: 'USDT',
      name: 'Test USDT'
    }
  }
}
```

### 方法2：部署新的USDT测试代币

创建 `contracts/scripts/deploy-test-usdt.js`:

```javascript
const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.OPBNB_TESTNET_RPC);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  // 部署6位小数的USDT（标准USDT格式）
  const MockERC20 = await ethers.ContractFactory.fromSolidity({
    abi: [...],
    bytecode: "..."
  }, wallet);

  const usdt = await MockERC20.deploy('Tether USD', 'USDT');
  await usdt.waitForDeployment();

  console.log('Test USDT deployed:', await usdt.getAddress());
}

main();
```

## 合约chainId配置

**重要**: 切换网络时需要重新部署合约，因为合约内硬编码了chainId。

当前合约 (`MinimalRoom.sol`) 在第62行硬编码了chainId:
```solidity
function _domainSeparator() internal view returns (bytes32) {
    return keccak256(
        abi.encode(
            DOMAIN_TYPEHASH,
            keccak256(bytes("blood8-room")),
            keccak256(bytes("1")),
            5611, // ⚠️ 硬编码的 opBNB Testnet chainId
            address(this)
        )
    );
}
```

**解决方案**:

### 选项1：每个网络部署独立合约（推荐）
- opBNB Testnet: 使用 chainId 5611 的合约
- BSC Testnet: 部署 chainId 97 的合约
- opBNB Mainnet: 部署 chainId 204 的合约
- BSC Mainnet: 部署 chainId 56 的合约

### 选项2：修改合约使用动态chainId

修改 `MinimalRoom.sol`:
```solidity
function _domainSeparator() internal view returns (bytes32) {
    return keccak256(
        abi.encode(
            DOMAIN_TYPEHASH,
            keccak256(bytes("blood8-room")),
            keccak256(bytes("1")),
            block.chainid, // 使用动态chainId
            address(this)
        )
    );
}
```

然后重新编译和部署。

## 环境配置文件

### 后端环境文件

创建不同环境的配置文件：

**`.env.opbnb-testnet`**:
```env
NETWORK=opbnb-testnet
TOKEN=BLD8
WEB_AUTH_PRIVATE_KEY=0x...
PORT=3000
```

**`.env.opbnb-mainnet`**:
```env
NETWORK=opbnb-mainnet
TOKEN=USDT
WEB_AUTH_PRIVATE_KEY=0x... # 生产环境私钥
PORT=3000
NODE_ENV=production
```

**使用**:
```bash
# 测试网
npm start --env-file=.env.opbnb-testnet

# 主网
npm start --env-file=.env.opbnb-mainnet
```

### 前端环境文件

**`.env.development`** (开发环境，默认):
```env
VITE_NETWORK=opbnb-testnet
VITE_TOKEN=BLD8
```

**`.env.production`** (生产环境):
```env
VITE_NETWORK=opbnb-mainnet
VITE_TOKEN=USDT
```

**构建生产版本**:
```bash
npm run build  # 自动使用 .env.production
```

## 代币小数位数注意事项

不同代币的小数位数不同：

| 代币 | 网络 | 小数位数 |
|------|------|----------|
| BLD8 | opBNB Testnet | 18 |
| USDT | BSC Mainnet | 18 |
| USDT | opBNB Mainnet | 18 |
| USDT | Ethereum | 6 ⚠️ |

**关键点**:
- BSC和opBNB上的USDT是18位小数（与ETH相同）
- 以太坊主网上的USDT是6位小数
- 代码中使用 `ethers.parseUnits(amount, decimals)` 时要注意

## 测试清单

切换网络前，请检查：

- [ ] 合约已部署到目标网络
- [ ] Factory地址已更新
- [ ] Token地址已更新
- [ ] ChainId 匹配
- [ ] 后端私钥对应的地址有足够gas费
- [ ] 后端 `.env` 配置正确
- [ ] 前端 `.env` 配置正确
- [ ] MetaMask 已添加目标网络
- [ ] 测试创建房间功能
- [ ] 测试下注功能
- [ ] 测试payout功能

## 生产环境部署建议

1. **使用环境变量管理**
   - 不要硬编码地址
   - 使用 `.env` 文件或云服务的环境变量

2. **多环境部署**
   - dev: opBNB Testnet
   - staging: opBNB Testnet（独立部署）
   - production: opBNB Mainnet 或 BSC Mainnet

3. **安全性**
   - 生产环境私钥使用硬件钱包或KMS
   - 启用HTTPS
   - 限制API访问

4. **监控**
   - 监控gas费用
   - 监控签名请求频率
   - 设置余额告警

5. **回滚计划**
   - 保留旧版本部署
   - 准备快速回滚脚本

## 常见问题

### Q: 为什么切换网络后创建房间失败？
A: 检查Factory合约地址是否已更新为新网络的地址。

### Q: 签名验证失败？
A: 检查合约中的chainId是否与当前网络匹配。

### Q: 如何获取主网USDT？
A: opBNB和BSC主网的USDT地址是公开的，无需部署。使用官方地址即可。

### Q: 测试网代币如何获取？
A:
- tBNB: https://testnet.binance.org/faucet-smart
- BLD8: 合约部署者可以mint（调用合约的mint函数）

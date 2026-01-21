# 🚀 主网迁移指南 - 从测试网到生产环境

本指南详细说明如何将 Blood8 项目从 opBNB 测试网迁移到主网，使用真实 USDT 代替测试代币 BLD8。

---

## 📊 迁移概览

### 当前状态（测试网）
```
网络：opBNB Testnet (chainId: 5611)
代币：BLD8 (自定义测试代币，可免费mint)
Factory：0x2c4d36e6fEBC8a8F2b546fa6080f10117af44861
Token：0x9Aaf5A530835dE34698495BB01950AC7ce780E2c
```

### 目标状态（主网）
```
网络：opBNB Mainnet (chainId: 204)
代币：USDT (真实 Tether USD，有实际价值)
Factory：需要部署（步骤1）
Token：0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3 (opBNB主网USDT)
```

---

## ⚠️ 重要提醒

### 主网 vs 测试网的关键区别

| 特性 | 测试网 | 主网 |
|------|--------|------|
| **代币价值** | 无价值（BLD8可免费mint） | **有真实价值**（USDT = 真钱） |
| **gas费** | 测试币（免费领取） | **真实BNB**（需购买） |
| **安全性** | 可随意测试 | **必须严格测试** |
| **私钥管理** | 可用测试私钥 | **必须高度安全** |
| **错误后果** | 无损失 | **可能造成资金损失** |

### ⚠️ 部署前必读

1. **充分测试**：确保在测试网上所有功能正常运行
2. **资金准备**：主网钱包需要足够的 BNB（约 0.01 BNB）
3. **私钥安全**：使用硬件钱包或冷钱包存储主网私钥
4. **审计建议**：生产环境建议进行智能合约安全审计
5. **备份**：备份所有私钥和助记词

---

## 📋 迁移步骤

### 准备阶段：主网前的检查清单

- [ ] 在测试网上完成全面功能测试
- [ ] 验证 EIP-712 签名流程正确
- [ ] 测试所有用户操作（创建房间、下注、结算）
- [ ] 准备主网部署钱包（至少 0.01 BNB）
- [ ] 准备后端签名钱包私钥
- [ ] 备份所有重要数据
- [ ] 确认团队成员了解迁移流程

---

## 第一步：部署 Factory 合约到主网

### 1.1 准备部署环境

```bash
cd ~/blood8/contracts

# 确认已安装依赖
npm install

# 编译合约
npm run compile
```

### 1.2 配置主网部署私钥

```bash
# 编辑 .env 文件
vi .env
```

**关键配置**：
```bash
# ⚠️ 使用主网部署钱包的私钥（不是测试网私钥！）
DEPLOYER_PRIVATE_KEY=0x你的主网钱包私钥

# 确认网络配置
NETWORK=opbnb-mainnet
```

**安全检查**：
```bash
# 验证钱包地址和余额
node -e "
const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://opbnb-mainnet-rpc.bnbchain.org');
const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
(async () => {
  console.log('部署钱包地址:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('BNB余额:', ethers.formatEther(balance));
  if (parseFloat(ethers.formatEther(balance)) < 0.01) {
    console.error('⚠️ 余额不足！请充值至少 0.01 BNB');
  } else {
    console.log('✅ 余额充足');
  }
})();
"
```

### 1.3 添加主网配置到 hardhat.config.js

**检查配置文件**：
```bash
grep -A 5 "opbnbMainnet" contracts/hardhat.config.js
```

**如果没有主网配置，添加**：
```javascript
// 在 hardhat.config.js 的 networks 部分添加
opbnbMainnet: {
  type: "http",
  url: "https://opbnb-mainnet-rpc.bnbchain.org",
  chainId: 204,
  accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
  gasPrice: 1000000000 // 1 gwei
}
```

### 1.4 执行部署（⚠️ 这将花费真实BNB）

**重要：仅部署 Factory，不部署测试代币**

创建主网部署脚本 `contracts/scripts/deploy-mainnet.js`：

```javascript
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🚀 Deploying to opBNB Mainnet...\n');

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB\n");

  if (parseFloat(hre.ethers.formatEther(balance)) < 0.005) {
    throw new Error("⚠️ Insufficient BNB balance! Need at least 0.005 BNB");
  }

  // ⚠️ 主网只部署 Factory，不部署代币（使用真实USDT）
  console.log("📝 Deploying Factory contract...");
  const Factory = await hre.ethers.getContractFactory("Factory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log("✅ Factory deployed to:", factoryAddress);

  // USDT 主网地址（已存在，无需部署）
  const usdtAddress = '0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3';
  console.log("✅ Using opBNB Mainnet USDT:", usdtAddress);

  // 保存地址
  const addresses = {
    network: 'opbnb-mainnet',
    chainId: 204,
    factory: factoryAddress,
    token: usdtAddress,
    tokenSymbol: 'USDT',
    deployer: deployer.address,
    deployedAt: new Date().toISOString()
  };

  const addressesPath = path.join(__dirname, "../mainnet-addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

  console.log("\n✅ Deployment complete!");
  console.log("📄 Addresses saved to:", addressesPath);
  console.log("\n🔴 IMPORTANT: Save these addresses!");
  console.log("Factory:", factoryAddress);
  console.log("USDT:", usdtAddress);
  console.log("\n📋 Next steps:");
  console.log("1. Update frontend/.env: VITE_OPBNB_MAINNET_FACTORY=" + factoryAddress);
  console.log("2. Update backend/.env: OPBNB_MAINNET_FACTORY=" + factoryAddress);
  console.log("3. Verify contract on explorer (optional)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

**执行部署**：
```bash
cd ~/blood8/contracts

# 创建部署脚本
# (上面的代码保存为 scripts/deploy-mainnet.js)

# 🔴 最后确认：这将花费真实BNB！
echo "⚠️ 即将部署到主网，按 Ctrl+C 取消，回车继续..."
read

# 执行部署
npx hardhat run scripts/deploy-mainnet.js --network opbnbMainnet
```

**预期输出**：
```
🚀 Deploying to opBNB Mainnet...

Deploying with account: 0xYourAddress
Account balance: 0.015 BNB

📝 Deploying Factory contract...
✅ Factory deployed to: 0xNEW_FACTORY_ADDRESS

✅ Using opBNB Mainnet USDT: 0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3

✅ Deployment complete!
📄 Addresses saved to: /path/to/mainnet-addresses.json
```

**🔴 重要：立即保存 Factory 地址！**

---

## 第二步：更新前端配置

### 2.1 更新环境变量

```bash
cd ~/blood8/frontend

# 编辑 .env 文件
vi .env
```

**修改内容**：
```bash
# 从测试网切换到主网
VITE_NETWORK=opbnb-mainnet

# 填入刚刚部署的 Factory 地址
VITE_OPBNB_MAINNET_FACTORY=0xNEW_FACTORY_ADDRESS

# API地址（如果后端也在主网模式）
VITE_API_URL=https://api.yourdomain.com
```

### 2.2 验证配置

前端配置文件 `frontend/src/config/networks.js` 已经包含主网USDT地址，无需修改。

**验证要点**：
- ✅ USDT地址：`0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3`
- ✅ USDT小数位：18（opBNB上的USDT是18位小数）
- ✅ chainId：204

### 2.3 构建生产版本

```bash
cd ~/blood8/frontend

# 安装依赖（如果还没有）
npm install

# 构建生产版本
npm run build

# 验证构建产物
ls -lh dist/
```

---

## 第三步：更新后端配置

### 3.1 更新环境变量

```bash
cd ~/blood8/backend

# 编辑 .env 文件
vi .env
```

**修改内容**：
```bash
# ==========================================
# 🚀 主网配置
# ==========================================

# 切换到主网
NETWORK=opbnb-mainnet

# 后端签名私钥（⚠️ 使用主网私钥，与测试网不同！）
WEB_AUTH_PRIVATE_KEY=0x主网后端签名私钥

# opBNB 主网 RPC
OPBNB_MAINNET_RPC=https://opbnb-mainnet-rpc.bnbchain.org

# 填入刚刚部署的 Factory 地址
OPBNB_MAINNET_FACTORY=0xNEW_FACTORY_ADDRESS

# USDT地址（opBNB主网）
TOKEN_ADDRESS=0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3

# 生产环境配置
NODE_ENV=production
PORT=3000

# 启用事件监听
ENABLE_EVENT_LISTENER=true

# 数据库配置（生产环境）
DATABASE_URL=postgresql://user:password@localhost:5432/blood8_prod
```

### 3.2 验证配置

```bash
cd ~/blood8/backend

# 测试配置
node -e "
require('dotenv').config();
const { getCurrentNetwork, getCurrentToken } = require('./config/networks');
const network = getCurrentNetwork();
const token = getCurrentToken();
console.log('网络:', network.name);
console.log('Chain ID:', network.chainId);
console.log('Factory:', network.factory);
console.log('代币:', token.symbol);
console.log('代币地址:', token.address);
console.log('代币精度:', token.decimals);

if (network.chainId !== 204) {
  console.error('❌ 错误：不是主网配置！');
} else if (token.symbol !== 'USDT') {
  console.error('❌ 错误：不是USDT！');
} else {
  console.log('✅ 配置正确');
}
"
```

### 3.3 重启后端服务

```bash
cd ~/blood8/backend

# 使用 PM2 重启
pm2 restart blood8-backend

# 查看日志
pm2 logs blood8-backend --lines 50
```

**检查日志输出**：
```
Network Configuration
============================================================
Environment: production
Network: opBNB Mainnet
Chain ID: 204
RPC URL: https://opbnb-mainnet-rpc.bnbchain.org
Factory: 0xNEW_FACTORY_ADDRESS
Token: USDT (Tether USD)
Token Address: 0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3
Token Decimals: 18
Explorer: https://opbnbscan.com
============================================================
```

---

## 第四步：部署前端到生产环境

### 方式1：使用 Nginx（推荐）

```bash
cd ~/blood8/frontend

# 复制构建产物到 Nginx 目录
sudo cp -r dist/* /var/www/blood8/

# 重启 Nginx
sudo systemctl reload nginx
```

### 方式2：使用 PM2 serve

```bash
cd ~/blood8/frontend

# 启动静态文件服务
pm2 serve dist 8080 --name blood8-frontend-prod --spa

# 保存配置
pm2 save
```

---

## 第五步：验证主网部署

### 5.1 前端验证

访问前端（浏览器）：
```
https://yourdomain.com
或
http://server-ip
```

**检查项**：
- [ ] MetaMask 提示切换到 opBNB Mainnet (chainId: 204)
- [ ] 显示 USDT 余额（而不是 BLD8）
- [ ] 创建房间功能正常
- [ ] 下注功能正常（⚠️ 小额测试！）

### 5.2 后端验证

```bash
# 测试健康检查
curl http://localhost:3000/health

# 测试签名接口（需要实际参数）
curl -X POST http://localhost:3000/api/sign \
  -H "Content-Type: application/json" \
  -d '{
    "user": "0xYourAddress",
    "amount": "1000000000000000000",
    "roomAddress": "0xRoomAddress"
  }'
```

### 5.3 区块链验证

在 opBNB 主网浏览器验证：
```
Factory 合约：
https://opbnbscan.com/address/0xNEW_FACTORY_ADDRESS

USDT 代币：
https://opbnbscan.com/address/0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3
```

---

## 🔐 安全检查清单

### 部署后必做

- [ ] **私钥安全**：删除服务器上的明文私钥，使用环境变量
- [ ] **备份**：备份 Factory 地址和部署信息
- [ ] **权限**：.env 文件权限设置为 600（`chmod 600 .env`）
- [ ] **防火墙**：只开放必要端口（80/443/3000）
- [ ] **HTTPS**：配置 SSL 证书（使用 Let's Encrypt）
- [ ] **监控**：设置服务器监控和告警
- [ ] **日志**：配置日志轮转，避免磁盘满
- [ ] **备份数据库**：定期备份数据库
- [ ] **测试交易**：用小额资金测试完整流程

### 代码安全

- [ ] 确认没有测试私钥提交到 Git
- [ ] 确认 `.gitignore` 包含 `.env` 文件
- [ ] 确认后端 CORS 配置正确
- [ ] 确认签名验证逻辑正确
- [ ] 确认 nonce 防重放机制工作
- [ ] 确认 deadline 过期检查有效

---

## 📊 成本估算

### 一次性部署成本

| 项目 | 费用（BNB） | 费用（USD）* |
|------|------------|-------------|
| 部署 Factory | ~0.002 | ~$0.60 |
| 创建首个房间 | ~0.001 | ~$0.30 |
| **总计** | ~0.003 | ~$0.90 |

*按 BNB = $300 估算

### 运营成本（每笔交易）

| 操作 | Gas 费用（BNB） | 费用（USD）* |
|------|----------------|-------------|
| 创建房间 | ~0.0005 | ~$0.15 |
| 用户下注 | ~0.0003 | ~$0.09 |
| 结算支付 | ~0.0004 | ~$0.12 |

*opBNB 主网 gas 费非常低，约为 BSC 主网的 1/10

---

## 🆘 回滚计划

如果主网部署出现问题：

### 方案1：快速切回测试网

```bash
# 前端
cd ~/blood8/frontend
# 修改 .env: VITE_NETWORK=opbnb-testnet
npm run build
sudo cp -r dist/* /var/www/blood8/

# 后端
cd ~/blood8/backend
# 修改 .env: NETWORK=opbnb-testnet
pm2 restart blood8-backend
```

### 方案2：重新部署

如果 Factory 合约有问题，可以重新部署（地址会变化）。

---

## 📞 常见问题

### Q1: 用户没有 USDT 怎么办？

**A**: 用户需要自行购买或转入 USDT到 opBNB 主网。
- 可以从交易所提币（支持 opBNB 网络）
- 或从其他链桥接过来（使用跨链桥）

### Q2: 如何获取 opBNB 主网的 BNB（用于 gas）？

**A**:
- 从币安交易所提币到 opBNB 网络
- 从 BSC 主网跨链到 opBNB（使用官方桥）

### Q3: USDT 小数位为什么是 18？

**A**: opBNB 和 BSC 主网上的 USDT 使用 18 位小数（与以太坊不同）。
```javascript
// 1 USDT = 1000000000000000000 wei (18个0)
ethers.parseUnits('1', 18) // ✅ 正确
ethers.parseUnits('1', 6)  // ❌ 错误（以太坊USDT是6位）
```

### Q4: 测试网数据会丢失吗？

**A**: 测试网和主网是完全独立的。测试网数据不会迁移到主网。

### Q5: 可以同时运行测试网和主网吗？

**A**: 可以！部署两套环境：
- 测试环境：test.yourdomain.com（连接测试网）
- 生产环境：yourdomain.com（连接主网）

---

## 📚 相关文档

- [opBNB 官方文档](https://docs.bnbchain.org/opbnb-docs/)
- [opBNB 主网区块浏览器](https://opbnbscan.com/)
- [opBNB Bridge（跨链桥）](https://opbnb-bridge.bnbchain.org/)
- [BNB Chain Faucet](https://www.bnbchain.org/en/testnet-faucet)（测试网）

---

## 📅 迁移时间表建议

| 阶段 | 时间 | 任务 |
|------|------|------|
| **准备阶段** | 第1-2天 | 完整测试，准备主网钱包和BNB |
| **部署阶段** | 第3天 | 部署 Factory，更新配置 |
| **验证阶段** | 第4-5天 | 小额测试，验证所有功能 |
| **上线阶段** | 第6天 | 正式开放给用户 |
| **监控阶段** | 第7-14天 | 密切监控，及时响应问题 |

---

## ✅ 完成标志

迁移成功的标志：

- ✅ 用户可以在 opBNB 主网上创建房间
- ✅ 用户可以使用真实 USDT 下注
- ✅ 后端签名验证正常
- ✅ 结算功能正常
- ✅ 所有交易可在 opBNBscan 上查看
- ✅ 无重大错误或资金损失
- ✅ 服务稳定运行 24 小时以上

---

**祝部署顺利！** 🎉

有问题请参考本文档或联系技术支持。

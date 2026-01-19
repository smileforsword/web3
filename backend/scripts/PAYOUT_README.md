# Payout 功能使用说明

## 概述
Payout 功能用于将房间内的token发送给赢家。后端服务器使用私钥签名授权这个操作。

## 使用方法

### 1. 基本 Payout（发送奖金，房间继续）
```bash
cd backend
node scripts/payout.js <房间地址> <赢家地址> <金额> false
```

示例：
```bash
node scripts/payout.js 0x25D2Ab477D8be62b317292942f6ABac81DA62b8C 0x1DE41d44f0Ae24cC4d4509a87250d786f51De45C 0.00001 false
```

### 2. 最终 Payout（发送奖金并结束房间）
```bash
node scripts/payout.js <房间地址> <赢家地址> <金额> true
```

示例：
```bash
node scripts/payout.js 0x25D2Ab477D8be62b317292942f6ABac81DA62b8C 0x1DE41d44f0Ae24cC4d4509a87250d786f51De45C 0.00001 true
```

## 参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| 房间地址 | MinimalRoom合约地址 | 0x25D2Ab477D8be62b317292942f6ABac81DA62b8C |
| 赢家地址 | 接收奖金的钱包地址 | 0x1DE41d44f0Ae24cC4d4509a87250d786f51De45C |
| 金额 | 发送的token数量（以token为单位，非wei） | 0.00001 |
| finalizeAfter | 发送后是否结束房间（true/false） | false |

## 工作流程

1. **脚本验证**:
   - 检查房间地址和赢家地址是否有效
   - 检查房间是否已结束
   - 检查签名者地址是否匹配
   - 检查房间余额是否足够

2. **生成签名**:
   - 读取后端当前nonce
   - 生成EIP-712签名

3. **执行交易**:
   - 调用 `room.payout()` 函数
   - 等待交易确认
   - 显示交易详情

## 示例输出

```
============================================================
Payout Script - 发送奖金给赢家
============================================================
房间地址: 0x25D2Ab477D8be62b317292942f6ABac81DA62b8C
赢家地址: 0x1DE41d44f0Ae24cC4d4509a87250d786f51De45C
发送金额: 0.00001 tokens
发送后结束房间: false
============================================================

📋 后端签名者地址: 0x795D5aDAE20771Af28D902fF68d391900a94f378
合约授权签名者: 0x795D5aDAE20771Af28D902fF68d391900a94f378

💰 房间余额: 0.00001 tokens

🔐 生成EIP-712签名...
   Nonce: 0
   Deadline: 2024-01-14 15:30:00
   ✓ 签名生成成功

📤 提交payout交易...
   交易哈希: 0x...
   ⏳ 等待确认...
   ✓ 交易确认成功！
   区块号: 118247800
   Gas使用: 45000

🎉 Payout事件:
   接收者: 0x1DE41d44f0Ae24cC4d4509a87250d786f51De45C
   金额: 0.00001 tokens
   已结束: false

============================================================
✅ Payout执行成功！
============================================================
查看交易: https://opbnb-testnet.bscscan.com/tx/0x...
```

## 注意事项

1. **私钥安全**: 确保 `WEB_AUTH_PRIVATE_KEY` 保密
2. **Gas费用**: 确保后端钱包有足够的tBNB支付gas
3. **房间余额**: 房间必须有足够的token余额
4. **Nonce管理**: 每次payout会增加后端的nonce
5. **房间状态**: 房间ended后无法再执行payout

## 错误处理

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| invalid recipient | 赢家地址无效 | 检查地址格式 |
| invalid amount | 金额为0或负数 | 使用正数金额 |
| transfer fail | 房间余额不足 | 检查房间余额 |
| bad signer | 签名者地址不匹配 | 检查WEB_AUTH_PRIVATE_KEY |
| ended | 房间已结束 | 创建新房间 |
| expired | 签名已过期 | 重新运行脚本 |

## 生产环境建议

1. **创建Web界面**: 让管理员通过Web界面执行payout
2. **多签机制**: 重要payout需要多个管理员签名
3. **自动化**: 根据游戏结果自动计算并执行payout
4. **审计日志**: 记录所有payout操作到数据库
5. **通知系统**: payout成功后通知赢家

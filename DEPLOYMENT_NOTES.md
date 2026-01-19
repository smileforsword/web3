# 部署配置说明

## 后端签名私钥

运行以下命令生成：
```bash
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
```

将输出的私钥保存到 backend/.env 的 WEB_AUTH_PRIVATE_KEY

## 部署者私钥

使用您的 MetaMask 钱包私钥（需要有 tBNB）

导出 MetaMask 私钥：
1. 打开 MetaMask
2. 点击账户详情
3. 导出私钥
4. 输入密码
5. 复制私钥

保存到 contracts/.env 的 DEPLOYER_PRIVATE_KEY

## 获取测试币

访问: https://testnet.binance.org/faucet-smart
输入您的钱包地址，领取 tBNB

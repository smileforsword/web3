# blood8 集成资料包（opBNB Testnet）— 面向无 Web3 经验团队

> 前端与后端外包团队的一次性对接文档：包含网络/地址、最小 ABI、端到端流程、EIP-712 签名规范、术语解释、常见错误与安全清单。
> 所有示例默认使用 **ethers v6**。

---

## 0）基础信息（必须）

* **网络**：opBNB Testnet（`chainId = 5611`）
* **工厂合约地址**：`0x2c4d36e6fEBC8a8F2b546fa6080f10117af44861`
* **ERC20 代币地址（BLD8）**：`0x9Aaf5A530835dE34698495BB01950AC7ce780E2c`
* **授权签名者（后端持有私钥，用于 EIP-712）**：`<后端签名者地址>`
  说明：房间创建时把该地址写入房间合约；**签名私钥只保存在后端**（.env 或密钥管理服务），前端绝不接触。

---

## 1）名词速查（给非 Web3 团队的简明解释）

* **区块链 / opBNB**：去中心化的计算网络，可执行智能合约。opBNB 是 BNB Chain 的 Layer 2 解决方案，完全兼容以太坊，gas费更低。
* **Testnet / Mainnet**：测试网（无真实价值，用测试币）；主网（真实价值）。
* **RPC / Provider**：应用连接区块链的"网关"。RPC 是接口地址；Provider 是代码里封装的连接对象（HTTP/WSS）。
* **钱包 / EOA**：由私钥控制的账户地址（0x…），可发交易与签名。
* **私钥**：控制钱包的"根钥匙"，丢失或泄露无法挽回。后端的签名私钥仅存服务器。
* **合约 / ABI**：合约是部署在链上的程序；ABI 是函数/事件的"说明书"（JSON），前端/后端用它与合约交互。
* **Gas / tBNB**：上链交易费用（gas），在 opBNB 测试网用 tBNB 支付。
* **ERC20 / approve / allowance / transferFrom**：
  标准代币协议。用户先 `approve(房间地址, 金额)` 授权额度；合约内部通过 `transferFrom(user→room)` 扣款。
* **事件（Event/Log）**：合约发出的链上日志，用于后端监听与前端展示。
* **EIP-712**：一种“结构化消息”签名标准。后端按固定结构签名，合约链上可验证，防止伪造与重放。
* **v / r / s**：椭圆曲线签名的三个组成；合约用 `ecrecover` 据此还原签名者。
* **nonce（房间内）**：房间合约对每个 `user` 维护的计数器，签名时带上，防重放。与钱包的交易 nonce 概念不同。
* **deadline**：签名过期时间（Unix 秒）。到期无效，降低被滥用风险。
* **ended**：房间已终结（作废），不可再操作。

---

## 2）端到端流程（分工）

### A. 创建房间（前端）

1. 连接钱包（opBNB Testnet，chainId: 5611）。
2. 调用工厂合约 `createRoom(token, authorizedSigner, creator)`：

   * `token` = 上述 ERC20 地址
   * `authorizedSigner` = `<后端签名者地址>`
   * `creator` = 当前用户地址（或你们想记录的发起者）
3. 从交易回执解析 `RoomCreated` 事件，得到 `roomAddress`。
4. 页面跳转到下注页，携带 `room=roomAddress`。

### B. 下注（前端 + 后端签名）

1. 前端先执行 `erc20.approve(roomAddress, amount)`。
2. 前端向后端请求一次性 **EIP-712 签名**（方法 `pay`）：

   * 后端读取 `nonce = room.nonces(user)`
   * 构造 `domain/types/value`（下文第 4 节）
   * 生成签名并返回 `{ v, r, s, deadline }`
3. 前端调用 `room.pay(user, amount, deadline, v, r, s)` 上链。

### C. 出款/结算（建议由后端触发）

1. 后端根据业务规则计算 `to, amount, finalizeAfter`。
2. 后端读取 `nonce = room.nonces(user)`，生成 **EIP-712** 签名（方法 `payout`）。
3. 后端自行上链调用 `room.payout(...)`（或前端拿签名代调用）。
4. 若 `finalizeAfter = true`，交易成功后房间 `ended = true`（作废）。

### D. 事件与数据（后端）

* 监听工厂 `RoomCreated` 与房间 `Paid / Payout / Finalized` 事件；落库。
* 对前端提供只读 API（如 `/api/rooms`、`/api/rooms/:addr`、`/api/rooms/:addr/bets`）。

---

## 3）最小 ABI（给前端/后端）

### Factory ABI

```json
[
  {
    "inputs":[
      {"internalType":"address","name":"erc20Token","type":"address"},
      {"internalType":"address","name":"authorizedSigner","type":"address"},
      {"internalType":"address","name":"creator","type":"address"}
    ],
    "name":"createRoom",
    "outputs":[{"internalType":"address","name":"room","type":"address"}],
    "stateMutability":"nonpayable",
    "type":"function"
  },
  {
    "anonymous":false,
    "inputs":[
      {"indexed":true,"internalType":"address","name":"room","type":"address"},
      {"indexed":true,"internalType":"address","name":"creator","type":"address"},
      {"indexed":false,"internalType":"address","name":"token","type":"address"},
      {"indexed":false,"internalType":"address","name":"signer","type":"address"}
    ],
    "name":"RoomCreated",
    "type":"event"
  }
]
```

### Room ABI（MinimalRoom）

```json
[
  {
    "inputs":[
      {"internalType":"address","name":"user","type":"address"},
      {"internalType":"uint256","name":"amount","type":"uint256"},
      {"internalType":"uint256","name":"deadline","type":"uint256"},
      {"internalType":"uint8","name":"v","type":"uint8"},
      {"internalType":"bytes32","name":"r","type":"bytes32"},
      {"internalType":"bytes32","name":"s","type":"bytes32"}
    ],
    "name":"pay",
    "outputs":[],
    "stateMutability":"nonpayable",
    "type":"function"
  },
  {
    "inputs":[
      {"internalType":"address","name":"to","type":"address"},
      {"internalType":"uint256","name":"amount","type":"uint256"},
      {"internalType":"bool","name":"finalizeAfter","type":"bool"},
      {"internalType":"address","name":"user","type":"address"},
      {"internalType":"uint256","name":"deadline","type":"uint256"},
      {"internalType":"uint8","name":"v","type":"uint8"},
      {"internalType":"bytes32","name":"r","type":"bytes32"},
      {"internalType":"bytes32","name":"s","type":"bytes32"}
    ],
    "name":"payout",
    "outputs":[],
    "stateMutability":"nonpayable",
    "type":"function"
  },
  {
    "inputs":[
      {"internalType":"address","name":"user","type":"address"},
      {"internalType":"uint256","name":"deadline","type":"uint256"},
      {"internalType":"uint8","name":"v","type":"uint8"},
      {"internalType":"bytes32","name":"r","type":"bytes32"},
      {"internalType":"bytes32","name":"s","type":"bytes32"}
    ],
    "name":"finalize",
    "outputs":[],
    "stateMutability":"nonpayable",
    "type":"function"
  },
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nonces","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"ended","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Paid","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"bool","name":"finalized","type":"bool"}],"name":"Payout","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"by","type":"address"}],"name":"Finalized","type":"event"}
]
```

---

## 4）后端 EIP-712 签名规范

**domain（域）**

```ts
const domain = {
  name: "blood8-room",
  version: "1",
  chainId: 5611,  // opBNB Testnet                 // BSC Testnet
  verifyingContract: roomAddress
};
```

**types（类型）**

```ts
const types = {
  WebCall: [
    { name: "user",        type: "address" },
    { name: "methodHash",  type: "bytes32" },
    { name: "payloadHash", type: "bytes32" },
    { name: "nonce",       type: "uint256" },
    { name: "deadline",    type: "uint256" }
  ]
};
```

**methodHash（字符串原文做 keccak256，必须一字不差）**

* `pay(address,uint256,uint256)`
* `payout(address,uint256,bool,address,uint256)`
* `finalize(address,uint256)`

（ethers v6 计算：`ethers.id("pay(address,uint256,uint256)")`）

**payloadHash（字段顺序必须一致）**

* pay：`abi.encode(user, amount, roomAddress)`
* payout：`abi.encode(to, amount, finalizeAfter, roomAddress, deadline)`
* finalize：`abi.encode(roomAddress, deadline)`

**nonce & deadline**

* `nonce = room.nonces(user)`（上链读取，每次递增，防重放）
* `deadline = now + 180 秒`（建议短时效）

**后端签名（ethers v6 示例）**

```ts
import { ethers } from "ethers";
const signer = new ethers.Wallet(process.env.WEB_AUTH_PRIVATE_KEY, provider);

const signature = await signer.signTypedData(domain, types, {
  user, methodHash, payloadHash, nonce, deadline
});
// 前端拿到 signature 后拆成 v,r,s
```

**前端拆签名为 v/r/s（ethers v6）**

```ts
const bytes = ethers.getBytes(signature);
const r = ethers.hexlify(bytes.slice(0, 32));
const s = ethers.hexlify(bytes.slice(32, 64));
const v = bytes[64] < 27 ? bytes[64] + 27 : bytes[64];
```

---

## 5）前端最小流程（伪代码 / ethers v6）

### A. 创建房间

```ts
const factory = new ethers.Contract(FACTORY_ADDR, FactoryABI, signer);
const tx = await factory.createRoom(TOKEN_ADDR, AUTH_SIGNER_ADDR, await signer.getAddress());
const rc = await tx.wait();
const iface = new ethers.Interface(FactoryABI);
let roomAddress;
for (const log of rc.logs) {
  try {
    const e = iface.parseLog(log);
    if (e.name === "RoomCreated") roomAddress = e.args.room;
  } catch {}
}
```

### B. 下注（approve + pay）

```ts
// 1) 授权
const erc20 = new ethers.Contract(TOKEN_ADDR, ERC20_ABI, signer);
await (await erc20.approve(roomAddress, amount)).wait();

// 2) 向后端请求 pay 的 EIP-712 签名
const room = new ethers.Contract(roomAddress, RoomABI, signer);
const nonce = await room.nonces(user);
const deadline = Math.floor(Date.now()/1000) + 180;
const methodHash  = ethers.id("pay(address,uint256,uint256)");
const payloadHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder()
                     .encode(["address","uint256","address"], [user, amount, roomAddress]));
const { v, r, s } = await fetch("/api/sign", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ roomAddress, user, method: "pay", methodHash, payloadHash, nonce: nonce.toString(), deadline })
}).then(r => r.json());

// 3) 上链调用
await (await room.pay(user, amount, deadline, v, r, s)).wait();
```

---

## 6）后端签名 API 约定（建议）

**POST `/api/sign`**
Request：

```json
{
  "roomAddress": "0xRoom",
  "user": "0xUser",
  "method": "pay|payout|finalize",
  "methodHash": "0x...",
  "payloadHash": "0x...",
  "nonce": "123",
  "deadline": 1732522333
}
```

Response：

```json
{ "v": 28, "r": "0x...", "s": "0x...", "nonce": "123", "deadline": 1732522333 }
```

后端要做的校验：

* `roomAddress` 为已知房间、状态允许；
* `methodHash` 与 `method` 一致；
* `nonce` 与链上 `room.nonces(user)` 一致；
* `deadline` 在可接受时间窗内（例如 ±60s）。

---

## 7）事件订阅与数据输出（后端）

**监听事件**

* Factory：`RoomCreated(address room,address creator,address token,address signer)`
* Room：`Paid(address user,uint256 amount)`、`Payout(address to,uint256 amount,bool finalized)`、`Finalized(address by)`

**落库字段建议**

* rooms：`roomAddress, token, signer, creator, createdAt, status(open/ended)`
* bets：`roomAddress, user, amount, txHash, blockTime`
* payouts：`roomAddress, to, amount, finalized, txHash, blockTime`

**只读 API（示例）**

* `GET /api/rooms`
* `GET /api/rooms/:addr`
* `GET /api/rooms/:addr/bets`

---

## 8）常见错误与排查

* `bad signer`：签名不是房间记录的 `authorizedSigner` 生成。核对后端私钥与创建房间时传入的公钥。
* `expired`：`deadline` 过期。重新向后端申请签名。
* `ended`：房间已经作废。需新建房间。
* `transferFrom fail / transfer fail`：代币余额或授权不足，或目标代币实现不标准。
* `reenter`：重入保护触发。避免多次并发点击提交。
* 交易层面的 `insufficient funds`：账户 tBNB 不足以支付 gas。

---

## 9）安全清单（必须遵守）

* 后端签名私钥只在服务器，绝不下发到前端或日志中。
* 签名短时效（2–3 分钟），并与 `user/roomAddress/methodHash/nonce/deadline` 强绑定。
* 重要写操作（尤其出款）建议只允许后端触发（或必须有后端签名）。
* 给 `/api/sign` 做限流与鉴权；记录请求与签名用途，便于审计。
* 前端在房间 `ended()` 为 `true` 时禁用交互。
* 全程 HTTPS，输入参数严格校验与编码。



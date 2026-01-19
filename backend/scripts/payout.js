/**
 * Payout Script - 发送奖金给赢家
 *
 * 使用方法:
 * node scripts/payout.js <roomAddress> <winnerAddress> <amount> [finalizeAfter]
 *
 * 参数:
 * - roomAddress: 房间合约地址
 * - winnerAddress: 赢家地址
 * - amount: 发送金额（单位：token，例如 "1.5" 表示 1.5 个token）
 * - finalizeAfter: 是否在发送后结束房间 (true/false，默认false)
 *
 * 示例:
 * node scripts/payout.js 0x25D2Ab477D8be62b317292942f6ABac81DA62b8C 0x1DE41d44f0Ae24cC4d4509a87250d786f51De45C 0.00001 false
 */

const { ethers } = require('ethers');
const dotenv = require('dotenv');
const SignatureService = require('../src/services/signatureService');

// Load environment variables
dotenv.config();

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('❌ 参数不足');
    console.log('\n使用方法:');
    console.log('node scripts/payout.js <roomAddress> <winnerAddress> <amount> [finalizeAfter]');
    console.log('\n示例:');
    console.log('node scripts/payout.js 0x25D2Ab477D8be62b317292942f6ABac81DA62b8C 0x1DE41d44f0Ae24cC4d4509a87250d786f51De45C 0.00001 false');
    process.exit(1);
  }

  const roomAddress = args[0];
  const winnerAddress = args[1];
  const amount = args[2];
  const finalizeAfter = args[3] === 'true';

  // Validate addresses
  if (!ethers.isAddress(roomAddress)) {
    console.error('❌ 无效的房间地址:', roomAddress);
    process.exit(1);
  }

  if (!ethers.isAddress(winnerAddress)) {
    console.error('❌ 无效的赢家地址:', winnerAddress);
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('Payout Script - 发送奖金给赢家');
  console.log('='.repeat(60));
  console.log('房间地址:', roomAddress);
  console.log('赢家地址:', winnerAddress);
  console.log('发送金额:', amount, 'tokens');
  console.log('发送后结束房间:', finalizeAfter);
  console.log('='.repeat(60));

  try {
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.OPBNB_TESTNET_RPC);
    const wallet = new ethers.Wallet(process.env.WEB_AUTH_PRIVATE_KEY, provider);

    console.log('\n📋 后端签名者地址:', wallet.address);

    // Load room contract
    const roomABI = require('../../frontend/src/contracts/abis/MinimalRoom.json');
    const room = new ethers.Contract(roomAddress, roomABI, wallet);

    // Check if room is ended
    const ended = await room.ended();
    if (ended) {
      console.error('\n❌ 房间已结束，无法执行payout');
      process.exit(1);
    }

    // Get authorized signer
    const authorizedSigner = await room.authorizedSigner();
    console.log('合约授权签名者:', authorizedSigner);

    if (authorizedSigner.toLowerCase() !== wallet.address.toLowerCase()) {
      console.error('\n❌ 签名者地址不匹配！');
      console.error('   期望:', authorizedSigner);
      console.error('   实际:', wallet.address);
      process.exit(1);
    }

    // Check room balance
    const tokenAddress = await room.token();
    const tokenABI = require('../../frontend/src/contracts/abis/MockERC20.json');
    const token = new ethers.Contract(tokenAddress, tokenABI, provider);
    const roomBalance = await token.balanceOf(roomAddress);

    console.log('\n💰 房间余额:', ethers.formatUnits(roomBalance, 18), 'tokens');

    // Convert amount to wei
    const amountWei = ethers.parseUnits(amount, 18);

    if (amountWei > roomBalance) {
      console.error('\n❌ 房间余额不足！');
      console.error('   需要:', ethers.formatUnits(amountWei, 18), 'tokens');
      console.error('   余额:', ethers.formatUnits(roomBalance, 18), 'tokens');
      process.exit(1);
    }

    // Get backend's current nonce
    const nonce = await room.nonces(wallet.address);
    const deadline = Math.floor(Date.now() / 1000) + 180; // 3 minutes from now

    // Calculate hashes
    const methodHash = ethers.id('payout(address,uint256,bool,address,uint256)');
    const payloadHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'bool', 'address', 'uint256'],
        [winnerAddress, amountWei, finalizeAfter, roomAddress, deadline]
      )
    );

    console.log('\n🔐 生成EIP-712签名...');
    console.log('   Nonce:', nonce.toString());
    console.log('   Deadline:', new Date(deadline * 1000).toLocaleString());

    // Generate signature
    const signatureService = new SignatureService(process.env.WEB_AUTH_PRIVATE_KEY, provider);
    const { v, r, s } = await signatureService.signWebCall(
      roomAddress,
      wallet.address,
      'payout',
      methodHash,
      payloadHash,
      nonce.toString(),
      deadline
    );

    console.log('   ✓ 签名生成成功');

    // Execute payout transaction
    console.log('\n📤 提交payout交易...');
    const tx = await room.payout(
      winnerAddress,
      amountWei,
      finalizeAfter,
      wallet.address,
      deadline,
      v,
      r,
      s
    );

    console.log('   交易哈希:', tx.hash);
    console.log('   ⏳ 等待确认...');

    const receipt = await tx.wait();
    console.log('   ✓ 交易确认成功！');
    console.log('   区块号:', receipt.blockNumber);
    console.log('   Gas使用:', receipt.gasUsed.toString());

    // Parse events
    const iface = new ethers.Interface(roomABI);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed.name === 'Payout') {
          console.log('\n🎉 Payout事件:');
          console.log('   接收者:', parsed.args.to);
          console.log('   金额:', ethers.formatUnits(parsed.args.amount, 18), 'tokens');
          console.log('   已结束:', parsed.args.finalized);
        } else if (parsed.name === 'Finalized') {
          console.log('\n🏁 房间已结束');
          console.log('   操作者:', parsed.args.by);
        }
      } catch {}
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Payout执行成功！');
    console.log('='.repeat(60));
    console.log('查看交易: https://opbnb-testnet.bscscan.com/tx/' + tx.hash);

  } catch (error) {
    console.error('\n❌ Payout失败:', error.message);
    if (error.reason) {
      console.error('   原因:', error.reason);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const { provider } = require('../config/blockchain');

// POST /api/payout - Execute payout (管理员功能)
router.post('/payout', async (req, res) => {
  try {
    const { roomAddress, winnerAddress, amount, finalizeAfter } = req.body;

    // Validate required fields
    if (!roomAddress || !winnerAddress || !amount) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    // Validate addresses
    if (!ethers.isAddress(roomAddress) || !ethers.isAddress(winnerAddress)) {
      return res.status(400).json({ error: 'invalid_address' });
    }

    // Load contracts
    const roomABI = require('../../../frontend/src/contracts/abis/MinimalRoom.json');

    // Minimal ERC20 ABI for balance check
    const tokenABI = [
      "function balanceOf(address) view returns (uint256)"
    ];

    // Create wallet from private key
    const wallet = new ethers.Wallet(process.env.WEB_AUTH_PRIVATE_KEY, provider);
    const room = new ethers.Contract(roomAddress, roomABI, wallet);

    // Check if room is ended
    const ended = await room.ended();
    if (ended) {
      return res.status(400).json({ error: 'room_ended' });
    }

    // Get authorized signer
    const authorizedSigner = await room.authorizedSigner();
    if (authorizedSigner.toLowerCase() !== wallet.address.toLowerCase()) {
      return res.status(403).json({
        error: 'unauthorized_signer',
        expected: authorizedSigner,
        actual: wallet.address
      });
    }

    // Check room balance
    const tokenAddress = await room.token();
    const token = new ethers.Contract(tokenAddress, tokenABI, provider);
    const roomBalance = await token.balanceOf(roomAddress);

    // Convert amount to wei
    const amountWei = ethers.parseUnits(amount.toString(), 18);

    if (amountWei > roomBalance) {
      return res.status(400).json({
        error: 'insufficient_balance',
        required: ethers.formatUnits(amountWei, 18),
        available: ethers.formatUnits(roomBalance, 18)
      });
    }

    // Get backend's current nonce
    const nonce = await room.nonces(wallet.address);
    const deadline = Math.floor(Date.now() / 1000) + 180;

    // Calculate hashes
    const methodHash = ethers.id('payout(address,uint256,bool,address,uint256)');
    const payloadHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'bool', 'address', 'uint256'],
        [winnerAddress, amountWei, finalizeAfter || false, roomAddress, deadline]
      )
    );

    console.log('🔐 Generating payout signature...');
    console.log('   Room:', roomAddress);
    console.log('   Winner:', winnerAddress);
    console.log('   Amount:', ethers.formatUnits(amountWei, 18), 'tokens');
    console.log('   Finalize:', finalizeAfter || false);

    // Generate signature
    const { v, r, s } = await req.app.locals.signatureService.signWebCall(
      roomAddress,
      wallet.address,
      'payout',
      methodHash,
      payloadHash,
      nonce.toString(),
      deadline
    );

    console.log('   ✓ Signature generated');

    // Execute payout transaction
    console.log('📤 Submitting payout transaction...');
    const tx = await room.payout(
      winnerAddress,
      amountWei,
      finalizeAfter || false,
      wallet.address,
      deadline,
      v,
      r,
      s
    );

    console.log('   Transaction hash:', tx.hash);
    console.log('   ⏳ Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('   ✓ Transaction confirmed!');

    // Parse events
    const iface = new ethers.Interface(roomABI);
    const events = [];
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed.name === 'Payout' || parsed.name === 'Finalized') {
          // Convert BigInt values to strings for JSON serialization
          const argsObj = {};
          for (const key in parsed.args) {
            const value = parsed.args[key];
            argsObj[key] = typeof value === 'bigint' ? value.toString() : value;
          }
          events.push({
            name: parsed.name,
            args: argsObj
          });
        }
      } catch {}
    }

    console.log('✅ Payout executed successfully!');

    res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: receipt.gasUsed.toString(),
      events,
      winner: winnerAddress,
      amount: ethers.formatUnits(amountWei, 18),
      finalized: finalizeAfter || false
    });

  } catch (error) {
    console.error('❌ Payout failed:', error);
    res.status(500).json({
      error: 'payout_failed',
      message: error.message,
      reason: error.reason || null
    });
  }
});

module.exports = router;

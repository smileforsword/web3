const express = require('express');
const { ethers } = require('ethers');
const { provider } = require('../config/blockchain');

// Single-file demo API for the end-to-end test flow.
// This consolidates /config, /sign, /payout, and basic room endpoints.
const router = express.Router();

const roomABI = require('../../../frontend/src/contracts/abis/MinimalRoom.json');
const tokenABI = ["function balanceOf(address) view returns (uint256)"];

// GET /api/rooms - List all rooms (placeholder while DB is disabled).
router.get('/rooms', async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// GET /api/rooms/:address - Get room details (placeholder while DB is disabled).
router.get('/rooms/:address', async (req, res) => {
  try {
    const { address } = req.params;
    res.json({
      room_address: address.toLowerCase(),
      status: 'open',
      message: 'Database disabled - limited functionality'
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// GET /api/rooms/:address/bets - Load bets by reading Paid events from chain.
router.get('/rooms/:address/bets', async (req, res) => {
  try {
    const { address } = req.params;
    const room = new ethers.Contract(address, roomABI, provider);

    const filter = room.filters.Paid();
    const events = await room.queryFilter(filter);

    const bets = events.map((event, index) => ({
      id: index + 1,
      user_address: event.args.user,
      amount: event.args.amount.toString(),
      tx_hash: event.transactionHash,
      block_number: event.blockNumber,
      timestamp: null
    }));

    res.json(bets);
  } catch (error) {
    console.error('Error fetching bets from chain:', error);
    res.status(500).json({ error: 'fetch_failed', message: error.message });
  }
});

// GET /api/rooms/:address/payouts - Placeholder for payouts.
router.get('/rooms/:address/payouts', async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    console.error('Error fetching payouts:', error);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// GET /api/config - Backend config for frontend bootstrapping.
router.get('/config', async (req, res) => {
  try {
    res.json({
      authorizedSigner: req.app.locals.signatureService.signerAddress,
      chainId: 5611,
      network: 'opBNB Testnet'
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// POST /api/sign - Generate EIP-712 signature for pay/payout/finalize.
router.post('/sign', async (req, res) => {
  try {
    const { roomAddress, user, method, methodHash, payloadHash, nonce, deadline } = req.body;

    if (!roomAddress || !user || !method || !methodHash || !payloadHash || nonce === undefined || !deadline) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    if (!ethers.isAddress(roomAddress) || !ethers.isAddress(user)) {
      return res.status(400).json({ error: 'invalid_address' });
    }

    if (!['pay', 'payout', 'finalize'].includes(method)) {
      return res.status(400).json({ error: 'invalid_method' });
    }

    const expectedMethodHash = req.app.locals.signatureService.getMethodHash(method);
    if (methodHash !== expectedMethodHash) {
      return res.status(400).json({ error: 'method_hash_mismatch', expected: expectedMethodHash });
    }

    const roomContract = new ethers.Contract(roomAddress, roomABI, provider);
    let onChainNonce;
    try {
      onChainNonce = await roomContract.nonces(user);
    } catch (error) {
      return res.status(400).json({ error: 'invalid_room_or_user', details: error.message });
    }

    if (BigInt(nonce) !== onChainNonce) {
      return res.status(400).json({
        error: 'nonce_mismatch',
        expected: onChainNonce.toString(),
        provided: nonce
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const deadlineNum = Number(deadline);
    if (deadlineNum < now || deadlineNum > now + 300) {
      return res.status(400).json({ error: 'invalid_deadline' });
    }

    const ended = await roomContract.ended();
    if (ended) {
      return res.status(400).json({ error: 'room_ended' });
    }

    const { v, r, s } = await req.app.locals.signatureService.signWebCall(
      roomAddress,
      user,
      method,
      methodHash,
      payloadHash,
      nonce,
      deadline
    );

    res.json({ v, r, s, nonce, deadline });
  } catch (error) {
    console.error('Signature error:', error);
    res.status(500).json({ error: 'signature_failed', message: error.message });
  }
});

// POST /api/payout - Execute payout from the authorized signer wallet.
router.post('/payout', async (req, res) => {
  try {
    const { roomAddress, winnerAddress, amount, finalizeAfter } = req.body;

    if (!roomAddress || !winnerAddress || !amount) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    if (!ethers.isAddress(roomAddress) || !ethers.isAddress(winnerAddress)) {
      return res.status(400).json({ error: 'invalid_address' });
    }

    if (!process.env.WEB_AUTH_PRIVATE_KEY) {
      return res.status(500).json({ error: 'missing_private_key' });
    }

    const wallet = new ethers.Wallet(process.env.WEB_AUTH_PRIVATE_KEY, provider);
    const room = new ethers.Contract(roomAddress, roomABI, wallet);

    const ended = await room.ended();
    if (ended) {
      return res.status(400).json({ error: 'room_ended' });
    }

    const authorizedSigner = await room.authorizedSigner();
    if (authorizedSigner.toLowerCase() !== wallet.address.toLowerCase()) {
      return res.status(403).json({
        error: 'unauthorized_signer',
        expected: authorizedSigner,
        actual: wallet.address
      });
    }

    const tokenAddress = await room.token();
    const token = new ethers.Contract(tokenAddress, tokenABI, provider);
    const roomBalance = await token.balanceOf(roomAddress);
    const amountWei = ethers.parseUnits(amount.toString(), 18);

    if (amountWei > roomBalance) {
      return res.status(400).json({
        error: 'insufficient_balance',
        required: ethers.formatUnits(amountWei, 18),
        available: ethers.formatUnits(roomBalance, 18)
      });
    }

    const nonce = await room.nonces(wallet.address);
    const deadline = Math.floor(Date.now() / 1000) + 180;

    const methodHash = ethers.id('payout(address,uint256,bool,address,uint256)');
    const payloadHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'bool', 'address', 'uint256'],
        [winnerAddress, amountWei, finalizeAfter || false, roomAddress, deadline]
      )
    );

    const { v, r, s } = await req.app.locals.signatureService.signWebCall(
      roomAddress,
      wallet.address,
      'payout',
      methodHash,
      payloadHash,
      nonce.toString(),
      deadline
    );

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

    const receipt = await tx.wait();

    const iface = new ethers.Interface(roomABI);
    const events = [];
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed.name === 'Payout' || parsed.name === 'Finalized') {
          const argsObj = {};
          for (const key in parsed.args) {
            const value = parsed.args[key];
            argsObj[key] = typeof value === 'bigint' ? value.toString() : value;
          }
          events.push({ name: parsed.name, args: argsObj });
        }
      } catch {}
    }

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
    console.error('Payout failed:', error);
    res.status(500).json({
      error: 'payout_failed',
      message: error.message,
      reason: error.reason || null
    });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
// const db = require('../config/database'); // 暂时注释掉数据库
const { ethers } = require('ethers');
const { provider } = require('../config/blockchain');

// POST /api/sign - Generate EIP-712 signature
router.post('/sign', async (req, res) => {
  try {
    const { roomAddress, user, method, methodHash, payloadHash, nonce, deadline } = req.body;

    // Validate required fields
    if (!roomAddress || !user || !method || !methodHash || !payloadHash || nonce === undefined || !deadline) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    // Validate addresses
    if (!ethers.isAddress(roomAddress) || !ethers.isAddress(user)) {
      return res.status(400).json({ error: 'invalid_address' });
    }

    // Validate method
    if (!['pay', 'payout', 'finalize'].includes(method)) {
      return res.status(400).json({ error: 'invalid_method' });
    }

    // Verify method hash matches
    const expectedMethodHash = req.app.locals.signatureService.getMethodHash(method);
    if (methodHash !== expectedMethodHash) {
      return res.status(400).json({ error: 'method_hash_mismatch', expected: expectedMethodHash });
    }

    // Get room contract to verify nonce
    const roomABI = require('../../../frontend/src/contracts/abis/MinimalRoom.json');
    const roomContract = new ethers.Contract(roomAddress, roomABI, provider);

    // Verify nonce matches on-chain state
    let onChainNonce;
    try {
      console.log('🔍 Checking nonce for:', { roomAddress, user });
      onChainNonce = await roomContract.nonces(user);
      console.log('✓ On-chain nonce:', onChainNonce.toString());
    } catch (error) {
      console.error('❌ Failed to read nonce from room contract:', error.message);
      console.error('   Room address:', roomAddress);
      console.error('   User address:', user);
      return res.status(400).json({ error: 'invalid_room_or_user', details: error.message });
    }

    if (BigInt(nonce) !== onChainNonce) {
      return res.status(400).json({
        error: 'nonce_mismatch',
        expected: onChainNonce.toString(),
        provided: nonce
      });
    }

    // Verify deadline is reasonable (between now and now + 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const deadlineNum = Number(deadline);
    if (deadlineNum < now || deadlineNum > now + 300) {
      return res.status(400).json({ error: 'invalid_deadline' });
    }

    // Check if room is ended
    const ended = await roomContract.ended();
    if (ended) {
      return res.status(400).json({ error: 'room_ended' });
    }

    // Generate signature
    const { v, r, s, signature } = await req.app.locals.signatureService.signWebCall(
      roomAddress,
      user,
      method,
      methodHash,
      payloadHash,
      nonce,
      deadline
    );

    // Store signature request in audit log (暂时禁用数据库)
    // await db.query(
    //   `INSERT INTO signature_requests (room_address, user_address, method, nonce, deadline, signature)
    //    VALUES ($1, $2, $3, $4, $5, $6)`,
    //   [roomAddress, user, method, nonce, deadline, signature]
    // );
    console.log('✓ Signature generated for:', { roomAddress, user, method });

    // Return signature components
    res.json({ v, r, s, nonce, deadline });

  } catch (error) {
    console.error('Signature error:', error);
    res.status(500).json({ error: 'signature_failed', message: error.message });
  }
});

module.exports = router;

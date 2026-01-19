const express = require('express');
const router = express.Router();
// const db = require('../config/database'); // 暂时注释掉数据库

// GET /api/rooms - List all rooms (暂时返回空数组)
router.get('/rooms', async (req, res) => {
  try {
    // 暂时返回空数组，实际使用时需要数据库
    console.log('⚠️ Database disabled - returning empty rooms list');
    res.json([]);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// GET /api/rooms/:address - Get room details (暂时返回基本信息)
router.get('/rooms/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // 暂时返回基本信息
    console.log('⚠️ Database disabled - returning minimal room info');
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

// GET /api/rooms/:address/bets - Get bets for a room (从链上读取事件)
router.get('/rooms/:address/bets', async (req, res) => {
  try {
    const { address } = req.params;
    const { ethers } = require('ethers');
    const { provider } = require('../config/blockchain');

    // Load room ABI
    const roomABI = require('../../../frontend/src/contracts/abis/MinimalRoom.json');
    const room = new ethers.Contract(address, roomABI, provider);

    // Query Paid events from the blockchain
    const filter = room.filters.Paid();
    const events = await room.queryFilter(filter);

    // Format events as bet records
    const bets = events.map((event, index) => ({
      id: index + 1,
      user_address: event.args.user,
      amount: event.args.amount.toString(),
      tx_hash: event.transactionHash,
      block_number: event.blockNumber,
      timestamp: null // 可以通过 getBlock 获取，但会增加RPC调用
    }));

    console.log(`✓ Loaded ${bets.length} bets from chain for room ${address}`);
    res.json(bets);
  } catch (error) {
    console.error('Error fetching bets from chain:', error);
    res.status(500).json({ error: 'fetch_failed', message: error.message });
  }
});

// GET /api/rooms/:address/payouts - Get payouts for a room (暂时返回空数组)
router.get('/rooms/:address/payouts', async (req, res) => {
  try {
    console.log('⚠️ Database disabled - returning empty payouts list');
    res.json([]);
  } catch (error) {
    console.error('Error fetching payouts:', error);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// GET /api/config - Get backend configuration (authorized signer address)
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

module.exports = router;

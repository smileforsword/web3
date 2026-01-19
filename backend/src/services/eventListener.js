const { ethers } = require('ethers');
const db = require('../config/database');

class EventListener {
  constructor(provider, factoryAddress, factoryABI, roomABI) {
    this.provider = provider;
    this.factoryAddress = factoryAddress;
    this.factoryABI = factoryABI;
    this.roomABI = roomABI;
    this.factory = new ethers.Contract(factoryAddress, factoryABI, provider);
    this.roomContracts = new Map();
  }

  async start() {
    console.log('Starting event listener...');
    console.log('Factory address:', this.factoryAddress);

    // Listen to Factory: RoomCreated events
    this.factory.on('RoomCreated', async (room, creator, token, signer, event) => {
      console.log('New room created:', room);

      try {
        await db.query(
          `INSERT INTO rooms (room_address, token_address, authorized_signer, creator_address, block_number, tx_hash)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (room_address) DO NOTHING`,
          [
            room.toLowerCase(),
            token.toLowerCase(),
            signer.toLowerCase(),
            creator.toLowerCase(),
            event.log.blockNumber,
            event.log.transactionHash
          ]
        );

        // Start listening to this room's events
        this.subscribeToRoom(room);
      } catch (error) {
        console.error('Error saving room to database:', error);
      }
    });

    // Load existing rooms and subscribe to their events
    const existingRooms = await db.query(
      `SELECT room_address FROM rooms WHERE status = 'open'`
    );

    for (const row of existingRooms.rows) {
      this.subscribeToRoom(row.room_address);
    }

    console.log(`Event listener started. Subscribed to ${existingRooms.rows.length} existing rooms.`);
  }

  subscribeToRoom(roomAddress) {
    if (this.roomContracts.has(roomAddress.toLowerCase())) {
      return; // Already subscribed
    }

    const room = new ethers.Contract(roomAddress, this.roomABI, this.provider);

    // Listen: Paid event
    room.on('Paid', async (user, amount, event) => {
      console.log(`Paid event in room ${roomAddress}:`, user, amount.toString());

      try {
        await db.query(
          `INSERT INTO bets (room_address, user_address, amount, tx_hash, block_number, block_time)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (tx_hash) DO NOTHING`,
          [
            roomAddress.toLowerCase(),
            user.toLowerCase(),
            amount.toString(),
            event.log.transactionHash,
            event.log.blockNumber
          ]
        );
      } catch (error) {
        console.error('Error saving bet to database:', error);
      }
    });

    // Listen: Payout event
    room.on('Payout', async (to, amount, finalized, event) => {
      console.log(`Payout event in room ${roomAddress}:`, to, amount.toString(), finalized);

      try {
        await db.query(
          `INSERT INTO payouts (room_address, to_address, amount, finalized, tx_hash, block_number, block_time)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (tx_hash) DO NOTHING`,
          [
            roomAddress.toLowerCase(),
            to.toLowerCase(),
            amount.toString(),
            finalized,
            event.log.transactionHash,
            event.log.blockNumber
          ]
        );

        if (finalized) {
          await db.query(
            `UPDATE rooms SET status = 'ended' WHERE room_address = $1`,
            [roomAddress.toLowerCase()]
          );
        }
      } catch (error) {
        console.error('Error saving payout to database:', error);
      }
    });

    // Listen: Finalized event
    room.on('Finalized', async (by, event) => {
      console.log(`Finalized event in room ${roomAddress}:`, by);

      try {
        await db.query(
          `UPDATE rooms SET status = 'ended' WHERE room_address = $1`,
          [roomAddress.toLowerCase()]
        );
      } catch (error) {
        console.error('Error updating room status:', error);
      }
    });

    this.roomContracts.set(roomAddress.toLowerCase(), room);
    console.log(`Subscribed to room events: ${roomAddress}`);
  }

  stop() {
    console.log('Stopping event listener...');
    // Remove all listeners
    this.factory.removeAllListeners();
    for (const room of this.roomContracts.values()) {
      room.removeAllListeners();
    }
    this.roomContracts.clear();
    console.log('Event listener stopped.');
  }
}

module.exports = EventListener;

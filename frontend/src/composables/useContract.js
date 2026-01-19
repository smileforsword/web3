import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import FactoryABI from '../contracts/abis/Factory.json';
import RoomABI from '../contracts/abis/MinimalRoom.json';
import ERC20ABI from '../contracts/abis/ERC20.json';
import { FACTORY_ADDRESS, TOKEN_ADDRESS } from '../contracts/addresses';

export function useContract() {
  const wallet = useWallet();

  // Create a new betting room
  async function createRoom(creatorAddress) {
    const signer = wallet.getSigner();
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    // Get backend authorized signer address
    const response = await fetch('/api/config');
    const { authorizedSigner } = await response.json();

    const factory = new ethers.Contract(FACTORY_ADDRESS, FactoryABI, signer);

    // Call createRoom
    const tx = await factory.createRoom(
      TOKEN_ADDRESS,
      authorizedSigner,
      creatorAddress
    );

    const receipt = await tx.wait();

    console.log('Transaction receipt:', receipt);
    console.log('Logs count:', receipt.logs.length);

    // Parse RoomCreated event
    const iface = new ethers.Interface(FactoryABI);
    let roomAddress = null;

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({
          topics: log.topics,
          data: log.data
        });
        if (parsed && parsed.name === 'RoomCreated') {
          roomAddress = parsed.args.room;
          break;
        }
      } catch (e) {
        // Log might not be from our contract
      }
    }

    if (!roomAddress) {
      throw new Error('Room address not found in transaction receipt');
    }

    return roomAddress;
  }

  // Place a bet (pay function)
  async function placeBet(roomAddress, userAddress, amount) {
    const signer = wallet.getSigner();
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    const room = new ethers.Contract(roomAddress, RoomABI, signer);
    const erc20 = new ethers.Contract(TOKEN_ADDRESS, ERC20ABI, signer);

    // Step 1: Check current allowance
    const currentAllowance = await erc20.allowance(userAddress, roomAddress);
    if (currentAllowance < amount) {
      // Need to approve
      console.log('Approving tokens...');
      const approveTx = await erc20.approve(roomAddress, amount);
      await approveTx.wait();
      console.log('Tokens approved');
    }

    // Step 2: Get current nonce from contract
    const nonce = await room.nonces(userAddress);

    // Step 3: Calculate hashes
    const methodHash = ethers.id('pay(address,uint256,uint256)');
    const payloadHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'address'],
        [userAddress, amount, roomAddress]
      )
    );

    // Step 4: Request signature from backend
    const deadline = Math.floor(Date.now() / 1000) + 180;
    const sigResponse = await fetch('/api/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomAddress,
        user: userAddress,
        method: 'pay',
        methodHash,
        payloadHash,
        nonce: nonce.toString(),
        deadline
      })
    });

    if (!sigResponse.ok) {
      const error = await sigResponse.json();
      throw new Error(error.error || 'Signature request failed');
    }

    const { v, r, s } = await sigResponse.json();

    // Step 5: Call room.pay()
    console.log('Submitting bet transaction...');
    const payTx = await room.pay(userAddress, amount, deadline, v, r, s);
    const payReceipt = await payTx.wait();

    return payReceipt;
  }

  // Get room status
  async function getRoomStatus(roomAddress) {
    const provider = wallet.getProvider();
    if (!provider) {
      throw new Error('Provider not initialized');
    }

    const room = new ethers.Contract(roomAddress, RoomABI, provider);
    const ended = await room.ended();
    return { ended };
  }

  // Get user nonce
  async function getUserNonce(roomAddress, userAddress) {
    const provider = wallet.getProvider();
    if (!provider) {
      throw new Error('Provider not initialized');
    }

    const room = new ethers.Contract(roomAddress, RoomABI, provider);
    const nonce = await room.nonces(userAddress);
    return nonce;
  }

  // Get token balance
  async function getTokenBalance(userAddress) {
    const provider = wallet.getProvider();
    if (!provider) {
      throw new Error('Provider not initialized');
    }

    const erc20 = new ethers.Contract(TOKEN_ADDRESS, ERC20ABI, provider);
    const balance = await erc20.balanceOf(userAddress);
    return balance;
  }

  return {
    createRoom,
    placeBet,
    getRoomStatus,
    getUserNonce,
    getTokenBalance
  };
}

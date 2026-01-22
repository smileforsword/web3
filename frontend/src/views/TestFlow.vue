<template>
  <div class="test-flow">
    <div class="card">
      <h1>Testnet End-to-End Demo</h1>
      <p class="intro">
        This single page demonstrates the full flow on opBNB Testnet: connect wallet,
        create a room, place a bet, and trigger a payout.
      </p>

      <!-- Connection and network gate. -->
      <div v-if="!isConnected" class="alert alert-warning">
        Wallet not connected. Connect to continue.
      </div>
      <div v-else-if="!isCorrectNetwork" class="alert alert-error">
        Wrong network. Please switch to opBNB Testnet (chainId 5611).
      </div>

      <!-- Step 1: Connect wallet. -->
      <section class="flow-section">
        <h2>1) Connect Wallet</h2>
        <p class="muted">
          The demo uses MetaMask or another injected wallet. This step initializes
          the provider and signer used by the contract calls.
        </p>
        <button
          class="btn btn-primary"
          style="width: 100%;"
          @click="handleConnect"
          :disabled="connecting || isConnected"
        >
          {{ isConnected ? 'Connected' : (connecting ? 'Connecting...' : 'Connect Wallet') }}
        </button>
        <div v-if="account" class="mt-1">
          <strong>Account:</strong>
          <span class="mono">{{ account }}</span>
        </div>
      </section>

      <!-- Step 2: Provide authorized signer key (local-only). -->
      <section class="flow-section">
        <h2>2) Authorized Signer (Local)</h2>
        <p class="muted">
          This demo signs locally instead of calling the backend. Paste the authorized
          signer private key here. Use only a testnet key and never a mainnet key.
        </p>
        <input
          v-model="authorizedSignerKey"
          type="password"
          placeholder="Authorized signer private key (0x...)"
        />
        <div v-if="authorizedSignerAddress" class="alert alert-success mt-1">
          <strong>Authorized Signer Address:</strong>
          <span class="mono">{{ authorizedSignerAddress }}</span>
        </div>
        <div v-if="authorizedSignerError" class="alert alert-error mt-1">
          <strong>Error:</strong> {{ authorizedSignerError }}
        </div>
      </section>

      <!-- Step 3: Create a room on the testnet. -->
      <section class="flow-section">
        <h2>3) Create Room</h2>
        <p class="muted">
          This calls the factory contract to deploy a new room using the authorized
          signer address derived from the private key above.
        </p>
        <button
          class="btn btn-primary"
          style="width: 100%;"
          @click="handleCreateRoom"
          :disabled="!canCreateRoom || creatingRoom"
        >
          {{ creatingRoom ? 'Creating Room...' : 'Create Room on Testnet' }}
        </button>
        <div v-if="roomAddress" class="alert alert-success mt-1">
          <strong>Room Address:</strong>
          <a
            :href="`https://opbnb-testnet.bscscan.com/address/${roomAddress}`"
            target="_blank"
            style="color: #155724; text-decoration: underline;"
          >
            {{ roomAddress }}
          </a>
        </div>
        <div v-if="createRoomError" class="alert alert-error mt-1">
          <strong>Error:</strong> {{ createRoomError }}
        </div>
      </section>

      <!-- Step 4: Place a bet (pay). -->
      <section class="flow-section">
        <h2>4) Place Bet</h2>
        <p class="muted">
          The pay flow includes ERC20 approval (if needed), local EIP-712 signature,
          and then the room.pay() transaction.
        </p>
        <div class="balance-box" v-if="tokenBalanceDisplay">
          <strong>Token Balance:</strong> {{ tokenBalanceDisplay }} BLD8
        </div>
        <input
          v-model="betAmount"
          type="number"
          min="0"
          step="0.01"
          placeholder="Bet amount (in tokens)"
        />
        <button
          class="btn btn-primary"
          style="width: 100%;"
          @click="handlePlaceBet"
          :disabled="!canBet || placingBet"
        >
          {{ placingBet ? 'Placing Bet...' : 'Place Bet' }}
        </button>
        <div v-if="betTxHash" class="alert alert-success mt-1">
          <strong>Bet Tx:</strong>
          <a
            :href="`https://opbnb-testnet.bscscan.com/tx/${betTxHash}`"
            target="_blank"
            style="color: #155724; text-decoration: underline;"
          >
            {{ betTxHash.substring(0, 12) }}...{{ betTxHash.substring(betTxHash.length - 8) }}
          </a>
        </div>
        <div v-if="placeBetError" class="alert alert-error mt-1">
          <strong>Error:</strong> {{ placeBetError }}
        </div>
      </section>

      <!-- Step 5: Payout (admin action). -->
      <section class="flow-section">
        <h2>5) Payout</h2>
        <p class="muted">
          This step signs locally with the authorized signer key and submits the
          payout transaction directly to the chain.
        </p>
        <div class="balance-box" v-if="payoutChecksReady">
          <div><strong>Room Ended:</strong> {{ roomEnded ? 'Yes' : 'No' }}</div>
          <div><strong>Room Token Balance:</strong> {{ roomTokenBalanceDisplay }} BLD8</div>
          <div><strong>On-chain Authorized Signer:</strong> <span class="mono">{{ authorizedSignerOnChain }}</span></div>
          <div><strong>Admin Gas Balance:</strong> {{ adminGasBalanceDisplay }} tBNB</div>
        </div>
        <button class="btn btn-secondary mb-1" style="width: 100%;" @click="refreshPayoutChecks" :disabled="!canInteract || !roomAddress">
          Refresh Payout Checks
        </button>
        <input
          v-model="payoutWinner"
          type="text"
          placeholder="Winner address (0x...)"
          style="font-family: monospace;"
        />
        <input
          v-model="payoutAmount"
          type="number"
          min="0"
          step="0.00001"
          placeholder="Payout amount (tokens)"
        />
        <label class="checkbox-row">
          <input type="checkbox" v-model="payoutFinalize" />
          Finalize room after payout
        </label>
        <button
          class="btn btn-primary"
          style="width: 100%;"
          @click="handlePayout"
          :disabled="!canPayout || payingOut"
        >
          {{ payingOut ? 'Submitting Payout...' : 'Execute Payout' }}
        </button>
        <div v-if="payoutResult" class="alert alert-success mt-1">
          <strong>Payout Tx:</strong>
          <a
            :href="`https://opbnb-testnet.bscscan.com/tx/${payoutResult.txHash}`"
            target="_blank"
            style="color: #155724; text-decoration: underline;"
          >
            {{ payoutResult.txHash.substring(0, 12) }}...{{ payoutResult.txHash.substring(payoutResult.txHash.length - 8) }}
          </a>
        </div>
        <div v-if="payoutError" class="alert alert-error mt-1">
          <strong>Error:</strong> {{ payoutError }}
        </div>
      </section>

      <!-- Simple run log for troubleshooting. -->
      <section class="flow-section">
        <h2>Run Log</h2>
        <div v-if="logs.length === 0" class="muted">No actions yet.</div>
        <ul v-else class="log-list">
          <li v-for="(entry, index) in logs" :key="index">
            <span class="mono">{{ entry.time }}</span> - {{ entry.message }}
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ethers } from 'ethers';
import { useWallet } from '../composables/useWallet';
import { useContract } from '../composables/useContract';
import FactoryABI from '../contracts/abis/Factory.json';
import RoomABI from '../contracts/abis/MinimalRoom.json';
import ERC20ABI from '../contracts/abis/ERC20.json';
import { FACTORY_ADDRESS, TOKEN_ADDRESS, OPBNB_TESTNET_CHAIN_ID } from '../contracts/addresses';

const { account, isConnected, isCorrectNetwork, connectWallet, getProvider, getSigner } = useWallet();
const { getTokenBalance, getRoomStatus } = useContract();

// Basic flow state for the demo UI.
const connecting = ref(false);
const creatingRoom = ref(false);
const placingBet = ref(false);
const payingOut = ref(false);

// Inputs and outputs for each step.
const roomAddress = ref('');
const betAmount = ref('');
const betTxHash = ref('');
const tokenBalance = ref(null);
const authorizedSignerKey = ref('');
const authorizedSignerError = ref('');
const payoutWinner = ref('');
const payoutAmount = ref('');
const payoutFinalize = ref(false);
const roomTokenBalance = ref(null);
const roomEnded = ref(false);
const authorizedSignerOnChain = ref('');
const adminGasBalance = ref(null);
const payoutChecksReady = ref(false);

// Error buckets keep each step isolated.
const createRoomError = ref('');
const placeBetError = ref('');
const payoutError = ref('');

// Simple log list to show the flow progression.
const logs = ref([]);

// Payout response payload (includes txHash and flags from backend).
const payoutResult = ref(null);

const canInteract = computed(() => isConnected.value && isCorrectNetwork.value);
const authorizedSignerAddress = computed(() => {
  if (!authorizedSignerKey.value) return '';
  try {
    return new ethers.Wallet(authorizedSignerKey.value).address;
  } catch (error) {
    return '';
  }
});

const canCreateRoom = computed(() => canInteract.value && authorizedSignerAddress.value);
const canBet = computed(() => canInteract.value && roomAddress.value && Number(betAmount.value) > 0 && authorizedSignerAddress.value);
const canPayout = computed(() => canInteract.value && roomAddress.value && payoutWinner.value && Number(payoutAmount.value) > 0 && authorizedSignerAddress.value);

const tokenBalanceDisplay = computed(() => {
  if (tokenBalance.value === null) return '';
  try {
    return ethers.formatUnits(tokenBalance.value, 18);
  } catch (error) {
    return String(tokenBalance.value);
  }
});

const roomTokenBalanceDisplay = computed(() => {
  if (roomTokenBalance.value === null) return '';
  try {
    return ethers.formatUnits(roomTokenBalance.value, 18);
  } catch (error) {
    return String(roomTokenBalance.value);
  }
});

const adminGasBalanceDisplay = computed(() => {
  if (adminGasBalance.value === null) return '';
  try {
    return ethers.formatEther(adminGasBalance.value);
  } catch (error) {
    return String(adminGasBalance.value);
  }
});

watch(account, () => {
  if (account.value) {
    payoutWinner.value = account.value;
    refreshTokenBalance();
  } else {
    payoutWinner.value = '';
    tokenBalance.value = null;
  }
});

watch(authorizedSignerKey, () => {
  if (!authorizedSignerKey.value) {
    authorizedSignerError.value = '';
    return;
  }
  try {
    authorizedSignerError.value = '';
    new ethers.Wallet(authorizedSignerKey.value);
  } catch (error) {
    authorizedSignerError.value = 'Invalid private key';
  }
});

watch([roomAddress, authorizedSignerKey], () => {
  payoutChecksReady.value = false;
});

async function handleConnect() {
  try {
    connecting.value = true;
    addLog('Connecting wallet');
    await connectWallet();
    addLog('Wallet connected');
  } catch (error) {
    addLog(`Wallet connect failed: ${error.message || error}`);
  } finally {
    connecting.value = false;
  }
}

async function handleCreateRoom() {
  try {
    creatingRoom.value = true;
    createRoomError.value = '';
    betTxHash.value = '';

    addLog('Creating room via factory contract');
    const signer = getSigner();
    if (!signer) {
      throw new Error('Wallet not connected');
    }
    if (!authorizedSignerAddress.value) {
      throw new Error('Authorized signer key is missing');
    }

    const factory = new ethers.Contract(FACTORY_ADDRESS, FactoryABI, signer);
    const tx = await factory.createRoom(
      TOKEN_ADDRESS,
      authorizedSignerAddress.value,
      account.value
    );
    const receipt = await tx.wait();

    const iface = new ethers.Interface(FactoryABI);
    let newRoom = '';
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        if (parsed && parsed.name === 'RoomCreated') {
          newRoom = parsed.args.room;
          break;
        }
      } catch {}
    }

    if (!newRoom) {
      throw new Error('Room address not found in transaction receipt');
    }

    roomAddress.value = newRoom;

    addLog(`Room created: ${newRoom}`);
    await refreshTokenBalance();
  } catch (error) {
    createRoomError.value = normalizeError(error, 'Failed to create room');
    addLog(`Create room failed: ${createRoomError.value}`);
  } finally {
    creatingRoom.value = false;
  }
}

async function handlePlaceBet() {
  try {
    placingBet.value = true;
    placeBetError.value = '';
    betTxHash.value = '';

    const amount = ethers.parseUnits(String(betAmount.value), 18);
    addLog(`Placing bet: ${betAmount.value} tokens`);
    const signer = getSigner();
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    if (!authorizedSignerKey.value) {
      throw new Error('Authorized signer key is missing');
    }

    const room = new ethers.Contract(roomAddress.value, RoomABI, signer);
    const erc20 = new ethers.Contract(TOKEN_ADDRESS, ERC20ABI, signer);

    const allowance = await erc20.allowance(account.value, roomAddress.value);
    if (allowance < amount) {
      addLog('Approving tokens');
      const approveTx = await erc20.approve(roomAddress.value, amount);
      await approveTx.wait();
    }

    const nonce = await room.nonces(account.value);
    const deadline = Math.floor(Date.now() / 1000) + 180;

    const methodHash = ethers.id('pay(address,uint256,uint256)');
    const payloadHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'address'],
        [account.value, amount, roomAddress.value]
      )
    );

    const { v, r, s } = await signWebCall({
      roomAddress: roomAddress.value,
      user: account.value,
      methodHash,
      payloadHash,
      nonce: nonce.toString(),
      deadline
    });

    const tx = await room.pay(account.value, amount, deadline, v, r, s);
    const receipt = await tx.wait();
    betTxHash.value = tx.hash;
    betAmount.value = '';

    addLog(`Bet submitted: ${tx.hash}`);
    await refreshTokenBalance();
    await refreshRoomStatus();
  } catch (error) {
    placeBetError.value = normalizeError(error, 'Failed to place bet');
    addLog(`Place bet failed: ${placeBetError.value}`);
  } finally {
    placingBet.value = false;
  }
}

async function handlePayout() {
  try {
    payingOut.value = true;
    payoutError.value = '';
    payoutResult.value = null;

    if (!authorizedSignerKey.value) {
      throw new Error('Authorized signer key is missing');
    }

    await refreshPayoutChecks();
    if (roomEnded.value) {
      throw new Error('Room already ended');
    }
    if (authorizedSignerOnChain.value && authorizedSignerOnChain.value.toLowerCase() !== authorizedSignerAddress.value.toLowerCase()) {
      throw new Error('Authorized signer does not match room');
    }
    if (roomTokenBalance.value !== null) {
      const amountWei = ethers.parseUnits(payoutAmount.value.toString(), 18);
      if (amountWei > roomTokenBalance.value) {
        throw new Error('Room token balance is insufficient for this payout');
      }
    }

    const provider = await getFallbackProvider();
    const adminWallet = new ethers.Wallet(authorizedSignerKey.value, provider);
    const room = new ethers.Contract(roomAddress.value, RoomABI, adminWallet);

    const amountWei = ethers.parseUnits(payoutAmount.value.toString(), 18);
    const deadline = Math.floor(Date.now() / 1000) + 180;

    const methodHash = ethers.id('payout(address,uint256,bool,address,uint256)');
    const payloadHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'bool', 'address', 'uint256'],
        [payoutWinner.value, amountWei, payoutFinalize.value, roomAddress.value, deadline]
      )
    );

    const nonce = await room.nonces(adminWallet.address);
    const { v, r, s } = await signWebCall({
      roomAddress: roomAddress.value,
      user: adminWallet.address,
      methodHash,
      payloadHash,
      nonce: nonce.toString(),
      deadline
    });

    addLog('Submitting payout transaction');
    const tx = await room.payout(
      payoutWinner.value,
      amountWei,
      payoutFinalize.value,
      adminWallet.address,
      deadline,
      v,
      r,
      s
    );
    const receipt = await tx.wait();

    payoutResult.value = {
      txHash: tx.hash,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: receipt.gasUsed.toString(),
      winner: payoutWinner.value,
      amount: payoutAmount.value,
      finalized: payoutFinalize.value
    };
    addLog(`Payout submitted: ${tx.hash}`);

    payoutAmount.value = '';
    payoutFinalize.value = false;
    await refreshRoomStatus();
  } catch (error) {
    payoutError.value = normalizeError(error, 'Failed to execute payout');
    addLog(`Payout failed: ${payoutError.value}`);
  } finally {
    payingOut.value = false;
  }
}

async function refreshTokenBalance() {
  if (!account.value) return;
  try {
    tokenBalance.value = await getTokenBalance(account.value);
  } catch (error) {
    addLog(`Token balance error: ${error.message || error}`);
  }
}

async function refreshRoomStatus() {
  if (!roomAddress.value) return;
  try {
    const status = await getRoomStatus(roomAddress.value);
    if (status.ended) {
      addLog('Room marked as ended');
    }
  } catch (error) {
    addLog(`Room status error: ${error.message || error}`);
  }
}

async function refreshPayoutChecks() {
  if (!roomAddress.value || !authorizedSignerAddress.value) return;
  try {
    payoutChecksReady.value = false;
    const provider = await getFallbackProvider();
    const room = new ethers.Contract(roomAddress.value, RoomABI, provider);

    const [ended, signerAddr, tokenAddr] = await Promise.all([
      room.ended(),
      room.authorizedSigner(),
      room.token()
    ]);

    roomEnded.value = ended;
    authorizedSignerOnChain.value = signerAddr;

    const token = new ethers.Contract(tokenAddr || TOKEN_ADDRESS, ERC20ABI, provider);
    roomTokenBalance.value = await token.balanceOf(roomAddress.value);

    if (authorizedSignerKey.value) {
      const adminWallet = new ethers.Wallet(authorizedSignerKey.value, provider);
      adminGasBalance.value = await provider.getBalance(adminWallet.address);
    } else {
      adminGasBalance.value = null;
    }

    payoutChecksReady.value = true;
  } catch (error) {
    addLog(`Payout checks error: ${error.message || error}`);
    payoutChecksReady.value = false;
  }
}

async function signWebCall({ roomAddress, user, methodHash, payloadHash, nonce, deadline }) {
  const domain = {
    name: 'blood8-room',
    version: '1',
    chainId: OPBNB_TESTNET_CHAIN_ID,
    verifyingContract: roomAddress
  };

  const types = {
    WebCall: [
      { name: 'user', type: 'address' },
      { name: 'methodHash', type: 'bytes32' },
      { name: 'payloadHash', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' }
    ]
  };

  const value = {
    user,
    methodHash,
    payloadHash,
    nonce: BigInt(nonce),
    deadline: BigInt(deadline)
  };

  const signer = new ethers.Wallet(authorizedSignerKey.value);
  const signature = await signer.signTypedData(domain, types, value);

  const bytes = ethers.getBytes(signature);
  const r = ethers.hexlify(bytes.slice(0, 32));
  const s = ethers.hexlify(bytes.slice(32, 64));
  const v = bytes[64] < 27 ? bytes[64] + 27 : bytes[64];

  return { v, r, s };
}

async function getFallbackProvider() {
  const provider = getProvider();
  if (provider) return provider;
  return new ethers.JsonRpcProvider('https://opbnb-testnet-rpc.bnbchain.org');
}

function addLog(message) {
  const time = new Date().toLocaleTimeString();
  logs.value.unshift({ time, message });
}

function normalizeError(error, fallback) {
  if (!error) return fallback;
  if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
    return 'Transaction cancelled by user';
  }
  return error.message || fallback;
}
</script>

<style scoped>
.test-flow {
  max-width: 900px;
  margin: 0 auto;
}

.intro {
  color: #666;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.flow-section {
  border-top: 1px solid #eee;
  padding-top: 1.5rem;
  margin-top: 1.5rem;
}

.flow-section h2 {
  margin-bottom: 0.75rem;
  color: #333;
}

.muted {
  color: #666;
  margin-bottom: 1rem;
}

.mono {
  font-family: monospace;
  color: #333;
}

.balance-box {
  background: #f5f5f5;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.log-list {
  list-style: none;
  padding-left: 0;
  margin: 0;
}

.log-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}
</style>

<template>
  <div class="room-detail">
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
        <div>
          <h1>Betting Room</h1>
          <p style="font-family: monospace; color: #666; word-break: break-all;">
            {{ roomAddress }}
          </p>
        </div>
        <a :href="`https://opbnb-testnet.bscscan.com/address/${roomAddress}`" target="_blank" class="btn btn-secondary">
          View on BSCScan
        </a>
      </div>

      <div v-if="roomStatus.ended" class="alert alert-warning">
        ⚠️ This room has ended. No more bets can be placed.
      </div>

      <div v-if="!isConnected" class="alert alert-warning">
        Please connect your wallet to interact with this room
      </div>

      <div v-else-if="!roomStatus.ended" class="betting-section">
        <h2>Place Bet</h2>

        <div v-if="tokenBalance !== null" class="balance-info">
          <p>Your Token Balance: {{ formatBalance(tokenBalance) }} BLD8</p>
        </div>

        <input
          v-model="betAmount"
          type="number"
          placeholder="Bet amount (in tokens)"
          min="0"
          step="0.01"
        />

        <button
          @click="handlePlaceBet"
          class="btn btn-primary"
          :disabled="loading || !betAmount || Number(betAmount) <= 0"
          style="width: 100%;"
        >
          {{ loading ? 'Processing...' : 'Place Bet' }}
        </button>

        <div v-if="loading" class="alert alert-info mt-1">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="loading"></div>
            <span>{{ loadingMessage }}</span>
          </div>
        </div>

        <div v-if="txHash" class="alert alert-success mt-1">
          <h3>Bet Placed Successfully! 🎉</h3>
          <p style="margin: 0.5rem 0;">
            <strong>Transaction:</strong>
            <a :href="`https://opbnb-testnet.bscscan.com/tx/${txHash}`" target="_blank" style="color: #155724; text-decoration: underline;">
              {{ txHash.substring(0, 10) }}...{{ txHash.substring(txHash.length - 8) }}
            </a>
          </p>
        </div>

        <div v-if="error" class="alert alert-error mt-1">
          <strong>Error:</strong> {{ error }}
        </div>
      </div>
    </div>

    <!-- Admin Payout Section -->
    <div class="card mt-2 admin-section">
      <h3>🔧 管理员功能 (测试)</h3>
      <button @click="showPayoutForm = !showPayoutForm" class="btn btn-secondary" style="width: 100%; margin-bottom: 1rem;">
        {{ showPayoutForm ? '隐藏打款表单' : '显示打款表单' }}
      </button>

      <div v-if="showPayoutForm" class="payout-form">
        <h4>发送奖金给赢家</h4>

        <div class="form-group">
          <label>赢家地址:</label>
          <input
            v-model="payoutWinner"
            type="text"
            placeholder="0x..."
            style="font-family: monospace;"
          />
        </div>

        <div class="form-group">
          <label>打款金额 (tokens):</label>
          <input
            v-model="payoutAmount"
            type="number"
            placeholder="0.00001"
            min="0"
            step="0.00001"
          />
        </div>

        <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem;">
          <input
            v-model="payoutFinalize"
            type="checkbox"
            id="finalize-checkbox"
          />
          <label for="finalize-checkbox" style="margin: 0;">发送后结束房间</label>
        </div>

        <button
          @click="handlePayout"
          class="btn btn-primary"
          :disabled="payoutLoading || !payoutWinner || !payoutAmount"
          style="width: 100%;"
        >
          {{ payoutLoading ? '处理中...' : '发送奖金' }}
        </button>

        <div v-if="payoutLoading" class="alert alert-info mt-1">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="loading"></div>
            <span>{{ payoutMessage }}</span>
          </div>
        </div>

        <div v-if="payoutSuccess" class="alert alert-success mt-1">
          <h4>✅ 打款成功!</h4>
          <p style="margin: 0.5rem 0;">
            <strong>赢家:</strong> {{ formatAddress(payoutSuccess.winner) }}
          </p>
          <p style="margin: 0.5rem 0;">
            <strong>金额:</strong> {{ payoutSuccess.amount }} tokens
          </p>
          <p style="margin: 0.5rem 0;">
            <strong>交易:</strong>
            <a :href="`https://opbnb-testnet.bscscan.com/tx/${payoutSuccess.txHash}`" target="_blank" style="color: #155724; text-decoration: underline;">
              {{ payoutSuccess.txHash.substring(0, 10) }}...{{ payoutSuccess.txHash.substring(payoutSuccess.txHash.length - 8) }}
            </a>
          </p>
          <p v-if="payoutSuccess.finalized" style="margin: 0.5rem 0; font-weight: bold;">
            🏁 房间已结束
          </p>
        </div>

        <div v-if="payoutError" class="alert alert-error mt-1">
          <strong>错误:</strong> {{ payoutError }}
        </div>
      </div>
    </div>

    <div class="card mt-2">
      <h2>Bets History</h2>

      <div v-if="loadingBets" class="text-center">
        <div class="loading"></div>
        <p>Loading bets...</p>
      </div>

      <div v-else-if="bets.length === 0" class="text-center" style="color: #666;">
        No bets placed yet
      </div>

      <table v-else class="bets-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Amount</th>
            <th>Transaction</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bet in bets" :key="bet.id">
            <td style="font-family: monospace;">{{ formatAddress(bet.user_address) }}</td>
            <td>{{ formatBalance(bet.amount) }} BLD8</td>
            <td>
              <a :href="`https://opbnb-testnet.bscscan.com/tx/${bet.tx_hash}`" target="_blank" style="color: #667eea;">
                {{ bet.tx_hash ? bet.tx_hash.substring(0, 10) + '...' : 'N/A' }}
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useWallet } from '../composables/useWallet';
import { useContract } from '../composables/useContract';
import { api } from '../services/api';
import { ethers } from 'ethers';

const route = useRoute();
const roomAddress = route.params.address;

const { account, isConnected } = useWallet();
const { placeBet, getRoomStatus, getTokenBalance } = useContract();

const betAmount = ref('');
const loading = ref(false);
const loadingMessage = ref('');
const error = ref(null);
const txHash = ref(null);
const roomStatus = ref({ ended: false });
const bets = ref([]);
const loadingBets = ref(true);
const tokenBalance = ref(null);

// Payout state
const showPayoutForm = ref(false);
const payoutWinner = ref('');
const payoutAmount = ref('');
const payoutFinalize = ref(false);
const payoutLoading = ref(false);
const payoutMessage = ref('');
const payoutSuccess = ref(null);
const payoutError = ref(null);

onMounted(async () => {
  await loadRoomStatus();
  await loadBets();
  if (isConnected.value && account.value) {
    await loadTokenBalance();
  }
});

async function loadRoomStatus() {
  try {
    roomStatus.value = await getRoomStatus(roomAddress);
  } catch (err) {
    console.error('Error loading room status:', err);
  }
}

async function loadBets() {
  try {
    loadingBets.value = true;
    bets.value = await api.getRoomBets(roomAddress);
  } catch (err) {
    console.error('Error loading bets:', err);
  } finally {
    loadingBets.value = false;
  }
}

async function loadTokenBalance() {
  try {
    const balance = await getTokenBalance(account.value);
    tokenBalance.value = balance;
  } catch (err) {
    console.error('Error loading token balance:', err);
  }
}

async function handlePlaceBet() {
  try {
    loading.value = true;
    error.value = null;
    txHash.value = null;

    // Convert to string to ensure ethers.parseUnits works correctly
    const amount = ethers.parseUnits(String(betAmount.value), 18);

    loadingMessage.value = 'Approving tokens...';
    // The placeBet function handles approval internally

    loadingMessage.value = 'Requesting signature from backend...';
    // Backend signature request happens in placeBet

    loadingMessage.value = 'Submitting bet transaction...';
    const receipt = await placeBet(roomAddress, account.value, amount);

    txHash.value = receipt.hash;
    betAmount.value = '';

    // Reload bets and balance
    setTimeout(() => {
      loadBets();
      loadTokenBalance();
    }, 2000);

  } catch (err) {
    // Handle user rejection
    if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
      error.value = 'Transaction cancelled by user';
      console.log('User cancelled transaction');
    } else {
      error.value = err.message || 'Failed to place bet';
      console.error('Error placing bet:', err);
    }
  } finally {
    loading.value = false;
    loadingMessage.value = '';
  }
}

function formatAddress(address) {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(38)}`;
}

function formatBalance(balance) {
  if (!balance) return '0';
  try {
    return ethers.formatUnits(balance, 18);
  } catch {
    return balance;
  }
}

async function handlePayout() {
  try {
    payoutLoading.value = true;
    payoutError.value = null;
    payoutSuccess.value = null;
    payoutMessage.value = '生成签名并发送交易...';

    const response = await fetch('/api/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomAddress: roomAddress,
        winnerAddress: payoutWinner.value,
        amount: payoutAmount.value,
        finalizeAfter: payoutFinalize.value
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Payout failed');
    }

    const result = await response.json();
    payoutSuccess.value = result;

    // Clear form
    payoutWinner.value = '';
    payoutAmount.value = '';
    payoutFinalize.value = false;

    // Reload room status and bets
    setTimeout(() => {
      loadRoomStatus();
      loadBets();
    }, 2000);

  } catch (err) {
    payoutError.value = err.message || 'Failed to execute payout';
    console.error('Payout error:', err);
  } finally {
    payoutLoading.value = false;
    payoutMessage.value = '';
  }
}
</script>

<style scoped>
.room-detail {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #333;
  margin-bottom: 0.5rem;
}

h2 {
  color: #333;
  margin-bottom: 1rem;
}

.betting-section {
  margin-top: 2rem;
}

.balance-info {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.balance-info p {
  margin: 0;
  font-weight: 600;
  color: #333;
}

.bets-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.bets-table th {
  background: #f5f5f5;
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #e0e0e0;
}

.bets-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
}

.bets-table tr:hover {
  background: #f9f9f9;
}

.admin-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #fff9e6;
  border: 2px dashed #ffa500;
  border-radius: 8px;
}

.admin-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #ff8c00;
}

.admin-section h4 {
  margin-bottom: 1rem;
  color: #333;
}

.payout-form {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.form-group input[type="text"],
.form-group input[type="number"] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input[type="checkbox"] {
  width: auto;
  margin-right: 0.5rem;
}
</style>

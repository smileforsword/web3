<template>
  <div class="wallet-connect">
    <div v-if="!isConnected">
      <button @click="handleConnect" class="btn btn-primary" :disabled="connecting">
        {{ connecting ? 'Connecting...' : 'Connect Wallet' }}
      </button>
    </div>

    <div v-else class="wallet-info">
      <div v-if="!isCorrectNetwork" class="network-warning">
        <span>⚠️ Wrong Network</span>
        <button @click="switchToBSCTestnet" class="btn btn-secondary" style="margin-left: 0.5rem; padding: 0.5rem 1rem;">
          Switch to opBNB Testnet
        </button>
      </div>
      <div class="address">
        {{ formatAddress(account) }}
      </div>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useWallet } from '../composables/useWallet';

const { account, isConnected, isCorrectNetwork, connectWallet, switchToBSCTestnet } = useWallet();
const connecting = ref(false);
const error = ref(null);

async function handleConnect() {
  try {
    connecting.value = true;
    error.value = null;
    await connectWallet();
  } catch (err) {
    error.value = err.message;
    console.error('Connection error:', err);
  } finally {
    connecting.value = false;
  }
}

function formatAddress(address) {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(38)}`;
}
</script>

<style scoped>
.wallet-connect {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.wallet-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  color: white;
}

.address {
  font-family: monospace;
  font-weight: 600;
}

.network-warning {
  display: flex;
  align-items: center;
  background: #ff9800;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.error-message {
  color: #ff5252;
  font-size: 0.9rem;
  margin-top: 0.5rem;
  max-width: 300px;
}
</style>

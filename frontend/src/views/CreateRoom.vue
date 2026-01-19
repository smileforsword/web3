<template>
  <div class="create-room">
    <div class="card">
      <h1>Create New Betting Room</h1>

      <div v-if="!isConnected" class="alert alert-warning">
        Please connect your wallet to create a room
      </div>

      <div v-else-if="!isCorrectNetwork" class="alert alert-error">
        Please switch to opBNB Testnet to continue
      </div>

      <div v-else>
        <p class="mb-2">
          This will deploy a new betting room contract on opBNB Testnet.
          You will need to confirm the transaction in your wallet.
        </p>

        <button
          @click="handleCreateRoom"
          class="btn btn-primary"
          :disabled="loading"
          style="width: 100%;"
        >
          {{ loading ? 'Creating Room...' : 'Create Room' }}
        </button>

        <div v-if="loading" class="alert alert-info mt-1">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="loading"></div>
            <span>Please confirm the transaction in your wallet...</span>
          </div>
        </div>

        <div v-if="newRoomAddress" class="alert alert-success mt-1">
          <h3>Room Created Successfully! 🎉</h3>
          <p style="margin: 0.5rem 0;">
            <strong>Room Address:</strong>
            <a :href="`https://opbnb-testnet.bscscan.com/address/${newRoomAddress}`" target="_blank" style="color: #155724; text-decoration: underline;">
              {{ newRoomAddress }}
            </a>
          </p>
          <router-link :to="`/room/${newRoomAddress}`" class="btn btn-primary mt-1">
            Go to Room
          </router-link>
        </div>

        <div v-if="error" class="alert alert-error mt-1">
          <strong>Error:</strong> {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useWallet } from '../composables/useWallet';
import { useContract } from '../composables/useContract';

const { account, isConnected, isCorrectNetwork } = useWallet();
const { createRoom } = useContract();

const loading = ref(false);
const error = ref(null);
const newRoomAddress = ref(null);

async function handleCreateRoom() {
  try {
    loading.value = true;
    error.value = null;
    newRoomAddress.value = null;

    const roomAddress = await createRoom(account.value);
    newRoomAddress.value = roomAddress;

    console.log('Room created:', roomAddress);
  } catch (err) {
    // Handle user rejection
    if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
      error.value = 'Transaction cancelled by user';
      console.log('User cancelled transaction');
    } else {
      error.value = err.message || 'Failed to create room';
      console.error('Error creating room:', err);
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.create-room {
  max-width: 600px;
  margin: 0 auto;
}

h1 {
  color: #333;
  margin-bottom: 1.5rem;
}

p {
  color: #666;
  line-height: 1.6;
}
</style>

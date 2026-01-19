<template>
  <div class="rooms-list">
    <div class="card">
      <h1>All Betting Rooms</h1>

      <div v-if="loading" class="text-center">
        <div class="loading"></div>
        <p>Loading rooms...</p>
      </div>

      <div v-else-if="rooms.length === 0" class="text-center" style="padding: 2rem;">
        <p style="color: #666; font-size: 1.1rem;">No rooms created yet</p>
        <router-link to="/create" class="btn btn-primary mt-1">
          Create First Room
        </router-link>
      </div>

      <div v-else class="rooms-grid">
        <div v-for="room in rooms" :key="room.room_address" class="room-card card">
          <div class="room-header">
            <h3>Room</h3>
            <span :class="['status-badge', room.status]">
              {{ room.status === 'open' ? '🟢 Open' : '🔴 Ended' }}
            </span>
          </div>

          <div class="room-info">
            <p>
              <strong>Address:</strong>
              <span style="font-family: monospace; font-size: 0.9rem; word-break: break-all;">
                {{ room.room_address }}
              </span>
            </p>
            <p>
              <strong>Creator:</strong>
              <span style="font-family: monospace; font-size: 0.9rem;">
                {{ formatAddress(room.creator_address) }}
              </span>
            </p>
            <p>
              <strong>Created:</strong>
              {{ formatDate(room.created_at) }}
            </p>
          </div>

          <div class="room-actions">
            <router-link :to="`/room/${room.room_address}`" class="btn btn-primary">
              View Room
            </router-link>
            <a :href="`https://testnet.bscscan.com/address/${room.room_address}`" target="_blank" class="btn btn-secondary">
              BSCScan
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../services/api';

const rooms = ref([]);
const loading = ref(true);

onMounted(async () => {
  await loadRooms();
});

async function loadRooms() {
  try {
    loading.value = true;
    rooms.value = await api.getRooms();
  } catch (err) {
    console.error('Error loading rooms:', err);
  } finally {
    loading.value = false;
  }
}

function formatAddress(address) {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(38)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleString();
}
</script>

<style scoped>
.rooms-list {
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  color: #333;
  margin-bottom: 1.5rem;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.room-card {
  padding: 1.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.room-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f0f0f0;
}

.room-header h3 {
  margin: 0;
  color: #333;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-badge.open {
  background: #d4edda;
  color: #155724;
}

.status-badge.ended {
  background: #f8d7da;
  color: #721c24;
}

.room-info {
  margin-bottom: 1rem;
}

.room-info p {
  margin: 0.5rem 0;
  color: #666;
  line-height: 1.6;
}

.room-info strong {
  color: #333;
}

.room-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.room-actions .btn {
  flex: 1;
  text-align: center;
}
</style>

const API_BASE = '/api';

export const api = {
  // Get backend configuration
  async getConfig() {
    const response = await fetch(`${API_BASE}/config`);
    return response.json();
  },

  // Get all rooms
  async getRooms() {
    const response = await fetch(`${API_BASE}/rooms`);
    return response.json();
  },

  // Get room details
  async getRoom(address) {
    const response = await fetch(`${API_BASE}/rooms/${address}`);
    if (!response.ok) {
      throw new Error('Room not found');
    }
    return response.json();
  },

  // Get room bets
  async getRoomBets(address) {
    const response = await fetch(`${API_BASE}/rooms/${address}/bets`);
    return response.json();
  },

  // Get room payouts
  async getRoomPayouts(address) {
    const response = await fetch(`${API_BASE}/rooms/${address}/payouts`);
    return response.json();
  },

  // Request signature
  async requestSignature(data) {
    const response = await fetch(`${API_BASE}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signature request failed');
    }

    return response.json();
  }
};

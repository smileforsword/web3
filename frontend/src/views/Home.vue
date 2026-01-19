<template>
  <div class="home">
    <div class="hero">
      <h1>Welcome to Blood8</h1>
      <p>Decentralized betting rooms on BSC Testnet</p>

      <div class="actions">
        <router-link to="/create" class="btn btn-primary">
          Create New Room
        </router-link>
        <router-link to="/rooms" class="btn btn-secondary">
          View All Rooms
        </router-link>
      </div>
    </div>

    <div class="features">
      <div class="card feature-card">
        <h3>🔐 Secure</h3>
        <p>EIP-712 signature verification ensures only authorized transactions</p>
      </div>

      <div class="card feature-card">
        <h3>⚡ Fast</h3>
        <p>Built on BSC Testnet for quick and low-cost transactions</p>
      </div>

      <div class="card feature-card">
        <h3>🎯 Simple</h3>
        <p>Easy-to-use interface for creating rooms and placing bets</p>
      </div>
    </div>

    <div class="card info-section">
      <h2>How It Works</h2>
      <ol>
        <li><strong>Connect Wallet:</strong> Connect your MetaMask wallet to BSC Testnet</li>
        <li><strong>Create Room:</strong> Deploy a new betting room contract</li>
        <li><strong>Place Bets:</strong> Approve tokens and place your bet with backend signature</li>
        <li><strong>Settlement:</strong> Room creator can payout and finalize the room</li>
      </ol>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.hero {
  text-align: center;
  padding: 3rem 0;
  color: white;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.hero p {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.feature-card {
  text-align: center;
}

.feature-card h3 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.info-section {
  margin-top: 2rem;
}

.info-section h2 {
  margin-bottom: 1rem;
  color: #333;
}

.info-section ol {
  padding-left: 2rem;
}

.info-section li {
  margin-bottom: 0.75rem;
  line-height: 1.6;
}
</style>

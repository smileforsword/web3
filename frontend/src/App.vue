<template>
  <div id="app">
    <header>
      <nav>
        <div class="container">
          <h1>🎲 Blood8 Betting Room</h1>
          <div class="nav-links">
            <router-link to="/">Home</router-link>
            <router-link to="/rooms">Rooms</router-link>
            <router-link to="/create">Create Room</router-link>
          </div>
          <WalletConnect />
        </div>
      </nav>
    </header>

    <main class="container">
      <router-view />
    </main>

    <footer>
      <div class="container">
        <p>Blood8 - opBNB Testnet (ChainId: 5611)</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import WalletConnect from './components/WalletConnect.vue';
import { useWallet } from './composables/useWallet';

const { tryReconnect } = useWallet();

onMounted(() => {
  tryReconnect();
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

nav .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 20px;
}

nav h1 {
  color: white;
  font-size: 1.5rem;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-links a {
  color: white;
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.2s;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  opacity: 0.8;
  text-decoration: underline;
}

main {
  padding: 2rem 20px;
  min-height: calc(100vh - 200px);
}

footer {
  background: rgba(0, 0, 0, 0.2);
  color: white;
  text-align: center;
  padding: 1rem;
  margin-top: 2rem;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-block;
  text-decoration: none;
  text-align: center;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

input[type="text"],
input[type="number"] {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  margin-bottom: 1rem;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: #667eea;
}

.alert {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.alert-success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.alert-error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.alert-warning {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.alert-info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.loading {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.text-center {
  text-align: center;
}

.mb-1 { margin-bottom: 1rem; }
.mb-2 { margin-bottom: 2rem; }
.mt-1 { margin-top: 1rem; }
.mt-2 { margin-top: 2rem; }
</style>

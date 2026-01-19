import { ref, computed } from 'vue';
import { ethers } from 'ethers';

// Global shared state using reactive refs
let provider = null;
let signer = null;
const account = ref(null);
const chainId = ref(null);

export function useWallet() {
  const isConnected = computed(() => !!account.value);
  const isCorrectNetwork = computed(() => chainId.value === 5611);

  async function connectWallet() {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask to use this app.');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      account.value = accounts[0];

      const network = await provider.getNetwork();
      chainId.value = Number(network.chainId);

      // Check if opBNB Testnet
      if (chainId.value !== 5611) {
        await switchToOpBNBTestnet();
      }

      // Listen to account/network changes
      if (!window.ethereum._eventsRegistered) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        window.ethereum._eventsRegistered = true;
      }

      return account.value;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  async function switchToOpBNBTestnet() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x15eb' }], // 5611 in hex
      });
    } catch (error) {
      // Chain not added, add it
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x15eb',
              chainName: 'opBNB Testnet',
              nativeCurrency: {
                name: 'tBNB',
                symbol: 'tBNB',
                decimals: 18
              },
              rpcUrls: ['https://opbnb-testnet-rpc.bnbchain.org'],
              blockExplorerUrls: ['https://opbnb-testnet.bscscan.com']
            }]
          });
        } catch (addError) {
          console.error('Error adding opBNB Testnet:', addError);
          throw addError;
        }
      } else {
        throw error;
      }
    }
  }

  function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      // User disconnected wallet
      account.value = null;
      signer = null;
    } else {
      account.value = accounts[0];
      // Refresh signer
      if (provider) {
        provider.getSigner().then(s => {
          signer = s;
        });
      }
    }
  }

  function handleChainChanged() {
    // Reload the page to reset state
    window.location.reload();
  }

  function disconnectWallet() {
    account.value = null;
    signer = null;
    provider = null;
    chainId.value = null;
  }

  // Try to reconnect on load if previously connected
  async function tryReconnect() {
    if (window.ethereum && window.ethereum.selectedAddress) {
      try {
        await connectWallet();
      } catch (error) {
        console.error('Auto-reconnect failed:', error);
      }
    }
  }

  // Get current provider and signer
  function getProvider() {
    return provider;
  }

  function getSigner() {
    return signer;
  }

  return {
    account,
    chainId,
    isConnected,
    isCorrectNetwork,
    connectWallet,
    switchToBSCTestnet: switchToOpBNBTestnet,
    disconnectWallet,
    tryReconnect,
    getProvider,
    getSigner
  };
}

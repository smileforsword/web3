const { ethers } = require('ethers');
require('dotenv').config();

// Import network configuration
const { getCurrentNetwork, getCurrentToken } = require('../../config/networks');

// Get current network configuration
const network = getCurrentNetwork();
const token = getCurrentToken();

// Create provider for current network
const provider = new ethers.JsonRpcProvider(network.rpcUrl);

module.exports = {
  provider,
  network,
  token
};

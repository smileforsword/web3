import "dotenv/config";
import "@nomicfoundation/hardhat-ethers";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainId: 1337
    },
    bscTestnet: {
      type: "http",
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : []
    },
    opbnbTestnet: {
      type: "http",
      url: "https://opbnb-testnet-rpc.bnbchain.org",
      chainId: 5611,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: 1000000000 // 1 gwei, opBNB has very low gas costs
    }
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

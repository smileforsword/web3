/**
 * 网络配置 - 支持多个网络和代币
 *
 * 使用方法：
 * - 开发环境：设置 NETWORK=opbnb-testnet
 * - 生产环境：设置 NETWORK=opbnb-mainnet 或 NETWORK=bsc-mainnet
 */

const networks = {
  // opBNB 测试网
  'opbnb-testnet': {
    name: 'opBNB Testnet',
    chainId: 5611,
    rpcUrl: 'https://opbnb-testnet-rpc.bnbchain.org',
    explorer: 'https://opbnb-testnet.bscscan.com',
    tokens: {
      // 自定义测试代币（已部署）
      BLD8: {
        address: '0x9Aaf5A530835dE34698495BB01950AC7ce780E2c',
        decimals: 18,
        symbol: 'BLD8',
        name: 'Blood8 Token'
      },
      // 如果需要，可以部署测试USDT
      // USDT: {
      //   address: '0x...', // 部署后填写
      //   decimals: 6,
      //   symbol: 'USDT',
      //   name: 'Test USDT'
      // }
    },
    factory: '0x2c4d36e6fEBC8a8F2b546fa6080f10117af44861',
    defaultToken: 'BLD8'
  },

  // BSC 测试网
  'bsc-testnet': {
    name: 'BSC Testnet',
    chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorer: 'https://testnet.bscscan.com',
    tokens: {
      // BSC测试网USDT（需要部署或使用官方测试币）
      USDT: {
        address: process.env.BSC_TESTNET_USDT || '0x...', // 需要部署
        decimals: 6,
        symbol: 'USDT',
        name: 'Test USDT'
      }
    },
    factory: process.env.BSC_TESTNET_FACTORY || '0x...',
    defaultToken: 'USDT'
  },

  // opBNB 主网
  'opbnb-mainnet': {
    name: 'opBNB Mainnet',
    chainId: 204,
    rpcUrl: 'https://opbnb-mainnet-rpc.bnbchain.org',
    explorer: 'https://opbnbscan.com',
    tokens: {
      USDT: {
        address: '0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3', // opBNB主网USDT
        decimals: 18, // opBNB上的USDT是18位小数
        symbol: 'USDT',
        name: 'Tether USD'
      }
    },
    factory: process.env.OPBNB_MAINNET_FACTORY || '0x...', // 生产环境需要部署
    defaultToken: 'USDT'
  },

  // BSC 主网
  'bsc-mainnet': {
    name: 'BSC Mainnet',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    explorer: 'https://bscscan.com',
    tokens: {
      USDT: {
        address: '0x55d398326f99059fF775485246999027B3197955', // BSC主网USDT
        decimals: 18, // BSC上的USDT是18位小数
        symbol: 'USDT',
        name: 'Tether USD'
      }
    },
    factory: process.env.BSC_MAINNET_FACTORY || '0x...', // 生产环境需要部署
    defaultToken: 'USDT'
  }
};

/**
 * 获取当前网络配置
 */
function getCurrentNetwork() {
  const networkName = process.env.NETWORK || 'opbnb-testnet';

  if (!networks[networkName]) {
    throw new Error(`Unknown network: ${networkName}. Available: ${Object.keys(networks).join(', ')}`);
  }

  return {
    ...networks[networkName],
    networkName
  };
}

/**
 * 获取当前使用的代币配置
 */
function getCurrentToken() {
  const network = getCurrentNetwork();
  const tokenSymbol = process.env.TOKEN || network.defaultToken;

  if (!network.tokens[tokenSymbol]) {
    throw new Error(`Unknown token: ${tokenSymbol} on ${network.name}. Available: ${Object.keys(network.tokens).join(', ')}`);
  }

  return network.tokens[tokenSymbol];
}

/**
 * 打印当前配置信息
 */
function printConfig() {
  const network = getCurrentNetwork();
  const token = getCurrentToken();

  console.log('='.repeat(60));
  console.log('Network Configuration');
  console.log('='.repeat(60));
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Network:', network.name);
  console.log('Chain ID:', network.chainId);
  console.log('RPC URL:', network.rpcUrl);
  console.log('Factory:', network.factory);
  console.log('Token:', token.symbol, '(' + token.name + ')');
  console.log('Token Address:', token.address);
  console.log('Token Decimals:', token.decimals);
  console.log('Explorer:', network.explorer);
  console.log('='.repeat(60));
}

module.exports = {
  networks,
  getCurrentNetwork,
  getCurrentToken,
  printConfig
};

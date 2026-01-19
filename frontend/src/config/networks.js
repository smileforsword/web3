/**
 * 前端网络配置
 *
 * 使用方法：
 * - 在 .env 文件中设置 VITE_NETWORK=opbnb-testnet 或其他网络
 */

export const networks = {
  // opBNB 测试网
  'opbnb-testnet': {
    name: 'opBNB Testnet',
    chainId: 5611,
    chainIdHex: '0x15EB',
    rpcUrl: 'https://opbnb-testnet-rpc.bnbchain.org',
    explorer: 'https://opbnb-testnet.bscscan.com',
    nativeCurrency: {
      name: 'tBNB',
      symbol: 'tBNB',
      decimals: 18
    },
    tokens: {
      BLD8: {
        address: '0x9Aaf5A530835dE34698495BB01950AC7ce780E2c',
        decimals: 18,
        symbol: 'BLD8',
        name: 'Blood8 Token'
      }
    },
    factory: '0x2c4d36e6fEBC8a8F2b546fa6080f10117af44861',
    defaultToken: 'BLD8'
  },

  // BSC 测试网
  'bsc-testnet': {
    name: 'BSC Testnet',
    chainId: 97,
    chainIdHex: '0x61',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorer: 'https://testnet.bscscan.com',
    nativeCurrency: {
      name: 'tBNB',
      symbol: 'tBNB',
      decimals: 18
    },
    tokens: {
      USDT: {
        address: import.meta.env.VITE_BSC_TESTNET_USDT || '0x...',
        decimals: 6,
        symbol: 'USDT',
        name: 'Test USDT'
      }
    },
    factory: import.meta.env.VITE_BSC_TESTNET_FACTORY || '0x...',
    defaultToken: 'USDT'
  },

  // opBNB 主网
  'opbnb-mainnet': {
    name: 'opBNB Mainnet',
    chainId: 204,
    chainIdHex: '0xCC',
    rpcUrl: 'https://opbnb-mainnet-rpc.bnbchain.org',
    explorer: 'https://opbnbscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    tokens: {
      USDT: {
        address: '0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3',
        decimals: 18,
        symbol: 'USDT',
        name: 'Tether USD'
      }
    },
    factory: import.meta.env.VITE_OPBNB_MAINNET_FACTORY || '0x...',
    defaultToken: 'USDT'
  },

  // BSC 主网
  'bsc-mainnet': {
    name: 'BSC Mainnet',
    chainId: 56,
    chainIdHex: '0x38',
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    explorer: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    tokens: {
      USDT: {
        address: '0x55d398326f99059fF775485246999027B3197955',
        decimals: 18,
        symbol: 'USDT',
        name: 'Tether USD'
      }
    },
    factory: import.meta.env.VITE_BSC_MAINNET_FACTORY || '0x...',
    defaultToken: 'USDT'
  }
};

/**
 * 获取当前网络配置
 */
export function getCurrentNetwork() {
  const networkName = import.meta.env.VITE_NETWORK || 'opbnb-testnet';

  if (!networks[networkName]) {
    console.error(`Unknown network: ${networkName}. Falling back to opbnb-testnet`);
    return {
      ...networks['opbnb-testnet'],
      networkName: 'opbnb-testnet'
    };
  }

  return {
    ...networks[networkName],
    networkName
  };
}

/**
 * 获取当前代币配置
 */
export function getCurrentToken() {
  const network = getCurrentNetwork();
  const tokenSymbol = import.meta.env.VITE_TOKEN || network.defaultToken;

  if (!network.tokens[tokenSymbol]) {
    console.error(`Unknown token: ${tokenSymbol}. Using ${network.defaultToken}`);
    return network.tokens[network.defaultToken];
  }

  return network.tokens[tokenSymbol];
}

/**
 * 获取工厂合约地址
 */
export function getFactoryAddress() {
  return getCurrentNetwork().factory;
}

/**
 * 获取代币地址
 */
export function getTokenAddress() {
  return getCurrentToken().address;
}

/**
 * 获取区块链浏览器URL
 */
export function getExplorerUrl(type, hash) {
  const network = getCurrentNetwork();
  return `${network.explorer}/${type}/${hash}`;
}

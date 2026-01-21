/**
 * 网络配置 - 支持多个网络和代币
 *
 * 使用方法：
 * - 开发环境：设置 NETWORK=opbnb-testnet
 * - 生产环境：设置 NETWORK=opbnb-mainnet 或 NETWORK=bsc-mainnet
 */

const networks = {
  // ==========================================
  // 📌 测试网配置（当前使用）
  // ==========================================

  // opBNB 测试网 - 使用自定义 BLD8 代币
  'opbnb-testnet': {
    name: 'opBNB Testnet',
    chainId: 5611,
    rpcUrl: 'https://opbnb-testnet-rpc.bnbchain.org',
    explorer: 'https://opbnb-testnet.bscscan.com',
    tokens: {
      // 自定义测试代币（可免费mint）
      BLD8: {
        address: '0x9Aaf5A530835dE34698495BB01950AC7ce780E2c',
        decimals: 18,
        symbol: 'BLD8',
        name: 'Blood8 Token'
      },
    },
    factory: '0x2c4d36e6fEBC8a8F2b546fa6080f10117af44861',
    defaultToken: 'BLD8'
  },

  // BSC 测试网（备用）
  'bsc-testnet': {
    name: 'BSC Testnet',
    chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorer: 'https://testnet.bscscan.com',
    tokens: {
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

  // ==========================================
  // 🚀 主网配置（生产环境使用）
  // TODO: 上主网时需要修改的步骤：
  // 1. 部署 Factory 合约到主网
  // 2. 将 factory 地址替换为实际部署的地址
  // 3. USDT 地址已经是正确的主网地址，无需修改
  // 4. 更新 .env 文件：NETWORK=opbnb-mainnet
  // 5. 重启后端服务：pm2 restart blood8-backend
  // ==========================================

  // opBNB 主网 - 使用真实 USDT
  'opbnb-mainnet': {
    name: 'opBNB Mainnet',
    chainId: 204,
    rpcUrl: 'https://opbnb-mainnet-rpc.bnbchain.org',
    explorer: 'https://opbnbscan.com',
    tokens: {
      USDT: {
        // ✅ opBNB 主网官方 USDT 地址（已验证）
        address: '0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3',
        decimals: 18, // ⚠️ 注意：opBNB 上的 USDT 是 18 位小数！
        symbol: 'USDT',
        name: 'Tether USD'
      }
    },
    // 🔴 TODO: 主网上线前必须修改！
    // 步骤：部署 Factory 到 opBNB 主网后，填写到 .env 的 OPBNB_MAINNET_FACTORY
    factory: process.env.OPBNB_MAINNET_FACTORY || '0x...', // 需要部署后填写
    defaultToken: 'USDT'
  },

  // BSC 主网（备用方案）
  'bsc-mainnet': {
    name: 'BSC Mainnet',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    explorer: 'https://bscscan.com',
    tokens: {
      USDT: {
        // ✅ BSC 主网官方 USDT 地址（已验证）
        address: '0x55d398326f99059fF775485246999027B3197955',
        decimals: 18, // ⚠️ 注意：BSC 上的 USDT 也是 18 位小数！
        symbol: 'USDT',
        name: 'Tether USD'
      }
    },
    // 🔴 TODO: 主网上线前必须修改！
    factory: process.env.BSC_MAINNET_FACTORY || '0x...', // 需要部署后填写
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

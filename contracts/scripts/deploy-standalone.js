import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider('https://opbnb-testnet-rpc.bnbchain.org');
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log('Network: opBNB Testnet');
  console.log('Deploying contracts to opBNB Testnet...');
  console.log('Deploying with account:', wallet.address);

  // Get account balance
  const balance = await provider.getBalance(wallet.address);
  console.log('Account balance:', ethers.formatEther(balance), 'BNB');

  // Read compiled contracts
  const factoryArtifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../artifacts/src/Factory.sol/Factory.json'), 'utf8')
  );
  const mockERC20Artifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../artifacts/src/MockERC20.sol/MockERC20.json'), 'utf8')
  );

  // Deploy MockERC20 token
  console.log('\n1. Deploying MockERC20 token...');
  const MockERC20Factory = new ethers.ContractFactory(
    mockERC20Artifact.abi,
    mockERC20Artifact.bytecode,
    wallet
  );
  const token = await MockERC20Factory.deploy('Blood8 Token', 'BLD8');
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log('MockERC20 deployed to:', tokenAddress);

  // Deploy Factory
  console.log('\n2. Deploying Factory...');
  const FactoryFactory = new ethers.ContractFactory(
    factoryArtifact.abi,
    factoryArtifact.bytecode,
    wallet
  );
  const factory = await FactoryFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log('Factory deployed to:', factoryAddress);

  // Export contract addresses
  const addresses = {
    factory: factoryAddress,
    token: tokenAddress,
    network: 'opbnbTestnet',
    chainId: 5611,
    deployer: wallet.address
  };

  const addressesPath = path.join(__dirname, '../addresses.json');
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log('\n✓ Contract addresses saved to:', addressesPath);

  // Export ABIs to frontend
  console.log('\n3. Exporting ABIs...');

  const frontendAbiDir = path.join(__dirname, '../../frontend/src/contracts/abis');
  if (!fs.existsSync(frontendAbiDir)) {
    fs.mkdirSync(frontendAbiDir, { recursive: true });
  }

  // Export Factory ABI
  fs.writeFileSync(
    path.join(frontendAbiDir, 'Factory.json'),
    JSON.stringify(factoryArtifact.abi, null, 2)
  );
  console.log('✓ Factory ABI exported');

  // Export MinimalRoom ABI
  const roomArtifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../artifacts/src/MinimalRoom.sol/MinimalRoom.json'), 'utf8')
  );
  fs.writeFileSync(
    path.join(frontendAbiDir, 'MinimalRoom.json'),
    JSON.stringify(roomArtifact.abi, null, 2)
  );
  console.log('✓ MinimalRoom ABI exported');

  // Export ERC20 ABI
  const erc20ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "function mint(address to, uint256 amount) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)"
  ];
  const iface = new ethers.Interface(erc20ABI);
  fs.writeFileSync(
    path.join(frontendAbiDir, 'ERC20.json'),
    JSON.stringify(JSON.parse(iface.formatJson()), null, 2)
  );
  console.log('✓ ERC20 ABI exported');

  // Export addresses config for frontend
  const frontendAddresses = `// Auto-generated from deployment script
export const FACTORY_ADDRESS = "${factoryAddress}";
export const TOKEN_ADDRESS = "${tokenAddress}";
export const OPBNB_TESTNET_CHAIN_ID = 5611;
export const NETWORK_NAME = "opBNB Testnet";
`;

  fs.writeFileSync(
    path.join(__dirname, '../../frontend/src/contracts/addresses.js'),
    frontendAddresses
  );
  console.log('✓ Frontend addresses config exported');

  console.log('\n' + '='.repeat(60));
  console.log('Deployment Summary');
  console.log('='.repeat(60));
  console.log('Factory Address:', factoryAddress);
  console.log('Token Address:  ', tokenAddress);
  console.log('Network:        ', 'opBNB Testnet (chainId: 5611)');
  console.log('Deployer:       ', wallet.address);
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Update backend .env with new contract addresses');
  console.log('2. Restart backend server');
  console.log('3. Test room creation on frontend');
  console.log('\nView contracts on explorer:');
  console.log('Factory:', `https://opbnb-testnet.bscscan.com/address/${factoryAddress}`);
  console.log('Token:  ', `https://opbnb-testnet.bscscan.com/address/${tokenAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

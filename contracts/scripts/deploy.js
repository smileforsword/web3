import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Network:', hre.network.name);

  const network = hre.network.name;
  const networkDisplayName = network === 'opbnbTestnet' ? 'opBNB Testnet' : 'BSC Testnet';
  const chainId = network === 'opbnbTestnet' ? 5611 : 97;

  console.log(`Deploying contracts to ${networkDisplayName}...`);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB");

  // Deploy MockERC20 token (for testing)
  console.log("\n1. Deploying MockERC20 token...");
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy("Blood8 Token", "BLD8");
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("MockERC20 deployed to:", tokenAddress);

  // Deploy Factory
  console.log("\n2. Deploying Factory...");
  const Factory = await hre.ethers.getContractFactory("Factory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("Factory deployed to:", factoryAddress);

  // Export contract addresses
  const addresses = {
    factory: factoryAddress,
    token: tokenAddress,
    network: network,
    chainId: chainId,
    deployer: deployer.address
  };

  const addressesPath = path.join(__dirname, "../addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("\n✓ Contract addresses saved to:", addressesPath);

  // Export ABIs to frontend
  console.log("\n3. Exporting ABIs...");

  // Create frontend contracts directory if it doesn't exist
  const frontendAbiDir = path.join(__dirname, "../../frontend/src/contracts/abis");
  if (!fs.existsSync(frontendAbiDir)) {
    fs.mkdirSync(frontendAbiDir, { recursive: true });
  }

  // Export Factory ABI
  const factoryArtifact = await hre.artifacts.readArtifact("Factory");
  fs.writeFileSync(
    path.join(frontendAbiDir, "Factory.json"),
    JSON.stringify(factoryArtifact.abi, null, 2)
  );
  console.log("✓ Factory ABI exported");

  // Export MinimalRoom ABI
  const roomArtifact = await hre.artifacts.readArtifact("MinimalRoom");
  fs.writeFileSync(
    path.join(frontendAbiDir, "MinimalRoom.json"),
    JSON.stringify(roomArtifact.abi, null, 2)
  );
  console.log("✓ MinimalRoom ABI exported");

  // Export ERC20 ABI (standard interface)
  const erc20ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)"
  ];
  const iface = new hre.ethers.Interface(erc20ABI);
  fs.writeFileSync(
    path.join(frontendAbiDir, "ERC20.json"),
    JSON.stringify(JSON.parse(iface.formatJson()), null, 2)
  );
  console.log("✓ ERC20 ABI exported");

  // Export addresses config for frontend
  const frontendAddresses = `// Auto-generated from deployment script
export const FACTORY_ADDRESS = "${factoryAddress}";
export const TOKEN_ADDRESS = "${tokenAddress}";
export const OPBNB_TESTNET_CHAIN_ID = ${chainId};
export const NETWORK_NAME = "${networkDisplayName}";
`;

  fs.writeFileSync(
    path.join(__dirname, "../../frontend/src/contracts/addresses.js"),
    frontendAddresses
  );
  console.log("✓ Frontend addresses config exported");

  console.log("\n" + "=".repeat(60));
  console.log("Deployment Summary");
  console.log("=".repeat(60));
  console.log("Factory Address:", factoryAddress);
  console.log("Token Address:  ", tokenAddress);
  console.log("Network:        ", `${networkDisplayName} (chainId: ${chainId})`);
  console.log("Deployer:       ", deployer.address);
  console.log("=".repeat(60));
  console.log("\nNext steps:");
  console.log("1. Verify contracts on BSCScan (optional)");
  console.log("2. Update backend .env with FACTORY_ADDRESS and TOKEN_ADDRESS");
  console.log("3. Restart the backend server");
  console.log("4. Test room creation on frontend");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

const { ethers } = require('ethers');
const db = require('../src/config/database');
require('dotenv').config();

async function testSignature() {
  console.log('Testing EIP-712 Signature Generation\n');
  console.log('='.repeat(60));

  // Test parameters
  const roomAddress = "0x1234567890123456789012345678901234567890";
  const user = "0x0987654321098765432109876543210987654321";
  const amount = ethers.parseUnits("100", 18);
  const nonce = 0;
  const deadline = Math.floor(Date.now() / 1000) + 180;

  console.log('Test Parameters:');
  console.log('  Room Address:', roomAddress);
  console.log('  User:', user);
  console.log('  Amount:', ethers.formatUnits(amount, 18));
  console.log('  Nonce:', nonce);
  console.log('  Deadline:', deadline);
  console.log('='.repeat(60));

  // Calculate hashes
  const methodHash = ethers.id('pay(address,uint256,uint256)');
  const payloadHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'address'],
      [user, amount, roomAddress]
    )
  );

  console.log('\nCalculated Hashes:');
  console.log('  Method Hash:', methodHash);
  console.log('  Payload Hash:', payloadHash);

  // Create signer
  const privateKey = process.env.WEB_AUTH_PRIVATE_KEY;
  if (!privateKey) {
    console.error('\n❌ Error: WEB_AUTH_PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  const signer = new ethers.Wallet(privateKey);
  console.log('\nSigner Address:', signer.address);

  // EIP-712 domain and types
  const domain = {
    name: "blood8-room",
    version: "1",
    chainId: 97,
    verifyingContract: roomAddress
  };

  const types = {
    WebCall: [
      { name: "user", type: "address" },
      { name: "methodHash", type: "bytes32" },
      { name: "payloadHash", type: "bytes32" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" }
    ]
  };

  const value = {
    user,
    methodHash,
    payloadHash,
    nonce: BigInt(nonce),
    deadline: BigInt(deadline)
  };

  console.log('\n' + '='.repeat(60));
  console.log('Generating EIP-712 Signature...');

  const signature = await signer.signTypedData(domain, types, value);

  // Split signature
  const bytes = ethers.getBytes(signature);
  const r = ethers.hexlify(bytes.slice(0, 32));
  const s = ethers.hexlify(bytes.slice(32, 64));
  const v = bytes[64] < 27 ? bytes[64] + 27 : bytes[64];

  console.log('\n✓ Signature Generated Successfully!');
  console.log('\nSignature Components:');
  console.log('  Full Signature:', signature);
  console.log('  v:', v);
  console.log('  r:', r);
  console.log('  s:', s);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test Completed Successfully!');
  console.log('='.repeat(60));

  // Close database connection
  await db.pool.end();
}

testSignature()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });

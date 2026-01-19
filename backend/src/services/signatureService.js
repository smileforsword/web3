const { ethers } = require('ethers');

class SignatureService {
  constructor(privateKey, provider) {
    if (!privateKey) {
      throw new Error('WEB_AUTH_PRIVATE_KEY is required');
    }
    this.signer = new ethers.Wallet(privateKey, provider);
    this.signerAddress = this.signer.address;
    console.log('Signature service initialized with signer:', this.signerAddress);
  }

  // Generate EIP-712 signature for WebCall
  async signWebCall(roomAddress, user, method, methodHash, payloadHash, nonce, deadline) {
    const domain = {
      name: "blood8-room",
      version: "1",
      chainId: 5611, // opBNB Testnet
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

    // Sign using EIP-712
    const signature = await this.signer.signTypedData(domain, types, value);

    // Split signature into v, r, s components
    const bytes = ethers.getBytes(signature);
    const r = ethers.hexlify(bytes.slice(0, 32));
    const s = ethers.hexlify(bytes.slice(32, 64));
    const v = bytes[64] < 27 ? bytes[64] + 27 : bytes[64];

    return { v, r, s, signature };
  }

  // Get method hash from method name
  getMethodHash(methodSig) {
    const methodMap = {
      'pay': 'pay(address,uint256,uint256)',
      'payout': 'payout(address,uint256,bool,address,uint256)',
      'finalize': 'finalize(address,uint256)'
    };

    const fullSig = methodMap[methodSig];
    if (!fullSig) {
      throw new Error(`Unknown method: ${methodSig}`);
    }

    return ethers.id(fullSig);
  }

  // Calculate payload hash based on method
  calculatePayloadHash(method, params) {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();

    switch (method) {
      case 'pay':
        // pay: abi.encode(user, amount, roomAddress)
        return ethers.keccak256(
          abiCoder.encode(
            ['address', 'uint256', 'address'],
            [params.user, params.amount, params.roomAddress]
          )
        );

      case 'payout':
        // payout: abi.encode(to, amount, finalizeAfter, roomAddress, deadline)
        return ethers.keccak256(
          abiCoder.encode(
            ['address', 'uint256', 'bool', 'address', 'uint256'],
            [params.to, params.amount, params.finalizeAfter, params.roomAddress, params.deadline]
          )
        );

      case 'finalize':
        // finalize: abi.encode(roomAddress, deadline)
        return ethers.keccak256(
          abiCoder.encode(
            ['address', 'uint256'],
            [params.roomAddress, params.deadline]
          )
        );

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  // Verify method hash matches the expected value
  verifyMethodHash(method, providedHash) {
    const expectedHash = this.getMethodHash(method);
    return providedHash === expectedHash;
  }
}

module.exports = SignatureService;

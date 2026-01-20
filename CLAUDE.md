# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**blood8** is a Web3 betting room system built on opBNB Testnet that uses EIP-712 signatures for secure, backend-authorized transactions. The system consists of:

- **Factory Contract** (`0x2c4d36e6fEBC8a8F2b546fa6080f10117af44861`): Creates new betting rooms
- **Room Contracts**: Individual betting rooms with EIP-712-protected operations
- **ERC20 Token (BLD8)** (`0x9Aaf5A530835dE34698495BB01950AC7ce780E2c`): Payment token for bets

**Target Network**: opBNB Testnet (chainId: 5611)

## Architecture

### EIP-712 Signature Flow

The core security model relies on backend-controlled signatures:

1. **Backend holds signing private key** - Never exposed to frontend
2. **Nonce-based replay protection** - Each user has a per-room nonce counter on-chain
3. **Time-bounded signatures** - 180-second deadline for signature validity
4. **Method binding** - Signatures include methodHash and payloadHash to prevent signature reuse across different operations

### Key Operations

**createRoom**: Frontend calls factory contract directly (no signature needed)
- Emits `RoomCreated` event with new room address

**pay** (betting): Requires EIP-712 signature from backend
1. Frontend: `erc20.approve(roomAddress, amount)`
2. Frontend → Backend: Request signature for pay operation
3. Backend: Read current `nonce`, generate EIP-712 signature
4. Frontend: Call `room.pay(user, amount, deadline, v, r, s)`

**payout** (settlement): Backend-triggered, requires EIP-712 signature
- Backend generates signature and submits transaction
- Can optionally finalize (end) the room with `finalizeAfter=true`

**finalize**: Marks room as ended (no more operations allowed)

### EIP-712 Domain & Types

```typescript
// Domain (must match exactly)
{
  name: "blood8-room",
  version: "1",
  chainId: 5611,  // opBNB Testnet
  verifyingContract: roomAddress  // specific to each room
}

// Type structure
WebCall: [
  { name: "user", type: "address" },
  { name: "methodHash", type: "bytes32" },   // keccak256 of method signature
  { name: "payloadHash", type: "bytes32" },  // keccak256 of ABI-encoded params
  { name: "nonce", type: "uint256" },        // from room.nonces(user)
  { name: "deadline", type: "uint256" }      // Unix timestamp
]
```

### Method Signatures (for methodHash calculation)

These strings MUST be exact (used with `ethers.id()`):
- `pay(address,uint256,uint256)`
- `payout(address,uint256,bool,address,uint256)`
- `finalize(address,uint256)`

### Payload Encoding (for payloadHash calculation)

Order matters - must match contract expectations:
- **pay**: `abi.encode(user, amount, roomAddress)`
- **payout**: `abi.encode(to, amount, finalizeAfter, roomAddress, deadline)`
- **finalize**: `abi.encode(roomAddress, deadline)`

## Development Commands

**Note**: This repository currently contains only documentation. When implementing, expect:

### Frontend (likely React/Next.js)
```bash
npm install ethers@^6.0.0  # Must use ethers v6
npm run dev                # Development server
npm run build              # Production build
npm test                   # Run tests
```

### Backend (likely Node.js/Express)
```bash
npm install ethers@^6.0.0
npm run dev                # Development with hot reload
npm test                   # Run tests
```

Environment variables needed:
- `WEB_AUTH_PRIVATE_KEY`: The authorized signer private key (critical - server-only)
- `OPBNB_TESTNET_RPC`: RPC endpoint for opBNB Testnet (https://opbnb-testnet-rpc.bnbchain.org)
- `FACTORY_ADDRESS`: `0x2c4d36e6fEBC8a8F2b546fa6080f10117af44861`
- `TOKEN_ADDRESS`: `0x9Aaf5A530835dE34698495BB01950AC7ce780E2c`

## Critical Implementation Notes

### Signature Generation (Backend)

```typescript
// Read nonce from chain FIRST
const nonce = await room.nonces(user);
const deadline = Math.floor(Date.now() / 1000) + 180;

// Calculate hashes
const methodHash = ethers.id("pay(address,uint256,uint256)");
const payloadHash = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "address"],
    [user, amount, roomAddress]
  )
);

// Sign with backend wallet
const signature = await signer.signTypedData(domain, types, {
  user, methodHash, payloadHash, nonce, deadline
});
```

### Signature Splitting (Frontend)

```typescript
const bytes = ethers.getBytes(signature);
const r = ethers.hexlify(bytes.slice(0, 32));
const s = ethers.hexlify(bytes.slice(32, 64));
const v = bytes[64] < 27 ? bytes[64] + 27 : bytes[64];
```

### Event Parsing (Frontend/Backend)

```typescript
const iface = new ethers.Interface(FactoryABI);
for (const log of receipt.logs) {
  try {
    const parsed = iface.parseLog(log);
    if (parsed.name === "RoomCreated") {
      const roomAddress = parsed.args.room;
      // ...
    }
  } catch {}
}
```

## Common Errors

- **bad signer**: Backend private key doesn't match the `authorizedSigner` set when room was created
- **expired**: `deadline` has passed (regenerate signature)
- **ended**: Room is finalized, create a new room
- **transferFrom fail**: Insufficient token balance or approval
- **reenter**: Concurrent transaction attempts detected

## Security Requirements

1. **Never expose backend signing key** - Not in frontend code, logs, or commits
2. **Validate all signature requests** - Check room exists, user permissions, nonce matches chain state
3. **Rate limit `/api/sign` endpoint** - Prevent signature farming
4. **Verify deadline bounds** - Accept only reasonable future timestamps (e.g., +60 to +300 seconds)
5. **Check room.ended() status** - Frontend should disable operations on ended rooms
6. **Audit trail** - Log all signature requests with user/room/method for forensics

## Contract ABIs

Full ABIs for Factory and Room (MinimalRoom) contracts are in README.md sections 3.
Key view functions:
- `room.nonces(address user)`: Get current nonce for signature generation
- `room.ended()`: Check if room is finalized
- `erc20.allowance(address owner, address spender)`: Verify approval before pay()

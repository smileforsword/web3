// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract MinimalRoom {
    // EIP-712 Domain Separator components
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    // WebCall struct typehash
    bytes32 public constant WEBCALL_TYPEHASH = keccak256(
        "WebCall(address user,bytes32 methodHash,bytes32 payloadHash,uint256 nonce,uint256 deadline)"
    );

    // State variables
    address public immutable token;           // ERC20 token address
    address public immutable authorizedSigner; // Backend signer address
    mapping(address => uint256) public nonces; // Per-user nonce for replay protection
    bool public ended;                        // Room finalized flag

    // Reentrancy guard
    uint256 private _locked;

    // Events
    event Paid(address indexed user, uint256 amount);
    event Payout(address to, uint256 amount, bool finalized);
    event Finalized(address indexed by);

    // Modifiers
    modifier notEnded() {
        require(!ended, "ended");
        _;
    }

    modifier noReenter() {
        require(_locked == 0, "reenter");
        _locked = 1;
        _;
        _locked = 0;
    }

    // Constructor
    constructor(address _token, address _signer) {
        require(_token != address(0), "invalid token");
        require(_signer != address(0), "invalid signer");
        token = _token;
        authorizedSigner = _signer;
    }

    // Get domain separator
    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("blood8-room")),
                keccak256(bytes("1")),
                5611, // opBNB Testnet chainId
                address(this)
            )
        );
    }

    // Verify EIP-712 signature
    function _verify(
        address user,
        bytes32 methodHash,
        bytes32 payloadHash,
        uint256 nonce,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal view returns (bool) {
        require(block.timestamp <= deadline, "expired");
        require(nonce == nonces[user], "invalid nonce");

        bytes32 structHash = keccak256(
            abi.encode(
                WEBCALL_TYPEHASH,
                user,
                methodHash,
                payloadHash,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", _domainSeparator(), structHash)
        );

        address recovered = ecrecover(digest, v, r, s);
        require(recovered == authorizedSigner, "bad signer");

        return true;
    }

    // Pay (place bet) - user deposits tokens into room
    function pay(
        address user,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external notEnded noReenter {
        require(user != address(0), "invalid user");
        require(amount > 0, "invalid amount");

        // Calculate method and payload hashes
        bytes32 methodHash = keccak256(bytes("pay(address,uint256,uint256)"));
        bytes32 payloadHash = keccak256(
            abi.encode(user, amount, address(this))
        );

        // Verify signature
        _verify(user, methodHash, payloadHash, nonces[user], deadline, v, r, s);

        // Increment nonce to prevent replay
        nonces[user]++;

        // Transfer tokens from user to this room
        require(
            IERC20(token).transferFrom(user, address(this), amount),
            "transfer fail"
        );

        emit Paid(user, amount);
    }

    // Payout - send tokens from room to recipient
    function payout(
        address to,
        uint256 amount,
        bool finalizeAfter,
        address user,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external notEnded noReenter {
        require(to != address(0), "invalid recipient");
        require(amount > 0, "invalid amount");

        // Calculate method and payload hashes
        bytes32 methodHash = keccak256(bytes("payout(address,uint256,bool,address,uint256)"));
        bytes32 payloadHash = keccak256(
            abi.encode(to, amount, finalizeAfter, address(this), deadline)
        );

        // Verify signature
        _verify(user, methodHash, payloadHash, nonces[user], deadline, v, r, s);

        // Increment nonce
        nonces[user]++;

        // Transfer tokens to recipient
        require(
            IERC20(token).transfer(to, amount),
            "transfer fail"
        );

        // Finalize if requested
        if (finalizeAfter) {
            ended = true;
        }

        emit Payout(to, amount, finalizeAfter);
    }

    // Finalize - end the room
    function finalize(
        address user,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external notEnded noReenter {
        // Calculate method and payload hashes
        bytes32 methodHash = keccak256(bytes("finalize(address,uint256)"));
        bytes32 payloadHash = keccak256(
            abi.encode(address(this), deadline)
        );

        // Verify signature
        _verify(user, methodHash, payloadHash, nonces[user], deadline, v, r, s);

        // Increment nonce
        nonces[user]++;

        // Mark room as ended
        ended = true;

        emit Finalized(msg.sender);
    }
}

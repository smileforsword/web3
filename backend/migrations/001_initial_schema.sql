-- Rooms table
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    room_address VARCHAR(42) UNIQUE NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    authorized_signer VARCHAR(42) NOT NULL,
    creator_address VARCHAR(42) NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- 'open' | 'ended'
    created_at TIMESTAMP DEFAULT NOW(),
    block_number BIGINT,
    tx_hash VARCHAR(66)
);

-- Bets table
CREATE TABLE bets (
    id SERIAL PRIMARY KEY,
    room_address VARCHAR(42) NOT NULL,
    user_address VARCHAR(42) NOT NULL,
    amount VARCHAR(78) NOT NULL, -- Store as string to handle uint256
    tx_hash VARCHAR(66) UNIQUE,
    block_number BIGINT,
    block_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (room_address) REFERENCES rooms(room_address)
);

-- Payouts table
CREATE TABLE payouts (
    id SERIAL PRIMARY KEY,
    room_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    amount VARCHAR(78) NOT NULL,
    finalized BOOLEAN DEFAULT false,
    tx_hash VARCHAR(66) UNIQUE,
    block_number BIGINT,
    block_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (room_address) REFERENCES rooms(room_address)
);

-- Signature requests (audit trail)
CREATE TABLE signature_requests (
    id SERIAL PRIMARY KEY,
    room_address VARCHAR(42),
    user_address VARCHAR(42),
    method VARCHAR(20), -- 'pay' | 'payout' | 'finalize'
    nonce VARCHAR(78),
    deadline BIGINT,
    signature VARCHAR(132), -- 0x + 130 chars
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_bets_room ON bets(room_address);
CREATE INDEX idx_bets_user ON bets(user_address);
CREATE INDEX idx_payouts_room ON payouts(room_address);
CREATE INDEX idx_sig_requests_room_user ON signature_requests(room_address, user_address);

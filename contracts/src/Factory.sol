// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MinimalRoom.sol";

contract Factory {
    // Event emitted when a new room is created
    event RoomCreated(
        address indexed room,
        address indexed creator,
        address token,
        address signer
    );

    // Create a new betting room
    function createRoom(
        address erc20Token,
        address authorizedSigner,
        address creator
    ) external returns (address room) {
        require(erc20Token != address(0), "invalid token");
        require(authorizedSigner != address(0), "invalid signer");
        require(creator != address(0), "invalid creator");

        // Deploy new MinimalRoom contract
        MinimalRoom newRoom = new MinimalRoom(erc20Token, authorizedSigner);
        room = address(newRoom);

        emit RoomCreated(room, creator, erc20Token, authorizedSigner);
    }
}

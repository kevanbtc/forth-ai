// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockERC6551Registry {
    function createAccount(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) external returns (address) {
        // Return a dummy address
        return address(uint160(uint256(keccak256(abi.encode(implementation, salt, chainId, tokenContract, tokenId)))));
    }
}
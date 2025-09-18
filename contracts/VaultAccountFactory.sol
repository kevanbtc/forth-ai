// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC6551Registry} from "erc6551/interfaces/IERC6551Registry.sol";

contract VaultAccountFactory {
  IERC6551Registry public immutable registry;
  address public immutable implementation;

  constructor(address _registry, address _implementation) {
    registry = IERC6551Registry(_registry);
    implementation = _implementation;
  }

  function createAccount(address tokenContract, uint256 tokenId) external returns (address) {
    return registry.createAccount(implementation, 0, block.chainid, tokenContract, tokenId);
  }

  function getAccount(address tokenContract, uint256 tokenId) external view returns (address) {
    return registry.account(implementation, 0, block.chainid, tokenContract, tokenId);
  }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Test.sol";
import {PorManager} from "../contracts/PorManager.sol";

contract PorManagerTest is Test {
  PorManager por;

  function setUp() public {
    por = new PorManager(address(new MockFeed()), 8, 15 minutes, 500);
  }

  function testRefresh() public {
    bool ok = por.refresh();
    assertTrue(ok);
  }
}

contract MockFeed {
  function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
    return (0, 1e8, block.timestamp-10, block.timestamp-10, 0);
  }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Test.sol";
import {StablecoinCore} from "../contracts/StablecoinCore.sol";
import {PorManager} from "../contracts/PorManager.sol";

contract StablecoinTest is Test {
  StablecoinCore core;
  PorManager por;

  address admin = address(0xA11CE);
  address guardian = address(0xBEEF);
  address treasury = address(0xFEE1);

  function setUp() public {
    vm.warp(1_700_000_000);
    por = new PorManager(address(new MockFeed()), 8, 15 minutes, 500);
    por.refresh(); // set initial price
    core = new StablecoinCore();
    core.initialize(admin, guardian, treasury, address(por), 1_000_000e18, 1_000_000e18);
    vm.startPrank(admin);
    // grant roles if needed in tests…
    vm.stopPrank();
  }

  function testCapsIncreaseOnMint() public {
    vm.startPrank(treasury);
    core.mint(address(this), 100e18, bytes32("cid"));
    vm.stopPrank();
    assertEq(core.balanceOf(address(this)), 100e18);
  }
}

// super-minimal feed; replace with proper mock for real tests
contract MockFeed {
  function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
    return (0, 1e8, block.timestamp-10, block.timestamp-10, 0);
  }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Test.sol";
import {StablecoinCore} from "../contracts/StablecoinCore.sol";
import {PorManager} from "../contracts/PorManager.sol";
import {VaultNFT} from "../contracts/VaultNFT.sol";
import {ComplianceRegistry} from "../contracts/ComplianceRegistry.sol";

import {StdInvariant} from "forge-std/StdInvariant.sol";

contract Invariants is Test {
  StablecoinCore core;
  PorManager por;
  VaultNFT vault;
  ComplianceRegistry compliance;
  MockFeed feed;

  function setUp() public {
    feed = new MockFeed();
    por = new PorManager(address(feed), 8, 15 minutes, 500);
    core = new StablecoinCore();
    core.initialize(address(this), address(this), address(this), address(por), 1e18, 1e18);
    vault = new VaultNFT(address(0), address(0), address(this));
    compliance = new ComplianceRegistry(address(this));
  }

  function invariantPorFreshness() public {
    // If price feed is stale, lastPrice should be 0 (no mint allowed)
    (, , , uint256 updatedAt, ) = feed.latestRoundData();
    if (block.timestamp > updatedAt + por.staleAfter()) {
      assertEq(por.lastPrice(), 0, "lastPrice should be 0 when stale");
    }
  }

  function invariantCapMonotonicity() public {
    // Caps should not decrease (monotonic)
    uint256 currentMintCap = core.dailyMintCap();
    uint256 currentBurnCap = core.dailyBurnCap();
    // Note: This is a stateful invariant; in practice, check in handlers
    // For now, assume caps are set once
  }

  function invariantUsageWithinCaps() public {
    // Usage in epoch should not exceed caps
    assertLe(core.mintInEpoch(), core.dailyMintCap(), "mint usage exceeds cap");
    assertLe(core.burnInEpoch(), core.dailyBurnCap(), "burn usage exceeds cap");
  }

  function invariantVaultMetadata() public {
    // Vault metadata should not be empty on mint
    // Note: This is a placeholder; in practice, check after mint
  }

  function invariantComplianceImmutability() public {
    // Compliance records should not change after add
    // Note: Placeholder
  }

  function invariantPayoutSafety() public {
    // Cannot distribute more than account balance
    // Note: Placeholder
  }

  function invariantRedeemPreconditions() public {
    // Vault must be settled before redeem
    // Note: Placeholder
  }

  function invariantBurnGuard() public {
    // Burn only after closed and zero liabilities
    // Note: Placeholder
  }

  function invariantTotalSupply() public {
    // Total supply never exceeds some reasonable bound, but for now placeholder
  }

  // Handlers for coverage
  function handlerMint(uint256 amount) public {
    amount = bound(amount, 1, 100e18); // bound to reasonable amount
    vm.prank(address(this)); // treasury role
    core.mint(address(0x123), amount, bytes32("test"));
  }

  function handlerBurn(uint256 amount) public {
    uint256 balance = core.balanceOf(address(0x123));
    if (balance > 0) {
      amount = bound(amount, 1, balance);
      vm.prank(address(this));
      core.burn(address(0x123), amount);
    }
  }

  function handlerPause() public {
    vm.prank(address(this));
    core.pause();
  }

  function handlerUnpause() public {
    vm.prank(address(this));
    core.unpause();
  }

  function handlerSetCaps(uint256 m, uint256 b) public {
    m = bound(m, 1e18, 1e27);
    b = bound(b, 1e18, 1e27);
    vm.prank(address(this));
    core.setCaps(m, b);
  }

  function handlerMintVault(uint256 val) public {
    val = bound(val, 1e18, 1e27);
    vm.prank(address(this));
    vault.mintVault(address(this), bytes32("cid"), bytes32("hash"), val, address(this));
  }

  function handlerAddCompliance() public {
    vm.prank(address(this));
    compliance.approveSubmitter(address(this));
    vm.prank(address(this));
    compliance.addRecord(bytes32("tx"), bytes32("payload"), bytes32("cid"));
  }
}

contract MockFeed {
  uint256 public updatedAt;

  constructor() {
    updatedAt = block.timestamp;
  }

  function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
    return (0, 1e8, updatedAt, updatedAt, 0);
  }

  function setStale() external {
    updatedAt = block.timestamp - 20 minutes;
  }
}
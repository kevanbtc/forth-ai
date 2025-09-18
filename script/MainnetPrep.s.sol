// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {StablecoinCore} from "../contracts/StablecoinCore.sol";
import {PorManager} from "../contracts/PorManager.sol";
import {GuardianTimelock} from "../contracts/GuardianTimelock.sol";

contract MainnetPrep is Script {
  function run() external {
    // Dry-run deploy on testnet
    // Set testnet RPC and keys
    vm.createSelectFork(vm.rpcUrl("testnet"));

    address admin = vm.envAddress("SAFE_ADMIN");
    address guardian = vm.envAddress("SAFE_GUARDIAN");
    address treasury = vm.envAddress("SAFE_TREASURY");
    address feed = vm.envAddress("CL_FEED");

    vm.startBroadcast();

    PorManager por = new PorManager(feed, 8, 15 minutes, 500);
    StablecoinCore core = new StablecoinCore();
    core.initialize(admin, guardian, treasury, address(por), 250_000e18, 250_000e18);

    vm.stopBroadcast();

    // Post-deploy checks
    require(StablecoinCore(core).totalSupply() == 0, "Supply not zero");
    require(StablecoinCore(core).paused() == false, "Should not be paused");

    // Fuzz invariants (run separately with --ffi false)
    // forge test --match Invariants --runs 10000
  }
}
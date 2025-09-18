// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {StablecoinCore} from "../contracts/StablecoinCore.sol";
import {PorManager} from "../contracts/PorManager.sol";

contract Deploy is Script {
  function run() external {
    address admin    = vm.envAddress("ADMIN");
    address guardian = vm.envAddress("GUARDIAN");
    address treasury = vm.envAddress("TREASURY");
    address feed     = vm.envAddress("CL_FEED");

    vm.startBroadcast();

    PorManager por = new PorManager(feed, 8, 15 minutes, 500); // 5% dev
    StablecoinCore core = new StablecoinCore();
    core.initialize(admin, guardian, treasury, address(por), 10_000_000e18, 10_000_000e18);

    vm.stopBroadcast();
  }
}
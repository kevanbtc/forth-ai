// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {StablecoinCore} from "../contracts/StablecoinCore.sol";
import {PorManager} from "../contracts/PorManager.sol";
import {GuardianTimelock} from "../contracts/GuardianTimelock.sol";

contract Deploy is Script {
  function run() external {
    address admin    = vm.envAddress("ADMIN");
    address guardian = vm.envAddress("GUARDIAN");
    address treasury = vm.envAddress("TREASURY");
    address feed     = vm.envAddress("CL_FEED");
    address safeAdmin = vm.envAddress("SAFE_ADMIN");
    address safeGuardian = vm.envAddress("SAFE_GUARDIAN");
    address safeTreasury = vm.envAddress("SAFE_TREASURY");

    vm.startBroadcast();

    // Deploy PoR Manager
    PorManager por = new PorManager(feed, 8, 15 minutes, 500); // 5% dev

    // Deploy Timelock (48h delay, proposers: safeGuardian, executors: safeAdmin, admin: safeAdmin)
    address[] memory proposers = new address[](1);
    proposers[0] = safeGuardian;
    address[] memory executors = new address[](1);
    executors[0] = safeAdmin;
    GuardianTimelock timelock = new GuardianTimelock(48 hours, proposers, executors, safeAdmin);

    // Deploy Stablecoin
    StablecoinCore core = new StablecoinCore();
    core.initialize(address(timelock), safeGuardian, safeTreasury, address(por), 250_000e18, 250_000e18);

    // Grant roles to Safes
    core.grantRole(core.MINTER_ROLE(), safeTreasury);
    core.grantRole(core.BURNER_ROLE(), safeTreasury);

    // Transfer admin to Timelock (via Safe later)
    // For now, admin is deployer; post-deploy, use Safe to transfer to Timelock

    vm.stopBroadcast();

    // Log addresses
    console.log("PorManager:", address(por));
    console.log("GuardianTimelock:", address(timelock));
    console.log("StablecoinCore:", address(core));
  }
}
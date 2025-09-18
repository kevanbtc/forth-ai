// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Test.sol";
import {VaultNFT} from "../contracts/VaultNFT.sol";
import {VaultAccountFactory} from "../contracts/VaultAccountFactory.sol";
import {ComplianceRegistry} from "../contracts/ComplianceRegistry.sol";

contract VaultTest is Test {
  VaultNFT vault;
  VaultAccountFactory factory;
  ComplianceRegistry compliance;

  address owner = address(0xA11CE);
  address registry = address(0x123); // mock
  address impl = address(0x456);     // mock

  function setUp() public {
    compliance = new ComplianceRegistry(owner);
    factory = new VaultAccountFactory(registry, impl);
    vault = new VaultNFT(registry, impl, owner);
  }

  function testMintVault() public {
    vm.prank(owner);
    uint256 tokenId = vault.mintVault(owner, bytes32("cid"), bytes32("hash"), 100000e18, owner);
    assertEq(tokenId, 1);
    (bytes32 cid, bytes32 hash, uint256 val,,) = vault.vaults(tokenId);
    assertEq(cid, bytes32("cid"));
    assertEq(hash, bytes32("hash"));
    assertEq(val, 100000e18);
  }

  function testComplianceRecord() public {
    vm.prank(owner);
    compliance.approveSubmitter(owner);
    vm.prank(owner);
    compliance.addRecord(bytes32("tx1"), bytes32("payload"), bytes32("cid"));
    (bytes32 p, bytes32 c,,) = compliance.records(bytes32("tx1"));
    assertEq(p, bytes32("payload"));
    assertEq(c, bytes32("cid"));
  }
}
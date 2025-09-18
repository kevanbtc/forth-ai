// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";

contract ComplianceRegistry is Ownable {
  struct TravelRuleRecord {
    bytes32 payloadHash; // Hash of compliance payload (e.g., encrypted user data)
    bytes32 cid;         // IPFS CID for full payload
    uint256 timestamp;
    address submitter;
  }

  mapping(bytes32 => TravelRuleRecord) public records; // txId => record
  mapping(address => bool) public approvedSubmitters;

  event RecordAdded(bytes32 indexed txId, bytes32 payloadHash, bytes32 cid);
  event SubmitterApproved(address indexed submitter);

  constructor(address initialOwner) Ownable(initialOwner) {}

  function approveSubmitter(address submitter) external onlyOwner {
    approvedSubmitters[submitter] = true;
    emit SubmitterApproved(submitter);
  }

  function addRecord(bytes32 txId, bytes32 payloadHash, bytes32 cid) external {
    require(approvedSubmitters[msg.sender], "Not approved submitter");
    records[txId] = TravelRuleRecord(payloadHash, cid, block.timestamp, msg.sender);
    emit RecordAdded(txId, payloadHash, cid);
  }

  function getRecord(bytes32 txId) external view returns (TravelRuleRecord memory) {
    return records[txId];
  }
}
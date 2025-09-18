// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "openzeppelin-contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "openzeppelin-contracts/token/ERC20/extensions/ERC20Permit.sol";
import {AccessControlDefaultAdminRules} from "openzeppelin-contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {Pausable} from "openzeppelin-contracts/security/Pausable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "openzeppelin-contracts/proxy/utils/Initializable.sol";
import {EIP712} from "openzeppelin-contracts/utils/cryptography/EIP712.sol";

interface IPorManager {
  function isMintAllowed(uint256 amount) external view returns (bool);
  function isBurnAllowed(uint256 amount) external view returns (bool);
}

contract StablecoinCore is
  Initializable, ERC20, ERC20Permit, Pausable,
  AccessControlDefaultAdminRules, UUPSUpgradeable
{
  bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
  bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
  bytes32 public constant MINTER_ROLE   = keccak256("MINTER_ROLE");
  bytes32 public constant BURNER_ROLE   = keccak256("BURNER_ROLE");

  IPorManager public por;
  uint256 public dailyMintCap;     // cap per rolling 24h
  uint256 public dailyBurnCap;
  uint256 public mintInEpoch;      // tracked inside epoch
  uint256 public burnInEpoch;
  uint48  public epochStart;       // unix start of rolling window (resets if >24h)

  event Minted(address indexed to, uint256 amount, bytes32 proofCid);
  event Burned(address indexed from, uint256 amount);
  event CapsUpdated(uint256 mintCap, uint256 burnCap);
  event PorManagerUpdated(address indexed por);
  event TravelRuleAttached(bytes32 indexed txId, bytes32 payloadHash, bytes32 cid);

  constructor() ERC20("Unykorn USD", "uUSD") ERC20Permit("Unykorn USD") {}

  function initialize(
    address admin, address guardian, address treasury, address porManager,
    uint256 _dailyMintCap, uint256 _dailyBurnCap
  ) public initializer {
    __AccessControlDefaultAdminRules_init(48 hours, admin);
    _grantRole(GUARDIAN_ROLE, guardian);
    _grantRole(TREASURY_ROLE, treasury);
    _grantRole(MINTER_ROLE, treasury);
    _grantRole(BURNER_ROLE, treasury);

    por = IPorManager(porManager);
    dailyMintCap = _dailyMintCap;
    dailyBurnCap = _dailyBurnCap;
    epochStart = uint48(block.timestamp);
  }

  // --- Admin / Guardian ---

  function pause() external onlyRole(GUARDIAN_ROLE) { _pause(); }
  function unpause() external onlyRole(GUARDIAN_ROLE) { _unpause(); }

  function setCaps(uint256 m, uint256 b) external onlyRole(GUARDIAN_ROLE) {
    dailyMintCap = m; dailyBurnCap = b; emit CapsUpdated(m,b);
  }

  function setPor(address p) external onlyRole(getRoleAdmin(GUARDIAN_ROLE)) {
    por = IPorManager(p); emit PorManagerUpdated(p);
  }

  // --- Mint / Burn (PoR-gated + caps) ---

  function _rollEpoch() internal {
    if (block.timestamp - epochStart >= 24 hours) {
      epochStart = uint48(block.timestamp);
      mintInEpoch = 0;
      burnInEpoch = 0;
    }
  }

  function mint(address to, uint256 amount, bytes32 proofCid)
    external whenNotPaused onlyRole(MINTER_ROLE)
  {
    _rollEpoch();
    require(mintInEpoch + amount <= dailyMintCap, "cap: mint");
    require(por.isMintAllowed(amount), "por: mint blocked");
    mintInEpoch += amount;
    _mint(to, amount);
    emit Minted(to, amount, proofCid);
  }

  function burn(address indexed from, uint256 amount)
    external whenNotPaused onlyRole(BURNER_ROLE)
  {
    _rollEpoch();
    require(burnInEpoch + amount <= dailyBurnCap, "cap: burn");
    require(por.isBurnAllowed(amount), "por: burn blocked");
    burnInEpoch += amount;
    _burn(from, amount);
    emit Burned(from, amount);
  }

  // Optional: attach Travel Rule metadata hash + IPFS CID for audit trails
  function attachTravelRule(bytes32 txId, bytes32 payloadHash, bytes32 cid)
    external onlyRole(TREASURY_ROLE)
  { emit TravelRuleAttached(txId, payloadHash, cid); }

  // --- Overrides ---

  function _authorizeUpgrade(address)
    internal override onlyRole(getRoleAdmin(GUARDIAN_ROLE)) {}
  function _beforeTokenTransfer(address from, address to, uint256 amount)
    internal override whenNotPaused { super._beforeTokenTransfer(from, to, amount); }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "openzeppelin-contracts/token/ERC721/ERC721.sol";
import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {IERC6551Registry} from "erc6551/interfaces/IERC6551Registry.sol";

contract VaultNFT is ERC721, Ownable {
  uint256 public nextTokenId = 1;
  IERC6551Registry public registry;
  address public accountImplementation;

  struct VaultData {
    bytes32 assetCID;      // IPFS CID for asset docs (appraisal, receipts)
    bytes32 assetHash;     // sha256 of docs for integrity
    uint256 valuation;     // USD valuation (for fractionalization calc)
    uint256 totalShares;   // ERC-1155 shares if fractionalized
    address custodian;     // Legal custodian (e.g., SPV wallet)
  }

  mapping(uint256 => VaultData) public vaults;

  event VaultMinted(uint256 indexed tokenId, bytes32 assetCID, bytes32 assetHash, uint256 valuation);
  event SharesFractionalized(uint256 indexed tokenId, uint256 shares);

  constructor(address _registry, address _implementation, address initialOwner)
    ERC721("RWA Vault", "RVAULT") Ownable(initialOwner)
  {
    registry = IERC6551Registry(_registry);
    accountImplementation = _implementation;
  }

  function mintVault(
    address to, bytes32 assetCID, bytes32 assetHash, uint256 valuation, address custodian
  ) external onlyOwner returns (uint256 tokenId) {
    tokenId = nextTokenId++;
    _mint(to, tokenId);
    vaults[tokenId] = VaultData(assetCID, assetHash, valuation, 0, custodian);

    // Create ERC-6551 account
    registry.createAccount(accountImplementation, block.chainid, address(this), tokenId, 0, "");

    emit VaultMinted(tokenId, assetCID, assetHash, valuation);
  }

  function getVaultAccount(uint256 tokenId) external view returns (address) {
    return registry.account(accountImplementation, block.chainid, address(this), tokenId, 0);
  }

  // Optional: fractionalize into ERC-1155 shares (stub)
  function fractionalize(uint256 tokenId, uint256 shares) external onlyOwner {
    vaults[tokenId].totalShares = shares;
    emit SharesFractionalized(tokenId, shares);
  }
}
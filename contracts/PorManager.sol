// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface AggregatorV3Interface {
  function latestRoundData() external view returns (
    uint80, int256 answer, uint256 startedAt, uint256 updatedAt, uint80
  );
}

contract PorManager {
  AggregatorV3Interface public priceFeed; // e.g., USD collateral price
  uint256 public immutable decimals;      // scale to 1e8/1e18 as needed

  uint256 public maxDeviationBps;   // e.g., 500 = 5% vs last accepted
  uint256 public staleAfter;        // e.g., 15 minutes
  int256  public lastPrice;         // cached accepted price

  event PriceAccepted(int256 price, uint256 updatedAt);

  constructor(address _feed, uint256 _decimals, uint256 _stale, uint256 _devBps) {
    priceFeed = AggregatorV3Interface(_feed);
    decimals = _decimals;
    staleAfter = _stale;
    maxDeviationBps = _devBps;
  }

  function _checkFresh(int256 price, uint256 updatedAt) internal view returns (bool) {
    if (price <= 0) return false;
    if (block.timestamp > updatedAt + staleAfter) return false;
    if (lastPrice != 0) {
      int256 diff = price - lastPrice;
      if (diff < 0) diff = -diff;
      // compare in bps without precision loss
      if (uint256(diff) * 10_000 > uint256(lastPrice) * maxDeviationBps) return false;
    }
    return true;
  }

  function refresh() public returns (bool) {
    (, int256 p,, uint256 t,) = priceFeed.latestRoundData();
    bool ok = _checkFresh(p, t);
    if (ok) {
      lastPrice = p;
      emit PriceAccepted(p, t);
    }
    return ok;
  }

  // Hook surface (can be extended to actual PoR balances):
  function isMintAllowed(uint256) external view returns (bool) { return lastPrice > 0; }
  function isBurnAllowed(uint256) external view returns (bool) { return lastPrice > 0; }
}
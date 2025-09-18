# Operator Runbooks

## Pause / Resume
- Guardian calls `pause()` / `unpause()` on StablecoinCore.
- Discord bot can flag these in PR reviews.

## Oracle Stale
- PorManager.refresh() fails → mint/burn blocked.
- Guardian can lower caps or rotate feed.
- Emergency window via GuardianTimelock.

## Upgrades
- UUPS protected by admin (Safe) behind Timelock.
- Storage layout checks in CI; PR must pass Slither + coverage.

## Monitoring & Alerts

### Tenderly Setup
1. Create project at https://dashboard.tenderly.co/
2. Add contracts: StablecoinCore, PorManager, GuardianTimelock
3. Set alerts:
   - `StablecoinCore.Paused()` or `Unpaused()` → Slack/Discord
   - `StablecoinCore.CapsUpdated()` → Notify ops
   - `PorManager.PriceAccepted()` → Confirm oracle health
   - Large mints/burns (>50k uUSD) → Alert treasury
4. Webhooks to Discord bot for automated responses.

### Dune Analytics
- Query totalSupply, cap usage, epoch data
- Dashboard: https://dune.com/ (create queries for your contracts)

### Forta (Optional)
- Deploy anomaly detection bots for:
  - Mints near daily cap
  - Oracle stale >15min
  - Unauthorized callers

## Emergency Playbook

### Oracle Failure
1. Check PorManager.lastPrice == 0 → Mint/Burn blocked
2. Guardian: Reduce caps to 0 via Timelock (48h queue)
3. Rotate Chainlink feed if needed
4. Resume after oracle recovers

### Large Mint/Burn
- Alert treasury Safe
- Verify via Dune/Flipside
- If suspicious, pause via Guardian

### Upgrade Rollback
- UUPS allows proxy rollback
- Queue new implementation via Timelock
- Verify storage layout unchanged

### Security Incident
- Pause immediately via Guardian
- Notify all roles
- Audit logs via Tenderly
- Coordinate with Safe multisigs
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
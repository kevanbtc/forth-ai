# Safe Proposal Helper

This file contains pre-built JSON templates for Safe multisig proposals. Use these in your Safe UI or Gnosis Safe app to queue privileged operations (caps, pause, setPor, mint).

## How to Use

1. Copy the JSON below.
2. Paste into Safe UI → "New Transaction" → "Contract Interaction".
3. Fill in placeholders (addresses, values).
4. Propose → Sign → Execute (or queue with Timelock if applicable).

## Templates

### Set Caps (via Timelock, 48h delay)

Queue a cap increase/decrease. Requires Admin Safe approval.

```json
{
  "to": "0xGuardianTimelockProxy...",
  "value": "0",
  "data": "0x" /* abi.encodeWithSignature("schedule(address,uint256,bytes,bytes32,bytes32,uint256)", stablecoinCore, 0, data, predecessor, salt, delay) where data is setCaps encoded */,
  "operation": 0
}
```

Raw setCaps data (for Timelock schedule):

```bash
cast calldata "setCaps(uint256,uint256)" 500000e18 500000e18
```

### Pause (Emergency, immediate via Guardian Safe)

```json
{
  "to": "0xStablecoinCoreProxy...",
  "value": "0",
  "data": "0x8456cb59",  // pause()
  "operation": 0
}
```

### Unpause

```json
{
  "to": "0xStablecoinCoreProxy...",
  "value": "0",
  "data": "0x3f4ba83a",  // unpause()
  "operation": 0
}
```

### Set Por (Change Oracle, via Timelock)

```json
{
  "to": "0xGuardianTimelockProxy...",
  "value": "0",
  "data": "0x" /* schedule setPor */,
  "operation": 0
}
```

### Mint (via Treasury Safe)

```json
{
  "to": "0xStablecoinCoreProxy...",
  "value": "0",
  "data": "0x" /* abi.encodeWithSignature("mint(address,uint256,bytes32)", recipient, amount, proofCidHash) */,
  "operation": 0
}
```

Mint data example:

```bash
cast calldata "mint(address,uint256,bytes32)" 0xRecipient 1000e18 0x<proofCidHash>
```

### Burn

```json
{
  "to": "0xStablecoinCoreProxy...",
  "value": "0",
  "data": "0x" /* abi.encodeWithSignature("burn(uint256)", amount) */,
  "operation": 0
}
```

### Grant Role

```json
{
  "to": "0xStablecoinCoreProxy...",
  "value": "0",
  "data": "0x" /* abi.encodeWithSignature("grantRole(bytes32,address)", role, account) */,
  "operation": 0
}
```

Roles:
- MINTER_ROLE: `cast keccak "MINTER_ROLE"`
- GUARDIAN_ROLE: `cast keccak "GUARDIAN_ROLE"`
- DEFAULT_ADMIN_ROLE: `cast keccak "DEFAULT_ADMIN_ROLE"`

## Automation

For Discord bot integration, see `discord/src/register-commands.js` for `/ops-caps` and future `/mint-vault` commands that auto-generate these JSONs.
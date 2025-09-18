# Ledger Deploy Guide

This guide covers deploying to mainnet using a hardware wallet (Ledger or Trezor) for maximum security—no private keys leave your device.

## Prerequisites

- Hardware wallet (Ledger with Ethereum app installed, or Trezor)
- Foundry installed
- `.env.mainnet` configured (see main README)
- Etherscan API key set locally: `export ETHERSCAN_API_KEY='<your_key>'`

## Steps

1. **Plug in your hardware wallet** and ensure the Ethereum app is open/selected.

2. **Set the sender address** (your hardware wallet's Ethereum address):

   ```bash
   export SENDER='<YOUR_LEDGER_ADDRESS>'
   ```

3. **Build contracts**:

   ```bash
   forge build --sizes
   ```

4. **Deploy with Ledger signing**:

   ```bash
   forge script script/Deploy.s.sol \
     --rpc-url "$RPC" \
     --ledger \
     --ledger-chain-id 1 \
     --sender "$SENDER" \
     --broadcast --verify --slow -vvvv
   ```

   - If using a custom derivation path (e.g., for multiple accounts):

     ```bash
     --hd-path "m/44'/60'/0'/0/0"
     ```

5. **Confirm on device**: Review and approve each transaction on your Ledger screen.

6. **Post-deploy**: Follow the main README for address capture, keeper setup, and sanity checks.

## Troubleshooting

- **"Ledger not found"**: Ensure device is connected and unlocked.
- **Chain ID mismatch**: Confirm `--ledger-chain-id 1` for mainnet.
- **Sender mismatch**: Double-check `$SENDER` matches your Ledger address.

## Security Notes

- Private keys never leave the hardware wallet.
- Transactions are signed on-device.
- Use a fresh Ledger account if possible for deployment.
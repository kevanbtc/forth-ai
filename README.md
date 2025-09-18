# Forth Project

This is a simple Forth project with a Hello World program.

## Prerequisites

Install Gforth (GNU Forth) on your system.

- On Windows, you can download from https://gforth.org/ or use a package manager like Chocolatey: `choco install gforth`

## Running the Project

To run the Hello World program:

```
gforth src/main.fth
```

This should output: Hello, World!

## AI Integration (GPT-5 Placeholder)

This project includes an advanced AI inference script using OpenAI's GPT-4o model as a placeholder for GPT-5.

### Setup

1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Set the environment variable:
   ```
   $env:OPENAI_API_KEY = "your-api-key-here"
   ```
   Or set it permanently in your system environment variables.

### Usage

Run AI inference with a prompt:

```
.\scripts\infer.ps1 "Explain quantum computing in simple terms"
```

#### Advanced Options

- **Model Selection**: Choose different models (e.g., GPT-4o, GPT-4o-mini)
  ```
  .\scripts\infer.ps1 "Hello" -Model "gpt-4o-mini"
  ```

- **Parameter Tuning**: Adjust temperature and max tokens
  ```
  .\scripts\infer.ps1 "Write a poem" -Temperature 0.9 -MaxTokens 500
  ```

- **Conversation History**: The script maintains persistent chat history in `conversation.json`. Follow-up prompts will remember previous context.

- **Logging**: All interactions are logged to `ai_log.txt` with timestamps, parameters, prompts, and responses.

#### Example with All Options

```
.\scripts\infer.ps1 "What's the weather like?" -Model "gpt-4o" -Temperature 0.5 -MaxTokens 200 -HistoryFile "my_chat.json" -LogFile "custom_log.txt"
```

This will use GPT-4o with lower creativity, limited tokens, and save history/log to custom files.

When GPT-5 is released, update the `-Model` parameter to `"gpt-5"`.## Project Structure

- `src/main.fth`: Main Forth file with Hello World definition and execution.
- `scripts/infer.ps1`: Advanced PowerShell script for AI inference with conversation history, model switching, and logging.
- `conversation.json`: Stores conversation history (created automatically).
- `ai_log.txt`: Logs all AI interactions (created automatically).
- `discord/`: Discord bot integration for chatting with the AI in Discord servers.

## Discord Bot Integration

The repo includes a Discord bot that brings the AI brain to your Discord server. It supports slash commands for chatting, setting models, and resetting history.

See `discord/README.md` for setup and deployment instructions.

### Quick Setup

1. Create a Discord application and bot.
2. Set environment variables in `discord/.env`.
3. Run `npm run register` to register commands.
4. Deploy locally or to Railway/Render.

## Web3 Stablecoin Infrastructure

This project now includes a production-ready stablecoin implementation on Ethereum-compatible chains, featuring Proof-of-Reserves (PoR), daily mint/burn caps, role-based access control, and upgradeability.

### Architecture

- **StablecoinCore.sol**: ERC20 stablecoin with UUPS upgrades, pausing, caps, and PoR integration.
- **PorManager.sol**: Chainlink price feed integration for PoR validation with deviation checks.
- **Roles**: Admin, Guardian, Treasury, Minter, Burner with timelock-protected upgrades.
- **Security**: OpenZeppelin contracts, Slither static analysis, Foundry testing with invariants.

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) for Solidity development and testing.
- Node.js for deployment scripts (if needed).

### Building and Testing

Install dependencies and build:

```
forge install
forge build
```

Run tests:

```
forge test -vvv
```

Run coverage:

```
forge coverage
```

### Deployment

Set environment variables (see `ops/addresses.example.json`):

```
export ADMIN=0x...
export GUARDIAN=0x...
export TREASURY=0x...
export CL_FEED=0x...  # Chainlink USD feed
```

Deploy:

```
forge script script/Deploy.s.sol --rpc-url <your-rpc> --broadcast --verify
```

### Operations

- **CI/CD**: GitHub Actions run Forge tests and Slither on PRs.
- **Runbooks**: See `ops/policy.md` for pause/resume, oracle issues, and upgrades.
- **Monitoring**: Track caps, PoR status, and events via The Graph or custom dashboards.

## RWA Tokenization Infrastructure

This project now supports **Real-World Asset (RWA) tokenization** with compliant vaults, token-bound accounts, and proof-of-reserves.

### Architecture

- **VaultNFT.sol**: ERC-721 vaults for individual assets (one NFT = one asset lot).
- **VaultAccountFactory.sol**: ERC-6551 token-bound accounts for programmable custody.
- **ComplianceRegistry.sol**: Travel Rule compliance with payload hashes and IPFS CIDs.
- **Proofs**: Every mint/burn references a `proofCID` (IPFS hash of docs: appraisals, receipts, PoR).

### Minting RWAs

1. **Pin Docs to IPFS/Pinata**: Encrypt sensitive docs, get CID + sha256 hash.
2. **Mint Vault**: `vault.mintVault(to, assetCID, assetHash, valuation, custodian)`
3. **Bind Account**: Automatic ERC-6551 account creation for payouts/transfers.
4. **Fractionalize** (optional): Split into ERC-1155 shares for liquidity.
5. **Compliance**: Attach Travel Rule payloads via `ComplianceRegistry.addRecord()`.

### Deployment

Set ERC-6551 registry and implementation addresses:

```
export ERC6551_REGISTRY=0x...  # Deployed registry
export ACCOUNT_IMPLEMENTATION=0x...  # ERC-6551 account impl
forge script script/Deploy.s.sol --rpc-url $RPC --broadcast
```

### Example Commands

**Mint a vault for $100k asset:**

```bash
cast send <VaultNFT> "mintVault(address,bytes32,bytes32,uint256,address)" \
  <to> 0x<cid> 0x<hash> 100000e18 <custodian> --rpc-url $RPC --private-key $PK
```

**Add compliance record:**

```bash
cast send <ComplianceRegistry> "addRecord(bytes32,bytes32,bytes32)" \
  0x<txId> 0x<payloadHash> 0x<cid> --rpc-url $RPC --private-key $PK
```

### Compliance Notes

- **Travel Rule**: Payload hash + CID for jurisdiction-tagged data.
- **Custody**: Legal wrappers (SPVs) define rights and redemptions.
- **Docs**: Pin encrypted docs to IPFS, record CID/hash on-chain.
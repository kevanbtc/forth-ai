import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [
  new SlashCommandBuilder()
    .setName("chat")
    .setDescription("Chat with the repo brain")
    .addStringOption(o => o.setName("prompt").setDescription("Your message").setRequired(true)),
  new SlashCommandBuilder()
    .setName("setmodel")
    .setDescription("Set model for this channel")
    .addStringOption(o => o.setName("model").setDescription("e.g., gpt-4o, gpt-4o-mini").setRequired(true)),
  new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Clear conversation history for this channel"),
  new SlashCommandBuilder()
    .setName("review-file")
    .setDescription("AI review of an uploaded file (code/diff/text)")
    .addAttachmentOption(o =>
      o.setName("file").setDescription("Attach a text file (≤1MB)").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("prompt").setDescription("Optional guidance to steer the review")
    ),
  new SlashCommandBuilder()
    .setName("explain-forth")
    .setDescription("Explain (and optionally run) a Forth snippet")
    .addStringOption(o =>
      o.setName("code").setDescription("Forth code to analyze").setRequired(true)
    )
    .addBooleanOption(o =>
      o.setName("run").setDescription("Execute with gforth (requires ENABLE_FORTH_EXEC=1)")
    ),
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Get stablecoin status from chain (supply, caps, oracle)")
    .addStringOption(o =>
      o.setName("rpc").setDescription("RPC URL").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("stablecoin").setDescription("StablecoinCore address").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("por").setDescription("PorManager address").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("ops-caps")
    .setDescription("Generate timelock TX data for cap updates")
    .addStringOption(o =>
      o.setName("mint").setDescription("New mint cap (e.g., 250000)").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("burn").setDescription("New burn cap (e.g., 250000)").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("timelock").setDescription("GuardianTimelock address").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("review-pr")
    .setDescription("AI review of a GitHub PR diff")
    .addStringOption(o =>
      o.setName("pr").setDescription("PR number (e.g., 123)").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("repo").setDescription("Repo (owner/repo)").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("portal")
    .setDescription("Show links, addresses, dashboards from ops/index.json"),
  new SlashCommandBuilder()
    .setName("where")
    .setDescription("Find a thing from the ops index")
    .addStringOption(o => o.setName("key").setDescription("e.g., StablecoinCore, Blockscout").setRequired(true)),
  new SlashCommandBuilder()
    .setName("llm")
    .setDescription("Switch local/provider and model on the fly")
    .addStringOption(o => o.setName("provider").setDescription("ollama|openai|powershell").setRequired(true))
    .addStringOption(o => o.setName("model").setDescription("e.g., unykorn-ops, llama3.1:8b")),
  new SlashCommandBuilder()
    .setName("task")
    .setDescription("Manage agent tasks")
    .addSubcommand(sub =>
      sub.setName("start")
        .setDescription("Start a task by ID")
        .addStringOption(o => o.setName("id").setDescription("Task ID").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("status")
        .setDescription("Check task status")
        .addStringOption(o => o.setName("id").setDescription("Task ID").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("approve")
        .setDescription("Approve task bundle")
        .addStringOption(o => o.setName("id").setDescription("Task ID").setRequired(true))
    ),
  new SlashCommandBuilder()
    .setName("mint-vault")
    .setDescription("Build Safe JSON to mint a VaultNFT")
    .addStringOption(o => o.setName("to").setDescription("Recipient addr").setRequired(true))
    .addStringOption(o => o.setName("cid").setDescription("IPFS CID for docs").setRequired(true))
    .addStringOption(o => o.setName("hash").setDescription("sha256 hex").setRequired(true))
    .addStringOption(o => o.setName("notional").setDescription("Amount in wei").setRequired(true)),
  new SlashCommandBuilder()
    .setName("add-compliance")
    .setDescription("Build Safe JSON for ComplianceRegistry.addRecord")
    .addIntegerOption(o => o.setName("vaultid").setDescription("Vault tokenId").setRequired(true))
    .addStringOption(o => o.setName("cid").setDescription("Travel-rule CID").setRequired(true))
    .addStringOption(o => o.setName("hash").setDescription("sha256 hex").setRequired(true))
    .addIntegerOption(o => o.setName("iso").setDescription("ISO code (e.g., 840)").setRequired(true)),
  new SlashCommandBuilder()
    .setName("transfer-vault")
    .setDescription("Build Safe JSON for VaultNFT.safeTransferFrom")
    .addIntegerOption(o => o.setName("vaultid").setDescription("Vault tokenId").setRequired(true))
    .addStringOption(o => o.setName("to").setDescription("Recipient addr").setRequired(true)),
  new SlashCommandBuilder()
    .setName("set-vault-metadata")
    .setDescription("Build Safe JSON to update vault docs")
    .addIntegerOption(o => o.setName("vaultid").setDescription("Vault tokenId").setRequired(true))
    .addStringOption(o => o.setName("cid").setDescription("New IPFS CID").setRequired(true))
    .addStringOption(o => o.setName("hash").setDescription("New sha256 hex").setRequired(true)),
  new SlashCommandBuilder()
    .setName("distribute-payout")
    .setDescription("Safe JSON: distribute vault payout from 6551")
    .addIntegerOption(o => o.setName("vaultid").setDescription("Vault tokenId").setRequired(true))
    .addStringOption(o => o.setName("asset").setDescription("Asset address").setRequired(true))
    .addStringOption(o => o.setName("amount").setDescription("Amount in wei").setRequired(true)),
  new SlashCommandBuilder()
    .setName("redeem-vault")
    .setDescription("Safe JSON: close a vault and release residuals")
    .addIntegerOption(o => o.setName("vaultid").setDescription("Vault tokenId").setRequired(true))
    .addStringOption(o => o.setName("to").setDescription("Beneficiary address").setRequired(true)),
  new SlashCommandBuilder()
    .setName("burn-vault")
    .setDescription("Safe JSON: burn a closed vault")
    .addIntegerOption(o => o.setName("vaultid").setDescription("Vault tokenId").setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function main() {
  const appId = process.env.DISCORD_APP_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: commands });
    console.log("✅ Registered guild commands");
  } else {
    await rest.put(Routes.applicationCommands(appId), { body: commands });
    console.log("✅ Registered global commands");
  }
}
main().catch(console.error);
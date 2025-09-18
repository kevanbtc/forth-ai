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
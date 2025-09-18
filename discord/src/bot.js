import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import invariant from "tiny-invariant";
import { HistoryStore } from "./historyStore.js";
import { makeOpenAI } from "./openai.js";
import { spawn } from "node:child_process";
import fs from "fs-extra";

const {
  DISCORD_TOKEN, OPENAI_API_KEY, OPENAI_MODEL,
  HISTORY_DIR = "./discord_data",
  USE_POWERSHELL = "0", POWERSHELL_CMD = "pwsh", INFER_SCRIPT = "./infer.ps1",
  TEMPERATURE = "0.3", MAX_TOKENS = "600"
} = process.env;

invariant(DISCORD_TOKEN, "DISCORD_TOKEN required");
const history = new HistoryStore(HISTORY_DIR);

await history.init();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel]
});

const systemPrompt =
  "You are a concise, senior engineering assistant embedded in a GitHub repo. " +
  "Prefer exact, actionable steps, short code blocks, and safe defaults.";

const openaiChat = OPENAI_API_KEY
  ? makeOpenAI({
      apiKey: OPENAI_API_KEY,
      model: OPENAI_MODEL || "gpt-4o-mini",
      temperature: Number(TEMPERATURE),
      maxTokens: Number(MAX_TOKENS)
    })
  : null;

async function callPowerShell(prompt) {
  return new Promise((resolve, reject) => {
    const ps = spawn(POWERSHELL_CMD, [INFER_SCRIPT, "-Prompt", prompt, "-Model", OPENAI_MODEL || "gpt-4o-mini", "-Temperature", TEMPERATURE, "-MaxTokens", MAX_TOKENS], { shell: false });
    let out = "", err = "";
    ps.stdout.on("data", d => (out += d.toString()));
    ps.stderr.on("data", d => (err += d.toString()));
    ps.on("close", code => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(`infer.ps1 failed (${code}): ${err}`));
    });
  });
}

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "reset") {
      await history.clear(interaction.channelId);
      await interaction.reply({ content: "♻️ History cleared for this channel.", ephemeral: true });
      return;
    }

    if (interaction.commandName === "setmodel") {
      const model = interaction.options.getString("model", true);
      await history.setModel(interaction.channelId, model);
      await interaction.reply({ content: `🧠 Model set to \`${model}\` for this channel.`, ephemeral: true });
      return;
    }

    if (interaction.commandName === "chat") {
      const prompt = interaction.options.getString("prompt", true);
      await interaction.deferReply();

      const chanModel = (await history.getModel(interaction.channelId)) || OPENAI_MODEL || "gpt-4o-mini";
      const prior = await history.load(interaction.channelId);

      // Build messages (keep last 10 user/assistant pairs)
      const trimmed = prior.slice(-20);
      const messages = [
        ...trimmed,
        { role: "user", content: prompt }
      ];

      let reply;
      if (USE_POWERSHELL === "1") {
        reply = await callPowerShell(prompt);
      } else {
        if (!openaiChat) {
          await interaction.editReply("OPENAI_API_KEY not set and USE_POWERSHELL=0. Set one path.");
          return;
        }
        reply = await openaiChat({ system: systemPrompt, messages: [{ role: "system", content: `Model: ${chanModel}` }, ...messages] });
      }

      const record = [
        ...messages,
        { role: "assistant", content: reply }
      ];
      await history.save(interaction.channelId, record);

      // Discord message chunking safety
      const chunks = chunk(reply, 1900);
      for (let i = 0; i < chunks.length; i++) {
        if (i === 0) await interaction.editReply(chunks[i]);
        else await interaction.followUp(chunks[i]);
      }
    }
  } catch (e) {
    console.error(e);
    if (interaction.isRepliable()) {
      await interaction.reply({ content: `❌ Error: ${e.message}`, ephemeral: true }).catch(() => {});
    }
  }
});

client.login(DISCORD_TOKEN);

function chunk(text, size) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + size));
    i += size;
  }
  return out;
}
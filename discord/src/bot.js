import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import invariant from "tiny-invariant";
import { HistoryStore } from "./historyStore.js";
import { makeOpenAI } from "./openai.js";
import { fetchText, trimForPrompt } from "./fileIngest.js";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import fs from "fs-extra";

const {
  DISCORD_TOKEN, OPENAI_API_KEY, OPENAI_MODEL,
  HISTORY_DIR = "./discord_data",
  USE_POWERSHELL = "0", POWERSHELL_CMD = "pwsh", INFER_SCRIPT = "./infer.ps1",
  TEMPERATURE = "0.3", MAX_TOKENS = "600",
  MAX_ATTACH_BYTES = "1048576",
  ENABLE_FORTH_EXEC = "0",
  FORTH_CMD = "gforth",
  FORTH_TIMEOUT_MS = "6000"
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

    // /review-file
    if (interaction.commandName === "review-file") {
      const att = interaction.options.getAttachment("file", true);
      const userPrompt = interaction.options.getString("prompt") || "";
      await interaction.deferReply();

      if ((att.size ?? 0) > Number(MAX_ATTACH_BYTES)) {
        await interaction.editReply(`❌ File too big. Max is ${MAX_ATTACH_BYTES} bytes.`);
        return;
      }

      // naive type check (still allow text/*, json, diff, md, code)
      const ct = (att.contentType || "").toLowerCase();
      const ok = ct.startsWith("text/") || /json|diff|markdown|md|x-sh|x-python|x-csrc|x-c\+\+|x-java/i.test(ct);
      if (!ok && !att.name.match(/\.(txt|md|diff|patch|json|sol|js|ts|ps1|sh|py|c|cpp|h|java|go|rs|forth|fs|fsx)$/i)) {
        await interaction.editReply(`❌ Unsupported file type. Please upload a text/code file.`);
        return;
      }

      const raw = await fetchText(att.url, Number(MAX_ATTACH_BYTES));
      const text = trimForPrompt(raw);

      const prompt = [
        "You are a senior reviewer. Analyze the attached file content.",
        "If it looks like a DIFF/PATCH, summarize changes, risk, and tests to add.",
        "If it's code, point out complexity, correctness risks, and propose 3–5 focused tests.",
        userPrompt ? `User guidance: ${userPrompt}` : "",
        "",
        "----- BEGIN FILE -----",
        text,
        "----- END FILE -----"
      ].join("\n");

      const reply = (USE_POWERSHELL === "1")
        ? await callPowerShell(prompt)
        : await openaiChat({ system: systemPrompt, messages: [{ role: "user", content: prompt }] });

      // persist brief history marker, don’t store the whole file
      const prior = await history.load(interaction.channelId);
      prior.push({ role: "user", content: `review-file:${att.name}${userPrompt ? ` | ${userPrompt}` : ""}` });
      prior.push({ role: "assistant", content: reply });
      await history.save(interaction.channelId, prior);

      const chunks = chunk(reply, 1900);
      await interaction.editReply(chunks.shift() || "No output");
      for (const c of chunks) await interaction.followUp(c);
      return;
    }

    // /explain-forth
    if (interaction.commandName === "explain-forth") {
      const code = interaction.options.getString("code", true);
      const doRun = interaction.options.getBoolean("run") || false;
      await interaction.deferReply();

      let runOutput = "";
      if (doRun) {
        if (ENABLE_FORTH_EXEC !== "1") {
          await interaction.editReply("⚠️ Execution disabled. Set `ENABLE_FORTH_EXEC=1` to allow running gforth.");
          return;
        }
        runOutput = await runForth(code, {
          cmd: FORTH_CMD,
          timeoutMs: Number(FORTH_TIMEOUT_MS),
        }).catch(e => `!Execution error: ${e.message}`);
      }

      const prompt = [
        "Explain the following Forth code to a seasoned engineer in concise terms.",
        "Highlight stack effects, key words used, and potential pitfalls.",
        doRun ? "A program run was executed; interpret the output and link it to the code’s behavior." : "",
        "",
        "----- CODE -----",
        code,
        "----- OUTPUT -----",
        runOutput || "(not executed)",
      ].join("\n");

      const reply = (USE_POWERSHELL === "1")
        ? await callPowerShell(prompt)
        : await openaiChat({ system: systemPrompt, messages: [{ role: "user", content: prompt }] });

      const prior = await history.load(interaction.channelId);
      prior.push({ role: "user", content: `/explain-forth run=${doRun}` });
      prior.push({ role: "assistant", content: reply });
      await history.save(interaction.channelId, prior);

      const chunks = chunk(reply, 1900);
      await interaction.editReply(chunks.shift() || "No output");
      for (const c of chunks) await interaction.followUp(c);
      return;
    }
  } catch (e) {
    console.error(e);
    if (interaction.isRepliable()) {
      await interaction.reply({ content: `❌ Error: ${e.message}`, ephemeral: true }).catch(() => {});
    }
  }
});

client.login(DISCORD_TOKEN);

async function runForth(code, { cmd, timeoutMs }) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forth-"));
  const file = path.join(tmpDir, "snippet.fth");
  await fs.writeFile(file, code, "utf8");

  return new Promise((resolve, reject) => {
    const ps = spawn(cmd, [file], { shell: false });
    let out = "", err = "";
    const timer = setTimeout(() => {
      ps.kill("SIGKILL");
      reject(new Error(`gforth timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    ps.stdout.on("data", d => (out += d.toString()));
    ps.stderr.on("data", d => (err += d.toString()));
    ps.on("close", code => {
      clearTimeout(timer);
      if (code === 0) resolve(out.trim() || "(no output)");
      else reject(new Error(err.trim() || `gforth exited ${code}`));
    });
  });
}

function chunk(text, size) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + size));
    i += size;
  }
  return out;
}
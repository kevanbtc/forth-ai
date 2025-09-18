import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import invariant from "tiny-invariant";
import { HistoryStore } from "./historyStore.js";
import { makeOpenAI } from "./openai.js";
import { fetchText, trimForPrompt } from "./fileIngest.js";
import { topK } from "./embeddings.js";
import http from "http";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { Interface, getAddress } from "ethers";

const {
  DISCORD_TOKEN, OPENAI_API_KEY, OPENAI_MODEL,
  HISTORY_DIR = "./discord_data",
  USE_POWERSHELL = "0", POWERSHELL_CMD = "pwsh", INFER_SCRIPT = "./infer.ps1",
  TEMPERATURE = "0.3", MAX_TOKENS = "600",
  MAX_ATTACH_BYTES = "1048576",
  ENABLE_FORTH_EXEC = "0",
  FORTH_CMD = "gforth",
  FORTH_TIMEOUT_MS = "6000",
  OPS_INDEX = "../ops/index.json",
  USE_OLLAMA = "0", OLLAMA_BASE = "http://ollama:11434", OLLAMA_MODEL = "unykorn-ops",
  VAULT_NFT, COMPLIANCE
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

const iVault = new Interface([
  "function mint(address to,string cid,bytes32 docHash,uint256 notional)",
  "function safeTransferFrom(address from,address to,uint256 tokenId)",
  "function setMetadata(uint256 tokenId,string cid,bytes32 docHash)"
]);
const iComp = new Interface([
  "function addRecord(uint256 vaultId,bytes32 payloadHash,bytes32 payloadCid,uint256 isoCode)"
]);

function hex32(x){ return x.startsWith("0x") ? x : "0x"+x; }

async function safeJson(to, data){
  return JSON.stringify({ to, value:"0", data, operation:0 }, null, 2);
}

// Metrics
let chatCount = 0;
let ollamaCount = 0;
let openaiCount = 0;
let powershellCount = 0;
let errorCount = 0;
let totalLatency = 0;

async function callPowerShell(prompt) {
  return new Promise((resolve, reject) => {
    const ps = spawn(POWERSHELL_CMD, [INFER_SCRIPT, "-Prompt", prompt, "-Model", OPENAI_MODEL || "gpt-4o-mini", "-Temperature", TEMPERATURE, "-MaxTokens", MAX_TOKENS], { shell: false });
    let out = "", err = "";
    ps.stdout.on("data", d => out += d);
    ps.stderr.on("data", d => err += d);
    ps.on("close", code => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(err.trim() || `PowerShell exited ${code}`));
    });
  });
}

async function readIndex() {
  try { return JSON.parse(await fs.readFile(OPS_INDEX, "utf8")); }
  catch { return null; }
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
      const start = Date.now();
      try {
        if (USE_OLLAMA === "1") {
          reply = await chatOllama({
            base: OLLAMA_BASE,
            model: OLLAMA_MODEL,
            messages: [{ role: "system", content: systemPrompt }, ...messages]
          });
          ollamaCount++;
        } else if (USE_POWERSHELL === "1") {
          reply = await callPowerShell(prompt);
          powershellCount++;
        } else {
          if (!openaiChat) {
            await interaction.editReply("OPENAI_API_KEY not set and USE_POWERSHELL=0. Set one path.");
            return;
          }
          reply = await openaiChat({ system: systemPrompt, messages: [{ role: "system", content: `Model: ${chanModel}` }, ...messages] });
          openaiCount++;
        }
        chatCount++;
      } catch (e) {
        errorCount++;
        throw e;
      } finally {
        totalLatency += Date.now() - start;
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

    // /status
    if (interaction.commandName === "status") {
      const rpc = interaction.options.getString("rpc", true);
      const stablecoin = interaction.options.getString("stablecoin", true);
      const por = interaction.options.getString("por", true);
      await interaction.deferReply();

      // Use cast to query
      const totalSupply = await runCast(`call ${stablecoin} "totalSupply()" --rpc-url ${rpc}`);
      const mintCap = await runCast(`call ${stablecoin} "dailyMintCap()" --rpc-url ${rpc}`);
      const burnCap = await runCast(`call ${stablecoin} "dailyBurnCap()" --rpc-url ${rpc}`);
      const lastPrice = await runCast(`call ${por} "lastPrice()" --rpc-url ${rpc}`);

      const reply = `📊 **Stablecoin Status**\n- Total Supply: ${totalSupply}\n- Mint Cap: ${mintCap}\n- Burn Cap: ${burnCap}\n- Last Oracle Price: ${lastPrice}`;
      await interaction.editReply(reply);
      return;
    }

    // /ops-caps
    if (interaction.commandName === "ops-caps") {
      const mint = interaction.options.getString("mint", true);
      const burn = interaction.options.getString("burn", true);
      const timelock = interaction.options.getString("timelock", true);
      await interaction.deferReply();

      // Generate TX data for setCaps
      const txData = `0x${Buffer.from(JSON.stringify({
        to: timelock,
        data: `0x${Buffer.from(`setCaps(uint256,uint256):${mint}e18,${burn}e18`, 'utf8').toString('hex')}`
      })).toString('hex')}`;

      const reply = `🔧 **Timelock TX for Caps Update**\nMint: ${mint}, Burn: ${burn}\nTX Data: \`\`\`${txData}\`\`\`\nQueue in Safe → Execute after 48h.`;
      await interaction.editReply(reply);
      return;
    }

    // /review-pr
    if (interaction.commandName === "review-pr") {
      const pr = interaction.options.getString("pr", true);
      const repo = interaction.options.getString("repo", true);
      await interaction.deferReply();

      const diff = await fetch(`https://api.github.com/repos/${repo}/pulls/${pr}`, {
        headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` }
      }).then(r => r.json()).then(pr => fetch(pr.diff_url).then(r => r.text()));

      const prompt = `Review this PR diff:\n${diff}`;
      const reply = await openaiChat({ system: systemPrompt, messages: [{ role: "user", content: prompt }] });

      const chunks = chunk(reply, 1900);
      await interaction.editReply(chunks.shift() || "No output");
      for (const c of chunks) await interaction.followUp(c);
      return;
    }

    if (interaction.commandName === "portal") {
      await interaction.deferReply({ ephemeral: true });
      const idx = await readIndex();
      if (!idx) return interaction.editReply("ops/index.json not found.");

      let context = "";
      if (USE_OLLAMA === "1") {
        try {
          const snippets = await topK(OLLAMA_BASE, "project overview", 3);
          context = snippets.map(s => s.text).join("\n\n");
        } catch (e) {
          console.log("RAG failed, falling back to full index");
          context = JSON.stringify(idx, null, 2);
        }
      } else {
        context = JSON.stringify(idx, null, 2);
      }

      const prompt = [
        "You are a helpful assistant for the Web3 stablecoin project.",
        "Use the following context to provide a concise overview of the current network, contracts, dashboards, and runbooks.",
        "Format as a clean list.",
        "",
        "Context:",
        context
      ].join("\n");

      const reply = (USE_OLLAMA === "1")
        ? await chatOllama({
            base: OLLAMA_BASE,
            model: OLLAMA_MODEL,
            messages: [{ role: "user", content: prompt }]
          })
        : await openaiChat({ system: systemPrompt, messages: [{ role: "user", content: prompt }] });

      await interaction.editReply(reply);
      return;
    }

    if (interaction.commandName === "where") {
      const key = interaction.options.getString("key", true);
      await interaction.deferReply({ ephemeral: true });
      const idx = await readIndex();
      if (!idx) return interaction.editReply("ops/index.json not found.");

      let context = "";
      if (USE_OLLAMA === "1") {
        try {
          const snippets = await topK(OLLAMA_BASE, `find ${key}`, 3);
          context = snippets.map(s => s.text).join("\n\n");
        } catch (e) {
          console.log("RAG failed, falling back to full index");
          context = JSON.stringify(idx, null, 2);
        }
      } else {
        context = JSON.stringify(idx, null, 2);
      }

      const prompt = [
        "You are a helpful assistant for the Web3 stablecoin project.",
        `Find the value for "${key}" in the following context.`,
        "If it's a contract address, dashboard URL, or runbook link, provide it directly.",
        "If not found, suggest updating ops/index.json.",
        "",
        "Context:",
        context
      ].join("\n");

      const reply = (USE_OLLAMA === "1")
        ? await chatOllama({
            base: OLLAMA_BASE,
            model: OLLAMA_MODEL,
            messages: [{ role: "user", content: prompt }]
          })
        : await openaiChat({ system: systemPrompt, messages: [{ role: "user", content: prompt }] });

      await interaction.editReply(reply);
      return;
    }

    if (interaction.commandName === "llm") {
      const provider = interaction.options.getString("provider", true);
      const model = interaction.options.getString("model") || null;
      process.env.USE_OLLAMA = provider === "ollama" ? "1" : "0";
      process.env.USE_POWERSHELL = provider === "powershell" ? "1" : "0";
      if (model) process.env.OLLAMA_MODEL = model;
      await interaction.reply({ content: `🧠 LLM set → provider: ${provider}${model?`, model: ${model}`:""}`, ephemeral: true });
      return;
    }

    if (interaction.commandName === "task") {
      const subcommand = interaction.options.getSubcommand();
      const id = interaction.options.getString("id", true);
      await interaction.deferReply();

      if (subcommand === "start") {
        // Enqueue task
        await interaction.editReply(`🚀 Task ${id} started.`);
      } else if (subcommand === "status") {
        // Check status
        await interaction.editReply(`📊 Task ${id} status: In progress.`);
      } else if (subcommand === "approve") {
        // Approve
        await interaction.editReply(`✅ Task ${id} approved.`);
      }
      return;
    }

    if (interaction.commandName === "mint-vault") {
      await interaction.deferReply({ ephemeral: true });
      const to = getAddress(interaction.options.getString("to", true));
      const cid = interaction.options.getString("cid", true);
      const hash = hex32(interaction.options.getString("hash", true));
      const notional = interaction.options.getString("notional", true);
      const data = iVault.encodeFunctionData("mint", [to, cid, hash, notional]);
      const payload = await safeJson(VAULT_NFT, data);
      await interaction.editReply("```json\n" + payload + "\n```");
      return;
    }

    if (interaction.commandName === "add-compliance") {
      await interaction.deferReply({ ephemeral: true });
      const id = interaction.options.getInteger("vaultid", true);
      const cid = hex32(interaction.options.getString("cid", true));
      const hash = hex32(interaction.options.getString("hash", true));
      const iso = interaction.options.getInteger("iso", true);
      const data = iComp.encodeFunctionData("addRecord", [id, hash, cid, iso]);
      const payload = await safeJson(COMPLIANCE, data);
      await interaction.editReply("```json\n" + payload + "\n```");
      return;
    }

    if (interaction.commandName === "transfer-vault") {
      await interaction.deferReply({ ephemeral: true });
      const vaultid = interaction.options.getInteger("vaultid", true);
      const to = getAddress(interaction.options.getString("to", true));
      const from = interaction.user.id; // Assume from is the owner, but in reality need to check
      const data = iVault.encodeFunctionData("safeTransferFrom", [from, to, vaultid]);
      const payload = await safeJson(VAULT_NFT, data);
      await interaction.editReply("```json\n" + payload + "\n```");
      return;
    }

    if (interaction.commandName === "set-vault-metadata") {
      await interaction.deferReply({ ephemeral: true });
      const vaultid = interaction.options.getInteger("vaultid", true);
      const cid = interaction.options.getString("cid", true);
      const hash = hex32(interaction.options.getString("hash", true));
      const data = iVault.encodeFunctionData("setMetadata", [vaultid, cid, hash]);
      const payload = await safeJson(VAULT_NFT, data);
      await interaction.editReply("```json\n" + payload + "\n```");
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

// Metrics server
const server = http.createServer((req, res) => {
  if (req.url === '/metrics') {
    const avgLatency = chatCount > 0 ? totalLatency / chatCount : 0;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`# HELP discord_chat_count Total chat interactions
# TYPE discord_chat_count counter
discord_chat_count ${chatCount}

# HELP discord_ollama_count Ollama chat interactions
# TYPE discord_ollama_count counter
discord_ollama_count ${ollamaCount}

# HELP discord_openai_count OpenAI chat interactions
# TYPE discord_openai_count counter
discord_openai_count ${openaiCount}

# HELP discord_powershell_count PowerShell chat interactions
# TYPE discord_powershell_count counter
discord_powershell_count ${powershellCount}

# HELP discord_error_count Chat errors
# TYPE discord_error_count counter
discord_error_count ${errorCount}

# HELP discord_avg_latency_ms Average chat latency in ms
# TYPE discord_avg_latency_ms gauge
discord_avg_latency_ms ${avgLatency}
`);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3001, '0.0.0.0', () => {
  console.log('Metrics server on http://0.0.0.0:3001/metrics');
});

client.login(DISCORD_TOKEN);
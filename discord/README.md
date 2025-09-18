# Discord Bot (Forth-AI)

## 1) Create a Discord Application
- https://discord.com/developers/applications → New Application
- Add a Bot → copy **Bot Token** (DISCORD_TOKEN)
- Give the bot **Message Content Intent** (if needed) and **applications.commands** scope
- OAuth2 URL Generator: scopes `bot applications.commands`, permissions `Send Messages`, `View Channels`
- Invite bot to your server with the URL

## 2) Configure env
Copy `.env.example` → `.env` and fill:
- DISCORD_TOKEN
- DISCORD_APP_ID
- (Optional) DISCORD_GUILD_ID for fast dev command registration
- OPENAI_API_KEY and OPENAI_MODEL **or** set `USE_POWERSHELL=1` with `INFER_SCRIPT=../infer.ps1`

## 3) Install & register commands
```bash
cd discord
npm ci
npm run register
```

## 4) Run locally

```bash
npm run dev
```

## 5) Railway/Render deploy (Node mode)

* Create a new service from this folder
* Set env from `.env.example`
* Start command: `npm start`
* Optional: Docker deploy using provided Dockerfile

## Slash Commands

* `/chat prompt:"your question"`
* `/setmodel model:"gpt-4o-mini"`
* `/reset` (clears channel history)
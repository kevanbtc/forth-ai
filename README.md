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
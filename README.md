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

This project includes a placeholder for GPT-5 integration using OpenAI's GPT-4o model.

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

This will output the AI's response. The script uses GPT-4o as a stand-in for GPT-5 until it's available.

## Project Structure

- `src/main.fth`: Main Forth file with Hello World definition and execution.
- `scripts/infer.ps1`: PowerShell script for AI inference.
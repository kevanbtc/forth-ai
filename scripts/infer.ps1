# AI Inference Script (OpenAI or Ollama)
# Usage: .\scripts\infer.ps1 "Your prompt here" [-Model "gpt-4o"] [-Provider "openai"] [-Temperature 0.7] [-MaxTokens 1000] [-HistoryFile "conversation.json"] [-LogFile "ai_log.txt"]
# For Ollama: .\scripts\infer.ps1 "Your prompt here" -Provider ollama -Model "unykorn-ops" -OllamaBase "http://localhost:11434"
# Requires: $env:OPENAI_API_KEY set for OpenAI (get from https://platform.openai.com/api-keys)

param(
    [Parameter(Mandatory=$true)]
    [string]$Prompt,
    [string]$Model = "unykorn-ops",
    [ValidateSet("openai","ollama")][string]$Provider = "ollama",
    [string]$OllamaBase = "http://localhost:11434",
    [double]$Temperature = 0.7,
    [int]$MaxTokens = 1000,
    [string]$HistoryFile = "conversation.json",
    [string]$LogFile = "ai_log.txt"
)

# Check for API key or Ollama
if ($Provider -eq "ollama") {
    # Ollama provider
    $body = @{
        model = $Model
        messages = @(
            @{ role = "system"; content = "You are concise and operational." },
            @{ role = "user";   content = $Prompt }
        )
        stream = $false
    } | ConvertTo-Json -Depth 6

    try {
        $response = Invoke-RestMethod -Method Post -Uri "$OllamaBase/api/chat" -ContentType "application/json" -Body $body
        $assistantContent = $response.message.content
        Write-Host "Ollama Response:" -ForegroundColor Green
        Write-Host $assistantContent
    } catch {
        Write-Error "Ollama call failed: $($_.Exception.Message)"
        exit 1
    }
    exit 0
} elseif (-not $env:OPENAI_API_KEY) {
    Write-Error "OPENAI_API_KEY environment variable not set. Please set it first."
    exit 1
}

# API endpoint
$apiUrl = "https://api.openai.com/v1/chat/completions"

# Load conversation history
$history = @()
if (Test-Path $HistoryFile) {
    try {
        $history = Get-Content $HistoryFile | ConvertFrom-Json
    } catch {
        Write-Warning "Failed to load history file. Starting fresh."
        $history = @()
    }
}

# Add user message to history
$history += @{
    role = "user"
    content = $Prompt
}

# Prepare request body
$body = @{
    model = $Model
    messages = $history
    max_tokens = $MaxTokens
    temperature = $Temperature
} | ConvertTo-Json

# Headers
$headers = @{
    "Authorization" = "Bearer $env:OPENAI_API_KEY"
    "Content-Type" = "application/json"
}

try {
    # Make API call
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $body

    # Get assistant response
    $assistantContent = $response.choices[0].message.content

    # Add assistant message to history
    $history += @{
        role = "assistant"
        content = $assistantContent
    }

    # Save updated history
    $history | ConvertTo-Json | Set-Content $HistoryFile

    # Log the interaction
    $logEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Model: $Model, Temp: $Temperature, Tokens: $MaxTokens`nPrompt: $Prompt`nResponse: $assistantContent`n---`n"
    Add-Content $LogFile $logEntry

    # Output the response
    Write-Host "AI Response:" -ForegroundColor Green
    Write-Host $assistantContent
} catch {
    Write-Error "API call failed: $($_.Exception.Message)"
    exit 1
}
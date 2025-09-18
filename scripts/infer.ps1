# AI Inference Script (GPT-5 Placeholder using GPT-4o)
# Usage: .\scripts\infer.ps1 "Your prompt here"
# Requires: $env:OPENAI_API_KEY set (get from https://platform.openai.com/api-keys)

param(
    [Parameter(Mandatory=$true)]
    [string]$Prompt
)

# Check for API key
if (-not $env:OPENAI_API_KEY) {
    Write-Error "OPENAI_API_KEY environment variable not set. Please set it first."
    exit 1
}

# API endpoint and model (using GPT-4o as GPT-5 placeholder)
$apiUrl = "https://api.openai.com/v1/chat/completions"
$model = "gpt-4o"

# Prepare request body
$body = @{
    model = $model
    messages = @(
        @{
            role = "user"
            content = $Prompt
        }
    )
    max_tokens = 1000
    temperature = 0.7
} | ConvertTo-Json

# Headers
$headers = @{
    "Authorization" = "Bearer $env:OPENAI_API_KEY"
    "Content-Type" = "application/json"
}

try {
    # Make API call
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $body

    # Output the response
    Write-Host "AI Response:" -ForegroundColor Green
    Write-Host $response.choices[0].message.content
} catch {
    Write-Error "API call failed: $($_.Exception.Message)"
    exit 1
}
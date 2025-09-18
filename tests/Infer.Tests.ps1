Import-Module Pester

Describe 'infer.ps1 surface checks' {
  It 'loads without error' {
    { . "$PSScriptRoot/../infer.ps1" -? *>$null } | Should -Not -Throw
  }

  It 'supports key parameters' {
    $cmd = Get-Command "$PSScriptRoot/../infer.ps1"
    $p = $cmd.Parameters.Keys
    'Prompt','Model','Temperature','MaxTokens','HistoryFile','LogFile' | ForEach-Object {
      $_ | Should -BeIn $p
    }
  }

  It 'has sensible defaults' {
    $cmd = Get-Command "$PSScriptRoot/../infer.ps1"
    $cmd.Parameters['Model'].Attributes.DefaultValue | Should -Not -BeNullOrEmpty
  }
}
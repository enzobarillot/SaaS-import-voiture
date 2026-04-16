param(
  [Parameter(Mandatory = $true)]
  [string]$Command
)

$root = Split-Path -Parent $PSScriptRoot
$localNode = Join-Path $root '.tools\node-v22.11.0-win-x64\node.exe'
$nextCli = Join-Path $root 'node_modules\next\dist\bin\next'

if (Test-Path $localNode) {
  & $localNode $nextCli $Command
  exit $LASTEXITCODE
}

node $nextCli $Command
exit $LASTEXITCODE

param(
  [string]$Command = "run"
)

$root = Split-Path -Parent $PSScriptRoot
$localNode = Join-Path $root '.tools\node-v22.11.0-win-x64\node.exe'
$testFiles = Get-ChildItem -Path (Join-Path $root 'tests') -Filter '*.test.ts' -Recurse | ForEach-Object { $_.FullName }

Set-Location -LiteralPath $root

if (Test-Path $localNode) {
  & $localNode --import tsx --test @testFiles
  exit $LASTEXITCODE
}

node --import tsx --test @testFiles
exit $LASTEXITCODE


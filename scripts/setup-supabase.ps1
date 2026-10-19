param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-z0-9]{20}$')]
  [string]$ProjectRef,

  [Parameter(Mandatory = $false)]
  [uri]$AppBaseUrl
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  throw 'Supabase CLI was not found. Install it using the official guide: https://supabase.com/docs/guides/cli'
}

if ($AppBaseUrl -and $AppBaseUrl.Scheme -ne 'https' -and $AppBaseUrl.Host -ne 'localhost') {
  throw 'AppBaseUrl must use HTTPS, except for localhost development URLs.'
}

function Invoke-Supabase {
  param([string[]]$CliArguments)
  & supabase --workdir 'apps/backend' @CliArguments
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI failed with exit code $LASTEXITCODE."
  }
}

Write-Host "Linking this checkout to Supabase project $ProjectRef..."
Invoke-Supabase @('link', '--project-ref', $ProjectRef)

Write-Host ''
Write-Host 'Current remote/local migration status:'
Invoke-Supabase @('migration', 'list', '--linked')

Write-Host ''
Write-Host 'Previewing pending migrations. Review the SQL and migration history before continuing:'
Invoke-Supabase @('db', 'push', '--dry-run', '--linked')

Write-Host ''
$confirmation = Read-Host "Type APPLY to apply pending migrations to $ProjectRef"
if ($confirmation -cne 'APPLY') {
  Write-Host 'Database changes were skipped. The Edge Function was not deployed.'
  exit 0
}

Invoke-Supabase @('db', 'push', '--linked')

if ($AppBaseUrl) {
  $secretValue = "APP_BASE_URL=$($AppBaseUrl.AbsoluteUri.TrimEnd('/'))"
  Invoke-Supabase @('secrets', 'set', $secretValue, '--project-ref', $ProjectRef)
}

Invoke-Supabase @('functions', 'deploy', 'workspace-members', '--project-ref', $ProjectRef)

Write-Host ''
Write-Host 'Supabase setup completed. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in apps/client/.env, then restart the app.'
if ($AppBaseUrl) {
  Write-Host 'Also allow the app URL in Supabase Dashboard > Authentication > URL Configuration.'
}

$ErrorActionPreference = 'Stop'

if (-not $env:ROOT_WORKTREE_PATH) {
  Write-Error 'ROOT_WORKTREE_PATH is not set'
}

pnpm install --prefer-offline --frozen-lockfile
if ($LASTEXITCODE -ne 0) {
  pnpm install --prefer-offline
}

@('apps/api/.env', 'apps/web/.env') | ForEach-Object {
  $src = Join-Path $env:ROOT_WORKTREE_PATH $_
  if (Test-Path $src) {
    $destDir = Split-Path $_ -Parent
    if ($destDir) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
    Copy-Item $src $_
    Write-Host "Copied $_ from main worktree"
  } else {
    Write-Warning "Skip $_ (not found in main worktree)"
  }
}

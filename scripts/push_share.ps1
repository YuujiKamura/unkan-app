param(
    [string]$Filename
)

$ErrorActionPreference = 'Stop'

$Root = (Get-Location).Path
$SharePath = Join-Path $Root "public\data\shares\$Filename"
$WorktreeDir = Join-Path $Root "out_ghpages"

if (-not (Test-Path $WorktreeDir)) {
    Write-Host "Setting up gh-pages worktree..."
    # try to fetch if not exists
    git fetch origin gh-pages:refs/remotes/origin/gh-pages
    try {
        git worktree add $WorktreeDir gh-pages
    } catch {
        git worktree add $WorktreeDir origin/gh-pages
    }
}

$Dest = Join-Path $WorktreeDir "data\shares"
if (-not (Test-Path $Dest)) {
    New-Item -Path $Dest -ItemType Directory -Force | Out-Null
}

Copy-Item $SharePath $Dest -Force
Set-Location $WorktreeDir
if (-not (Test-Path .nojekyll)) {
    New-Item .nojekyll -ItemType File -Force | Out-Null
}

git add .
git commit -m "Auto-share: $Filename"
git push origin gh-pages

Set-Location $Root

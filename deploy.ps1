$ErrorActionPreference = 'Stop'
git worktree remove out_deploy --force
git worktree add -f out_deploy origin/gh-pages
robocopy out out_deploy /MIR /XD .git
Set-Location out_deploy
git add --all
git commit -m "Deploy via worktree"
git push origin HEAD:gh-pages
Set-Location ..
git worktree remove out_deploy --force

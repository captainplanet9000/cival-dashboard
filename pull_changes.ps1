Write-Host "Starting pull operation..."
git config --global core.pager ""
Write-Host "Pulling changes from gwds/main..."
git pull gwds main --allow-unrelated-histories
Write-Host "Pull operation complete!" 
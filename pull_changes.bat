@echo off
echo Starting pull operation...
git config --global core.pager ""
echo Pulling changes from gwds/main...
git pull gwds main --allow-unrelated-histories
echo Done!
pause 
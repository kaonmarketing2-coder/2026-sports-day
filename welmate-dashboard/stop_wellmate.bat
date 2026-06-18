@echo off
taskkill /f /im python.exe /fi "WINDOWTITLE eq *app.py*" >nul 2>&1
taskkill /f /im python.exe >nul 2>&1
echo 웰메이트 서버가 종료되었습니다.
pause

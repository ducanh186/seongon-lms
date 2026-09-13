@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0docker-up-windows.ps1" %*
exit /b %ERRORLEVEL%

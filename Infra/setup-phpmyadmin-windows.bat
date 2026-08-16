@echo off
setlocal

set "SCRIPT_PATH=%~dp0setup-phpmyadmin-windows.ps1"
if not exist "%SCRIPT_PATH%" (
    echo ERROR: PowerShell setup script was not found: "%SCRIPT_PATH%"
    exit /b 2
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_PATH%" %*
exit /b %ERRORLEVEL%

@echo off
setlocal

set "POWERSHELL_SCRIPT=%~dp0start-local-web-windows.ps1"
if not exist "%POWERSHELL_SCRIPT%" (
    echo ERROR: Missing launcher: "%POWERSHELL_SCRIPT%"
    exit /b 2
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%POWERSHELL_SCRIPT%" %*
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" echo ERROR: Local web launcher failed with exit code %EXIT_CODE%.
exit /b %EXIT_CODE%

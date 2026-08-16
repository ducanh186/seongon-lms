@echo off
setlocal

set "POWERSHELL_SCRIPT=%~dp0build-local-web-windows.ps1"
if not exist "%POWERSHELL_SCRIPT%" (
    echo ERROR: Missing build script: "%POWERSHELL_SCRIPT%"
    exit /b 2
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%POWERSHELL_SCRIPT%" %*
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" echo ERROR: Local web build failed with exit code %EXIT_CODE%.
exit /b %EXIT_CODE%

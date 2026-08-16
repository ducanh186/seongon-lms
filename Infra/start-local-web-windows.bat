@echo off
setlocal

set "SCRIPT_PATH=%~dp0start-local-web-windows.ps1"

if not exist "%SCRIPT_PATH%" (
    echo ERROR: PowerShell launcher was not found: "%SCRIPT_PATH%"
    pause
    exit /b 2
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_PATH%" %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
    echo.
    echo Local web launcher failed with exit code %EXIT_CODE%.
    pause
)

exit /b %EXIT_CODE%

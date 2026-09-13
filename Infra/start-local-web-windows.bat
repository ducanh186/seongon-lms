@echo off
setlocal

set "REPO_ROOT=%~dp0.."
pushd "%REPO_ROOT%" >nul
if errorlevel 1 (
    echo ERROR: Could not enter repository root: "%REPO_ROOT%"
    exit /b 2
)

set "POWERSHELL_SCRIPT=%~dp0start-local-web-windows.ps1"
if not exist "%POWERSHELL_SCRIPT%" (
    echo ERROR: Missing launcher: "%POWERSHELL_SCRIPT%"
    popd
    exit /b 2
)

set "POWERSHELL_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%POWERSHELL_EXE%" set "POWERSHELL_EXE=pwsh.exe"
if "%POWERSHELL_EXE%"=="pwsh.exe" (
    where pwsh.exe >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Windows PowerShell or PowerShell 7 was not found in PATH.
        popd
        exit /b 2
    )
)

"%POWERSHELL_EXE%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%POWERSHELL_SCRIPT%" %*
set "EXIT_CODE=%ERRORLEVEL%"
popd
if not "%EXIT_CODE%"=="0" echo ERROR: Local web launcher failed with exit code %EXIT_CODE%.
exit /b %EXIT_CODE%

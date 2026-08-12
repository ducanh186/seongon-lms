@echo off
setlocal

set "FRONTEND_DIR=%~dp0..\FE\DEMO"
for %%I in ("%FRONTEND_DIR%") do set "FRONTEND_DIR=%%~fI"

where node.exe >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js was not found in PATH. Install Node.js and reopen this terminal.
    exit /b 2
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo ERROR: npm was not found in PATH. Reinstall Node.js and reopen this terminal.
    exit /b 3
)

if not exist "%FRONTEND_DIR%\package.json" (
    echo ERROR: Frontend package.json was not found: "%FRONTEND_DIR%\package.json"
    exit /b 4
)

echo Frontend: %FRONTEND_DIR%
echo Command: npm run build -- --watch

if exist "%FRONTEND_DIR%\node_modules" (
    echo Dependencies: ready
) else (
    echo Dependencies: npm install --no-audit --no-fund required
)

if /I "%~1"=="--verify" exit /b 0

pushd "%FRONTEND_DIR%"
if errorlevel 1 exit /b 5

if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm.cmd install --no-audit --no-fund
    if errorlevel 1 (
        set "EXIT_CODE=%ERRORLEVEL%"
        popd
        exit /b %EXIT_CODE%
    )
)

echo Watching frontend files and rebuilding production assets...
call npm.cmd run build -- --watch
set "EXIT_CODE=%ERRORLEVEL%"
popd

exit /b %EXIT_CODE%

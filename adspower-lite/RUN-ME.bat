@echo off
setlocal
cd /d "%~dp0"
echo ===== AdsPower Lite =====
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Installing Node.js LTS with winget...
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  echo.
  echo Node.js installed. Close this window and double-click RUN-ME.bat again.
  pause
  exit /b
)
if not exist node_modules (
  echo Installing dependencies. This takes a few minutes, please wait...
  call npm install
  if errorlevel 1 (
    echo Install failed. Take a screenshot of this window and send it.
    pause
    exit /b 1
  )
)
call npm start
if errorlevel 1 (
  echo Failed to start. Take a screenshot of this window and send it.
  pause
)

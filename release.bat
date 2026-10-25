@echo off
rem Builds a versioned Chrome Web Store zip into releases\.
rem   release.bat              version from commits (feat = minor, fix = patch, breaking = major)
rem   release.bat minor        force major / minor / patch, or pass an exact version like 1.2.0
rem   release.bat --dry-run    preview only;  release.bat --help for all options
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not on PATH. Install it from https://nodejs.org and try again.
  set "CODE=1"
  goto :end
)

if not exist node_modules (
  echo Installing dependencies...
  call npm ci
  if errorlevel 1 (
    set "CODE=1"
    goto :end
  )
)

node scripts\release\release.mjs %*
set "CODE=%ERRORLEVEL%"

:end
rem Double-clicking passes no arguments; keep that window open so the result stays readable.
if "%~1"=="" pause
exit /b %CODE%

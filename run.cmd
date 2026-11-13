@echo off
rem Double-click runner for Windows. Same as: npm start
cd /d "%~dp0"
node "scripts\run.mjs" %*
if errorlevel 1 pause

@echo off
title Baraka - Local Runner
cd /d "%~dp0"
echo ===================================================
echo           Baraka Web Application Runner
echo ===================================================
echo.
echo Preparing environment and starting local server...
echo.
node "scripts\run.mjs" %*
if errorlevel 1 (
    echo.
    echo [ERROR] Server terminated or encountered an error.
    pause
)

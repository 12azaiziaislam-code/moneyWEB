@echo off
title Baraka - Local Development Server
cd /d "%~dp0"

if not "%1"=="" (
    node "scripts\run.mjs" %*
    goto END
)

echo ===================================================================
echo                     Baraka Local Runner
echo ===================================================================
echo.
echo   [1] Fast Local Server (Cloudflare Pages + Functions + D1) [RECOMMENDED]
echo   [2] Instant Vite Dev Mode (Frontend UI with live Hot Reload)
echo   [3] Full CI Verification (Build + 2x Typecheck + Smoke Tests)
echo.
echo  Starting [1] Fast Local Server automatically in 4 seconds...
echo.

choice /c 123 /n /t 4 /d 1 /m "Select option [1, 2, or 3]: "

if errorlevel 3 goto FULL_CI
if errorlevel 2 goto VITE_DEV
if errorlevel 1 goto FAST_MODE

:FAST_MODE
echo.
echo [Starting Fast Cloudflare Pages + Functions Server...]
node "scripts\run.mjs" --fast
goto END

:VITE_DEV
echo.
echo [Starting Instant Vite Dev Server on http://localhost:5173 ...]
npm run dev
goto END

:FULL_CI
echo.
echo [Running Full Production Build and Verification...]
node "scripts\run.mjs"
goto END

:END
if errorlevel 1 (
    echo.
    echo [ERROR] Server encountered an error.
    pause
)

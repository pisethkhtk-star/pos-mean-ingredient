@echo off
title POS Next.js Frontend (Port 3000)
cd /d "%~dp0"
echo ========================================================
echo Starting POS Next.js Frontend on port 3000 (Webpack mode)...
echo Connecting to Backend at http://localhost:5000
echo ========================================================
npm run dev
pause

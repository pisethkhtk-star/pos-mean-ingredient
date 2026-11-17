@echo off
title POS Express Backend
echo ====================================================
echo Starting Express Backend for POS System...
echo Port: 5000
echo ====================================================

cd /d "%~dp0backend"

if not exist node_modules (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
    call npx prisma generate
)

echo Starting Express backend dev server...
call npm run dev

pause

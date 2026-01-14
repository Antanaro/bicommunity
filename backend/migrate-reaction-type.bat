@echo off
cd /d "%~dp0"
npx ts-node src\migrations\add-reaction-type-to-likes.ts
pause

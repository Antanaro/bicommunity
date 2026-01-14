@echo off
cd /d "%~dp0"
npx ts-node src\migrations\add-parent-id-to-posts.ts
pause

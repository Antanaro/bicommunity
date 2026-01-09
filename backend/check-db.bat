@echo off
cd /d "%~dp0"
node src\scripts\check-db.js
pause

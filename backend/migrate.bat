@echo off
cd /d "%~dp0"
node src\migrations\migrate.js
pause

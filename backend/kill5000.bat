@echo off
netstat -ano | findstr :5000 | findstr LISTENING > temp_port.txt
for /f "tokens=5" %%a in (temp_port.txt) do taskkill /F /PID %%a
del temp_port.txt 2>nul

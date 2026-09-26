@echo off
setlocal
cd /d "%~dp0"
where java >nul 2>nul
if errorlevel 1 (
  echo Java was not found. Install a JDK 17 or 21 and add it to PATH.
  pause
  exit /b 1
)
echo ForgeFit will open at http://localhost:8080 after the server starts.
echo Stop the app with Ctrl+C. Keep this window open while using ForgeFit.
if exist "runtime\forgefit.jar" (
  java -jar "runtime\forgefit.jar"
) else (
  call mvnw.cmd spring-boot:run
)
if errorlevel 1 pause

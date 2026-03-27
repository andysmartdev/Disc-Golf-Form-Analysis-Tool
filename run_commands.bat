@echo off
cd /d C:\Users\smartan\source\code\code\portfolio-ai\dg-video-scrubber
echo === Running node setup.mjs ===
node setup.mjs
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: setup.mjs failed with exit code %ERRORLEVEL%
    exit /b 1
)
echo.
echo === Running npm install ===
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed with exit code %ERRORLEVEL%
    exit /b 1
)
echo.
echo === Running npm run build ===
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm run build failed with exit code %ERRORLEVEL%
    exit /b 1
)
echo.
echo === All commands completed successfully ===

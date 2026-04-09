@echo off
echo ========================================
echo Deploy Student Function to Supabase
echo ========================================
echo.

REM Check if supabase is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Supabase CLI not found!
    echo Please install it first:
    echo npm install -g supabase
    echo.
    echo Or download from:
    echo https://github.com/supabase/cli/releases
    exit /b 1
)

echo Step 1: Login to Supabase
echo -----------------------
call supabase login

echo.
echo Step 2: Deploy students function
echo ---------------------------------
cd /d "%~dp0"
call supabase functions deploy students

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
pause
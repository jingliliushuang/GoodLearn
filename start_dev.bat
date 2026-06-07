@echo off
setlocal EnableDelayedExpansion

set "PROJECT_ROOT=E:\A_Exp_ML\GoodLearnApp"
set "CONDA_ENV=%PROJECT_ROOT%\.conda\goodlearnapp-backend"
set "BACKEND=%PROJECT_ROOT%\backend"
set "FRONTEND=%PROJECT_ROOT%\frontend\web"
set "DESKTOP=%PROJECT_ROOT%\desktop"
set "BACKEND_PORT=8000"

if not exist "%CONDA_ENV%\python.exe" (
    echo [ERROR] Environment not found. Please run setup_env.bat first.
    pause
    exit /b 1
)

if not exist "%FRONTEND%\node_modules" (
    echo [ERROR] Frontend dependencies not installed. Please run setup_env.bat first.
    pause
    exit /b 1
)

if not exist "%DESKTOP%\node_modules" (
    echo [ERROR] Desktop dependencies not installed. Please run setup_env.bat first.
    pause
    exit /b 1
)

set "PORT_OCCUPIED=0"
set "PORT_PID="
set "START_BACKEND=1"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%BACKEND_PORT%" ^| findstr "LISTENING"') do (
    if !PORT_OCCUPIED!==0 (
        set "PORT_PID=%%a"
        set "PORT_OCCUPIED=1"
    )
)

if !PORT_OCCUPIED!==1 (
    set "PROC_NAME=unknown"
    for /f "tokens=1" %%p in ('tasklist /FI "PID eq !PORT_PID!" /NH 2^>nul') do (
        if "!PROC_NAME!"=="unknown" set "PROC_NAME=%%p"
    )

    echo !PROC_NAME! | findstr /I "python.exe" >nul
    if !errorlevel!==0 (
        echo Backend already running on port 8000, skip starting backend.
        set "START_BACKEND=0"
    ) else (
        echo [WARN] Port 8000 is occupied by another process. Please close it or change backend port.
        echo        Process: !PROC_NAME! ^(PID !PORT_PID!^)
        set "START_BACKEND=0"
    )
)

if !START_BACKEND!==1 (
    echo Starting GoodLearnApp Backend...
    start "GoodLearnApp Backend" cmd /k "cd /d "%BACKEND%" && "%CONDA_ENV%\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
    timeout /t 3 /nobreak >nul
)

echo Starting GoodLearnApp Frontend...
start "GoodLearnApp Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

timeout /t 4 /nobreak >nul

echo Starting GoodLearnApp Desktop...
start "GoodLearnApp Desktop" cmd /k "cd /d "%DESKTOP%" && npm run dev"

echo.
echo GoodLearnApp dev mode is starting:
echo   Backend:  http://127.0.0.1:8000
echo   Frontend: http://127.0.0.1:5173
echo   Desktop:  Electron window loading frontend
echo.
echo Close the service windows to stop, or run stop_dev.bat
pause

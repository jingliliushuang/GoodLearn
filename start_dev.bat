@echo off
setlocal

set "PROJECT_ROOT=E:\A_Exp_ML\GoodLearnApp"
set "CONDA_ENV=%PROJECT_ROOT%\.conda\goodlearnapp-backend"
set "BACKEND=%PROJECT_ROOT%\backend"
set "FRONTEND=%PROJECT_ROOT%\frontend\web"
set "DESKTOP=%PROJECT_ROOT%\desktop"

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

echo Starting GoodLearnApp Backend...
start "GoodLearnApp Backend" cmd /k "cd /d "%BACKEND%" && "%CONDA_ENV%\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

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
echo Close the three service windows to stop, or run stop_dev.bat
pause

@echo off
setlocal EnableDelayedExpansion

set "PROJECT_ROOT=E:\A_Exp_ML\GoodLearnApp"
set "CONDA_ENV=%PROJECT_ROOT%\.conda\goodlearnapp-backend"
set "BACKEND=%PROJECT_ROOT%\backend"
set "FRONTEND=%PROJECT_ROOT%\frontend\web"
set "DESKTOP=%PROJECT_ROOT%\desktop"

echo ========================================
echo  GoodLearnApp Environment Setup
echo ========================================
echo.

where conda >nul 2>&1
if errorlevel 1 (
    echo [ERROR] conda not found. Please install Miniconda/Anaconda first.
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found. Please install Node.js first.
    exit /b 1
)

echo [1/6] Creating project-local Conda environment...
if not exist "%CONDA_ENV%" (
    call conda create --prefix "%CONDA_ENV%" python=3.10 -y
    if errorlevel 1 (
        echo [ERROR] Failed to create Conda environment.
        exit /b 1
    )
) else (
    echo       Environment already exists, skipping create.
)

echo [2/6] Installing backend dependencies...
echo       Switching to opencv-contrib-python (required for dnn_superres)...
"%CONDA_ENV%\python.exe" -m pip uninstall -y opencv-python opencv-contrib-python >nul 2>&1
"%CONDA_ENV%\python.exe" -m pip install -r "%BACKEND%\requirements.txt"
if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies.
    exit /b 1
)

echo [3/6] Installing frontend dependencies...
cd /d "%FRONTEND%"
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies.
    exit /b 1
)

echo [4/6] Installing Electron desktop dependencies...
cd /d "%DESKTOP%"
set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install desktop dependencies.
    exit /b 1
)

echo [5/6] Creating runtime directories...
mkdir "%PROJECT_ROOT%\backend\runtime\uploads" 2>nul
mkdir "%PROJECT_ROOT%\backend\runtime\outputs" 2>nul
mkdir "%PROJECT_ROOT%\backend\runtime\temp" 2>nul
mkdir "%PROJECT_ROOT%\backend\logs" 2>nul
mkdir "%PROJECT_ROOT%\outputs\reports" 2>nul
mkdir "%PROJECT_ROOT%\outputs\demo_results" 2>nul
mkdir "%PROJECT_ROOT%\assets\samples" 2>nul
mkdir "%PROJECT_ROOT%\assets\screenshots" 2>nul

echo [6/6] Checking external model directory...
set "EXT_MODELS=E:\A_Exp_ML\other used"
if exist "%EXT_MODELS%" (
    echo       Found: %EXT_MODELS%
) else (
    echo [WARN] External model directory not found: %EXT_MODELS%
    echo        OpenCV-based methods will still work.
)

echo.
echo ========================================
echo  Setup complete!
echo  Run start_dev.bat to launch dev mode.
echo ========================================
pause

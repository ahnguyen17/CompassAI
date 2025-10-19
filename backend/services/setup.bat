@echo off
REM Setup script for Whisper STT Service (Windows)
REM This script installs Python dependencies for the local Whisper model

echo.
echo 🚀 Setting up Whisper STT Service...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed!
    echo Please install Python 3.8 or higher from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✅ Found Python
python --version
echo.

REM Check if pip is installed
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ pip is not installed!
    echo Please install pip: https://pip.pypa.io/en/stable/installation/
    pause
    exit /b 1
)

echo ✅ Found pip
pip --version
echo.

REM Install dependencies
echo 📦 Installing Python dependencies...
echo.
pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ✅ Dependencies installed successfully!
echo.
echo 📥 Downloading Whisper model (this may take a few minutes)...
echo.

REM Pre-download the model
python -c "from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor; import sys; processor = AutoProcessor.from_pretrained('namphungdn134/whisper-small-vi'); model = AutoModelForSpeechSeq2Seq.from_pretrained('namphungdn134/whisper-small-vi'); print('✅ Model downloaded successfully!'); print(''); print('Model size: ~242M parameters'); print('Optimized for: Vietnamese language'); print('WER: 9.3485%%')"

if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to download model
    pause
    exit /b 1
)

echo.
echo 🎉 Setup complete!
echo.
echo You can now use the Whisper STT service.
echo The model will be loaded automatically when transcribing audio.
echo.
pause


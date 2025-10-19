#!/bin/bash
# Setup script for Whisper STT Service
# This script installs Python dependencies for the local Whisper model

echo "🚀 Setting up Whisper STT Service..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null
then
    echo "❌ Python is not installed!"
    echo "Please install Python 3.8 or higher from https://www.python.org/downloads/"
    exit 1
fi

# Determine Python command
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
    PIP_CMD=pip3
else
    PYTHON_CMD=python
    PIP_CMD=pip
fi

echo "✅ Found Python: $($PYTHON_CMD --version)"
echo ""

# Check if pip is installed
if ! command -v $PIP_CMD &> /dev/null
then
    echo "❌ pip is not installed!"
    echo "Please install pip: https://pip.pypa.io/en/stable/installation/"
    exit 1
fi

echo "✅ Found pip: $($PIP_CMD --version)"
echo ""

# Install dependencies
echo "📦 Installing Python dependencies..."
echo ""
$PIP_CMD install -r requirements.txt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "📥 Downloading Whisper model (this may take a few minutes)..."
    echo ""
    
    # Pre-download the model by running a test
    $PYTHON_CMD -c "
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor
import sys

try:
    print('Downloading model: namphungdn134/whisper-small-vi')
    processor = AutoProcessor.from_pretrained('namphungdn134/whisper-small-vi')
    model = AutoModelForSpeechSeq2Seq.from_pretrained('namphungdn134/whisper-small-vi')
    print('✅ Model downloaded successfully!')
    print('')
    print('Model size: ~242M parameters')
    print('Optimized for: Vietnamese language')
    print('WER: 9.3485%')
except Exception as e:
    print(f'❌ Error downloading model: {e}')
    sys.exit(1)
"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Setup complete!"
        echo ""
        echo "You can now use the Whisper STT service."
        echo "The model will be loaded automatically when transcribing audio."
    else
        echo ""
        echo "❌ Failed to download model"
        exit 1
    fi
else
    echo ""
    echo "❌ Failed to install dependencies"
    exit 1
fi


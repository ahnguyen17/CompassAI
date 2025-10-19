#!/usr/bin/env python3
"""
Test script for Whisper STT Service
This script verifies that the model is installed and working correctly
"""

import sys
import os

def test_imports():
    """Test if all required packages are installed"""
    print("🧪 Testing imports...")
    
    try:
        import torch
        print(f"  ✅ torch {torch.__version__}")
    except ImportError:
        print("  ❌ torch not installed")
        return False
    
    try:
        import transformers
        print(f"  ✅ transformers {transformers.__version__}")
    except ImportError:
        print("  ❌ transformers not installed")
        return False
    
    try:
        import librosa
        print(f"  ✅ librosa {librosa.__version__}")
    except ImportError:
        print("  ❌ librosa not installed")
        return False
    
    try:
        import soundfile
        print(f"  ✅ soundfile {soundfile.__version__}")
    except ImportError:
        print("  ❌ soundfile not installed")
        return False
    
    return True


def test_device():
    """Test CUDA availability"""
    print("\n🖥️  Testing device...")
    
    import torch
    
    if torch.cuda.is_available():
        print(f"  ✅ CUDA available")
        print(f"  GPU: {torch.cuda.get_device_name(0)}")
        print(f"  CUDA version: {torch.version.cuda}")
        device = "cuda"
    else:
        print(f"  ℹ️  CUDA not available, using CPU")
        device = "cpu"
    
    return device


def test_model_download():
    """Test if model can be downloaded/loaded"""
    print("\n📥 Testing model download...")
    
    try:
        from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor
        
        model_id = "namphungdn134/whisper-small-vi"
        print(f"  Loading model: {model_id}")
        
        processor = AutoProcessor.from_pretrained(model_id)
        print(f"  ✅ Processor loaded")
        
        model = AutoModelForSpeechSeq2Seq.from_pretrained(model_id)
        print(f"  ✅ Model loaded")
        
        # Get model size
        param_count = sum(p.numel() for p in model.parameters())
        print(f"  Model parameters: {param_count:,} (~{param_count/1e6:.1f}M)")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def test_transcription():
    """Test transcription with a dummy audio"""
    print("\n🎤 Testing transcription...")
    
    try:
        import torch
        import numpy as np
        from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor
        
        # Load model
        model_id = "namphungdn134/whisper-small-vi"
        device = "cuda" if torch.cuda.is_available() else "cpu"
        
        processor = AutoProcessor.from_pretrained(model_id)
        model = AutoModelForSpeechSeq2Seq.from_pretrained(model_id).to(device)
        
        # Configure for Vietnamese
        forced_decoder_ids = processor.get_decoder_prompt_ids(language="vi", task="transcribe")
        model.config.forced_decoder_ids = forced_decoder_ids
        
        # Create dummy audio (1 second of silence)
        sample_rate = 16000
        audio = np.zeros(sample_rate, dtype=np.float32)
        
        # Process
        input_features = processor(
            audio, 
            sampling_rate=sample_rate, 
            return_tensors="pt"
        ).input_features.to(device)
        
        # Generate
        with torch.no_grad():
            predicted_ids = model.generate(input_features)
        
        # Decode
        transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
        
        print(f"  ✅ Transcription successful")
        print(f"  Result: '{transcription}' (expected empty for silence)")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("Whisper STT Service - Test Suite")
    print("=" * 60)
    print()
    
    # Test imports
    if not test_imports():
        print("\n❌ Import test failed!")
        print("Please run: pip install -r requirements.txt")
        return False
    
    # Test device
    device = test_device()
    
    # Test model download
    if not test_model_download():
        print("\n❌ Model download test failed!")
        print("Please check your internet connection and try again.")
        return False
    
    # Test transcription
    if not test_transcription():
        print("\n❌ Transcription test failed!")
        return False
    
    # All tests passed
    print("\n" + "=" * 60)
    print("✅ All tests passed!")
    print("=" * 60)
    print()
    print("The Whisper STT service is ready to use.")
    print(f"Device: {device}")
    print("Model: namphungdn134/whisper-small-vi")
    print()
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)


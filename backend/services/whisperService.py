#!/usr/bin/env python3
"""
Whisper STT Service using Hugging Face Transformers
Model: namphungdn134/whisper-small-vi (Vietnamese-optimized)
"""

import sys
import json
import torch
import librosa
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor

# Configuration
MODEL_ID = "namphungdn134/whisper-small-vi"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
SAMPLE_RATE = 16000

# Global model and processor (loaded once)
model = None
processor = None


def load_model():
    """Load the Whisper model and processor"""
    global model, processor
    
    if model is None or processor is None:
        print(f"Loading model from: {MODEL_ID}", file=sys.stderr)
        print(f"Using device: {DEVICE}", file=sys.stderr)
        
        processor = AutoProcessor.from_pretrained(MODEL_ID)
        model = AutoModelForSpeechSeq2Seq.from_pretrained(MODEL_ID).to(DEVICE)
        
        # Configure for Vietnamese transcription
        forced_decoder_ids = processor.get_decoder_prompt_ids(language="vi", task="transcribe")
        model.config.forced_decoder_ids = forced_decoder_ids
        
        print("Model loaded successfully!", file=sys.stderr)


def transcribe_audio(audio_path, language="vi"):
    """
    Transcribe audio file using the local Whisper model
    
    Args:
        audio_path (str): Path to the audio file
        language (str): Language code (default: "vi" for Vietnamese)
    
    Returns:
        dict: Transcription result with text and language
    """
    try:
        # Load model if not already loaded
        load_model()
        
        # Load and preprocess audio
        print(f"Loading audio from: {audio_path}", file=sys.stderr)
        audio, sr = librosa.load(audio_path, sr=SAMPLE_RATE)
        
        # Process audio
        input_features = processor(
            audio, 
            sampling_rate=SAMPLE_RATE, 
            return_tensors="pt"
        ).input_features.to(DEVICE)
        
        print(f"Input features shape: {input_features.shape}", file=sys.stderr)
        
        # Generate transcription
        print("Generating transcription...", file=sys.stderr)
        with torch.no_grad():
            predicted_ids = model.generate(input_features)
        
        # Decode transcription
        transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
        
        print(f"Transcription: {transcription}", file=sys.stderr)
        
        return {
            "success": True,
            "transcript": transcription,
            "language": language
        }
        
    except Exception as e:
        print(f"Error during transcription: {str(e)}", file=sys.stderr)
        return {
            "success": False,
            "error": str(e)
        }


def main():
    """
    Main function to handle command-line interface
    Expects JSON input: {"audio_path": "/path/to/audio.wav", "language": "vi"}
    """
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        audio_path = input_data.get("audio_path")
        language = input_data.get("language", "vi")
        
        if not audio_path:
            result = {
                "success": False,
                "error": "No audio_path provided"
            }
        else:
            result = transcribe_audio(audio_path, language)
        
        # Output result as JSON
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        result = {
            "success": False,
            "error": f"Invalid JSON input: {str(e)}"
        }
        print(json.dumps(result))
        
    except Exception as e:
        result = {
            "success": False,
            "error": f"Unexpected error: {str(e)}"
        }
        print(json.dumps(result))


if __name__ == "__main__":
    main()


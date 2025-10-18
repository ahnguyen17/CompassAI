# AIDoc OpenAI Voice Integration

## Overview

The AIDoc voice mode now supports **two voice providers**:

1. **Browser Voice** (Free, Offline) - Uses Web Speech API
2. **OpenAI Voice** (Premium, Requires API Key) - Uses Whisper API for STT and OpenAI TTS for speech synthesis

This document covers the OpenAI voice integration specifically.

## Features

### OpenAI Whisper (Speech-to-Text)
- **More accurate transcription** than browser's Web Speech API
- **Better handling of medical terminology** and complex medical terms
- **Superior accent recognition** across different English accents
- **Better noise handling** in non-ideal environments
- **Multi-language support** with high accuracy
- **Consistent quality** across different browsers and devices

### OpenAI TTS (Text-to-Speech)
- **Natural-sounding voices** with human-like intonation
- **6 voice options**: alloy, echo, fable, onyx, nova, shimmer
- **Better pronunciation** of medical terms
- **Adjustable speed** (0.25x - 4.0x)
- **High-quality audio** output (MP3 format)
- **Consistent experience** across all platforms

## Voice Options

### Available Voices

| Voice | Gender | Description | Best For |
|-------|--------|-------------|----------|
| **Alloy** | Neutral | Balanced, professional | General medical consultations |
| **Echo** | Male | Clear articulation | Detailed explanations |
| **Fable** | Male | British accent, expressive | Empathetic consultations |
| **Onyx** | Deep Male | Authoritative | Serious medical discussions |
| **Nova** | Female | Warm and friendly | Patient-friendly consultations |
| **Shimmer** | Female | Soft and gentle | Sensitive topics |

## Setup

### Prerequisites

1. **OpenAI API Key** configured in the system
   - Go to Settings → API Keys
   - Add or enable an OpenAI API key
   - The same key is used for chat, Whisper, and TTS

2. **HTTPS Connection** (required for microphone access)
   - Production: Automatically uses HTTPS
   - Development: Use `localhost` or configure HTTPS

3. **Microphone Permissions**
   - Browser will request microphone access
   - Grant permission when prompted

### Enabling OpenAI Voice

1. Open an AIDoc consultation session
2. Click the **⚙️ Settings** button
3. Go to the **🎤 Voice Mode** tab
4. Under **Voice Provider**, select **"OpenAI Voice (Premium, Requires API Key)"**
5. Configure OpenAI-specific settings:
   - **OpenAI Voice**: Choose from 6 voice options
   - **OpenAI Speech Speed**: Adjust from 0.25x to 4.0x
6. Click **Save Settings**

## Usage

### Basic Operation

1. **Enable Voice Mode**: Click the microphone button (🎤)
2. **Start Speaking**: 
   - **Continuous Mode**: Just start speaking, system auto-detects when you finish
   - **Push-to-Talk Mode**: Click mic to start, click again to stop
3. **Audio Processing**: Your speech is recorded and sent to Whisper API
4. **Transcription**: Whisper transcribes your speech to text
5. **AI Response**: AIDoc processes your message and responds
6. **TTS Playback**: OpenAI TTS reads the response aloud

### Continuous vs Push-to-Talk

**Continuous Mode** (Default):
- Always listening when voice mode is enabled
- Automatically detects when you stop speaking (5-second timeout)
- Best for natural conversation flow
- Higher API usage (more frequent transcriptions)

**Push-to-Talk Mode**:
- Click microphone to start recording
- Click again to stop and transcribe
- More control over when to send messages
- Lower API usage (only transcribe when you want)

## Cost Considerations

### Pricing (as of 2024)

**Whisper API (Speech-to-Text)**:
- **$0.006 per minute** of audio
- Example: 10-minute consultation = $0.06

**TTS API (Text-to-Speech)**:
- **$0.015 per 1,000 characters**
- Example: 500-character response = $0.0075

### Cost Optimization Tips

1. **Use Push-to-Talk Mode**
   - Only transcribe when you're ready to send
   - Reduces accidental recordings
   - Lower overall API usage

2. **Keep Responses Concise**
   - TTS costs are based on character count
   - Shorter AI responses = lower costs

3. **Use Browser Mode for Practice**
   - Switch to browser mode for testing
   - Use OpenAI mode for actual consultations

4. **Monitor Usage**
   - Check your OpenAI dashboard for usage
   - Set up billing alerts

### Estimated Costs

**Typical 10-minute consultation**:
- Patient speaks: ~5 minutes → $0.03 (Whisper)
- AI responses: ~2,000 characters → $0.03 (TTS)
- **Total: ~$0.06 per consultation**

**Monthly usage (100 consultations)**:
- **~$6.00 per month**

## Technical Details

### Architecture

```
┌─────────────────────────────────────────────────┐
│                  AIDoc Frontend                  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │      useVoiceInteraction Hook            │  │
│  │                                          │  │
│  │  ┌────────────┐      ┌────────────┐    │  │
│  │  │  Browser   │      │   OpenAI   │    │  │
│  │  │   Voice    │      │   Voice    │    │  │
│  │  └────────────┘      └────────────┘    │  │
│  │       ↓                     ↓           │  │
│  │  Web Speech API      MediaRecorder      │  │
│  └──────────────────────────────────────────┘  │
│                       ↓                         │
└───────────────────────┼─────────────────────────┘
                        ↓
┌───────────────────────┼─────────────────────────┐
│                  Backend API                     │
│                       ↓                         │
│  ┌──────────────────────────────────────────┐  │
│  │     /api/v1/aidoc/voice/transcribe       │  │
│  │     (Whisper API Integration)            │  │
│  └──────────────────────────────────────────┘  │
│                       ↓                         │
│  ┌──────────────────────────────────────────┐  │
│  │     /api/v1/aidoc/voice/speak            │  │
│  │     (OpenAI TTS Integration)             │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│                  OpenAI API                      │
│                                                  │
│  ┌────────────────┐      ┌────────────────┐    │
│  │  Whisper API   │      │    TTS API     │    │
│  │  (whisper-1)   │      │   (tts-1)      │    │
│  └────────────────┘      └────────────────┘    │
└─────────────────────────────────────────────────┘
```

### API Endpoints

#### POST /api/v1/aidoc/voice/transcribe
Transcribe audio using Whisper API

**Request**:
- `audio`: Audio file (multipart/form-data)
- `language`: Language code (e.g., 'en', 'es', 'fr')

**Response**:
```json
{
  "success": true,
  "transcript": "I have a headache and fever",
  "language": "en"
}
```

#### POST /api/v1/aidoc/voice/speak
Generate speech using OpenAI TTS

**Request**:
```json
{
  "text": "Based on your symptoms...",
  "voice": "alloy",
  "speed": 1.0
}
```

**Response**: Audio file (audio/mpeg)

#### GET /api/v1/aidoc/voice/voices
Get available OpenAI TTS voices

**Response**:
```json
{
  "success": true,
  "voices": [
    {
      "id": "alloy",
      "name": "Alloy",
      "description": "Neutral and balanced voice",
      "gender": "neutral"
    },
    ...
  ]
}
```

#### GET /api/v1/aidoc/voice/status
Check if OpenAI voice features are available

**Response**:
```json
{
  "success": true,
  "available": true,
  "features": {
    "whisper": true,
    "tts": true
  }
}
```

### Audio Format

**Recording**:
- Format: WebM (browser default)
- Codec: Opus
- Sample Rate: 48kHz
- Channels: Mono

**Playback**:
- Format: MP3
- Bitrate: 128kbps
- Sample Rate: 24kHz
- Channels: Mono

## Error Handling

### Automatic Fallback

The system automatically falls back to browser voice mode if:
- OpenAI API key is not configured
- OpenAI API is unavailable
- Network connection is lost
- API rate limits are exceeded

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "OpenAI API key not found" | No API key configured | Add OpenAI API key in Settings |
| "Failed to transcribe audio" | Whisper API error | Check internet connection, try again |
| "Failed to generate speech" | TTS API error | Check internet connection, try again |
| "Microphone access denied" | Permission not granted | Allow microphone access in browser |

## Comparison: Browser vs OpenAI Voice

| Feature | Browser Voice | OpenAI Voice |
|---------|---------------|--------------|
| **Cost** | Free | ~$0.06 per 10-min consultation |
| **Internet** | Optional | Required |
| **Accuracy** | Good | Excellent |
| **Medical Terms** | Fair | Excellent |
| **Voice Quality** | Robotic | Natural |
| **Voice Options** | System-dependent | 6 premium voices |
| **Speed Control** | 0.5x - 2.0x | 0.25x - 4.0x |
| **Consistency** | Varies by device | Consistent |
| **Privacy** | Local processing | Cloud processing |

## Best Practices

### When to Use OpenAI Voice

✅ **Use OpenAI Voice for**:
- Professional medical consultations
- Complex medical terminology
- Patients with strong accents
- Noisy environments
- Consistent voice quality needed
- Multi-language consultations

### When to Use Browser Voice

✅ **Use Browser Voice for**:
- Cost-sensitive scenarios
- Offline consultations
- Testing and development
- Simple conversations
- Privacy-critical situations

## Troubleshooting

### Voice Not Working

1. **Check API Key**
   - Go to Settings → API Keys
   - Verify OpenAI key is enabled

2. **Check Internet Connection**
   - OpenAI voice requires internet
   - Test connection

3. **Check Microphone**
   - Verify microphone is connected
   - Check browser permissions

4. **Try Browser Mode**
   - Switch to browser voice
   - If it works, issue is with OpenAI integration

### Poor Transcription Quality

1. **Reduce Background Noise**
   - Use in quiet environment
   - Use headset with microphone

2. **Speak Clearly**
   - Enunciate medical terms
   - Speak at moderate pace

3. **Check Language Setting**
   - Ensure language matches your speech
   - Settings → Voice Mode → Speech Language

### High Costs

1. **Enable Push-to-Talk**
   - Reduces accidental recordings
   - More control over API usage

2. **Shorten AI Responses**
   - Adjust system prompt
   - Request concise responses

3. **Monitor Usage**
   - Check OpenAI dashboard
   - Set billing alerts

## Security & Privacy

### Data Handling

- **Audio recordings**: Sent to OpenAI, not stored locally
- **Transcripts**: Processed by OpenAI Whisper API
- **TTS audio**: Generated by OpenAI, streamed to browser
- **No permanent storage**: Audio is not saved after transcription

### OpenAI Privacy

- Audio data is processed according to [OpenAI's Privacy Policy](https://openai.com/privacy)
- Data is not used to train models (as of API terms)
- Enterprise customers can request data deletion

### Compliance

For HIPAA compliance:
- Use OpenAI's HIPAA-compliant API tier
- Sign Business Associate Agreement (BAA) with OpenAI
- Enable audit logging
- Consider on-premise alternatives for sensitive data

## Future Enhancements

- [ ] Real-time streaming transcription
- [ ] Voice activity detection improvements
- [ ] Custom voice training for medical terms
- [ ] Offline Whisper model option
- [ ] Voice biometrics for patient identification
- [ ] Multi-speaker support
- [ ] Emotion detection in voice

## Support

For issues or questions:
- Check this documentation
- Review error messages
- Test with browser voice mode
- Check OpenAI API status
- Contact support with error logs


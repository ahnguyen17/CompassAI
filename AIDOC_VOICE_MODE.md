# AIDoc Voice Interaction Mode

## Overview
The AIDoc Voice Interaction Mode enables hands-free, natural conversation with the AI medical triage assistant. Users can speak their symptoms and concerns, and the AI responds with spoken answers, creating a more accessible and intuitive medical consultation experience.

### Voice Providers

AIDoc now supports **two voice providers**:

1. **Browser Voice** (Free, Offline)
   - Uses Web Speech API
   - Works offline
   - No API costs
   - Good for basic consultations

2. **OpenAI Voice** (Premium, Requires API Key) 🆕
   - Uses Whisper API for STT
   - Uses OpenAI TTS for speech synthesis
   - Superior accuracy and voice quality
   - Better medical terminology handling
   - **See [AIDOC_OPENAI_VOICE.md](AIDOC_OPENAI_VOICE.md) for complete OpenAI voice documentation**

## Features

### 🎤 Speech-to-Text (STT)
- **Real-time transcription** of user speech using Web Speech API
- **Interim results display** showing what's being heard in real-time
- **Automatic silence detection** to know when user has finished speaking
- **Multi-language support** for global accessibility
- **Two modes:**
  - **Continuous Listening**: Always listening, automatically detects when you finish speaking
  - **Push-to-Talk**: Click microphone to speak, click again to stop

### 🔊 Text-to-Speech (TTS)
- **Automatic AI response reading** when enabled
- **Customizable voice selection** from available system voices
- **Adjustable speech rate** (0.5x to 2.0x speed)
- **Mute/unmute control** for TTS output
- **Interrupt capability** - stop AI speech at any time

### 🎯 Visual Indicators
- **Listening indicator**: Animated microphone with pulsing ring
- **Speaking indicator**: Animated waveform bars
- **Interim transcript display**: See what's being heard in real-time
- **Error messages**: Clear feedback for permission issues or errors
- **Status text**: "Listening...", "AI Speaking...", etc.

### ⚙️ Configurable Settings
All settings are accessible via the Settings modal (Voice Mode tab):

1. **Push-to-Talk Mode**
   - Toggle between continuous listening and push-to-talk
   - Default: Continuous listening

2. **Auto-speak AI Responses**
   - Enable/disable automatic TTS for AI responses
   - Default: Enabled

3. **Speech Language**
   - Supported languages:
     - English (US, UK)
     - Spanish, French, German, Italian
     - Portuguese (Brazil)
     - Chinese (Mandarin), Japanese, Korean
     - Vietnamese
   - Default: English (US)

4. **Speech Rate**
   - Adjustable from 0.5x (slower) to 2.0x (faster)
   - Default: 1.0x (normal speed)

5. **Voice Selection**
   - Choose from available system voices
   - Filtered by selected language
   - Default: System default voice

## User Interface

### Voice Controls Location
Voice controls are integrated into the chat input area, located in the left icon group:

```
┌─────────────────────────────────────────────────┐
│ [🎤] [🔊] [Listening...] | [Send ➤]            │
└─────────────────────────────────────────────────┘
```

### Control Buttons

1. **Microphone Button (🎤)**
   - Click to enable/disable voice mode
   - Blue background when active
   - Animated when listening
   - Pulsing animation when voice mode is active

2. **Mute Button (🔊/🔇)**
   - Only visible when voice mode is enabled
   - Click to mute/unmute AI responses
   - Speaker icon (🔊) when unmuted
   - Muted speaker icon (🔇) when muted

### Visual States

#### Listening State
- Animated microphone icon bouncing
- Pulsing ring around status indicator
- "Listening..." status text
- Interim transcript shown in real-time

#### Speaking State
- Animated waveform bars
- "AI Speaking..." status text
- Speaking icon (🔊)

#### Idle State (Voice Mode Active)
- Info message: "Voice mode active - speak naturally"
- Static microphone icon

#### Error State
- Red error message with warning icon
- Specific error descriptions (e.g., "Microphone access denied")

## How to Use

### Getting Started

1. **Enable Voice Mode**
   - Click the microphone button (🎤) in the chat input area
   - Grant microphone permissions when prompted by your browser
   - Voice mode is now active

2. **Speak Your Symptoms**
   - In continuous mode: Just start speaking naturally
   - In push-to-talk mode: Click the mic, speak, then click again
   - Watch the interim transcript to see what's being heard
   - The system automatically detects when you finish speaking (1.5s silence)

3. **Receive AI Response**
   - AI response appears as text in the chat
   - If auto-speak is enabled, the response is read aloud
   - You can interrupt the AI by speaking again

4. **Continue Conversation**
   - In continuous mode, the system automatically starts listening after AI finishes speaking
   - Simply speak your next question or concern
   - No need to click buttons between messages

5. **Disable Voice Mode**
   - Click the microphone button again to turn off voice mode
   - You can still type messages normally

### Tips for Best Results

✅ **Do:**
- Speak clearly and at a normal pace
- Wait for the interim transcript to appear before continuing
- Use a quiet environment for better recognition
- Grant microphone permissions when prompted
- Check your microphone is working in browser settings

❌ **Don't:**
- Speak too quickly or mumble
- Use voice mode in very noisy environments
- Interrupt yourself mid-sentence
- Forget to grant microphone permissions

## Browser Compatibility

### Supported Browsers
- ✅ **Chrome/Edge** (Recommended): Full support for STT and TTS
- ✅ **Safari**: Full support with webkit prefix
- ✅ **Firefox**: Limited support (may require flags)
- ❌ **Opera**: Partial support
- ❌ **IE**: Not supported

### Required Permissions
- **Microphone Access**: Required for speech recognition
- **HTTPS**: Web Speech API requires secure context (HTTPS or localhost)

### Browser Settings
1. **Chrome/Edge**: Settings → Privacy and security → Site settings → Microphone
2. **Safari**: Preferences → Websites → Microphone
3. **Firefox**: Preferences → Privacy & Security → Permissions → Microphone

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────────────┐
│           AIDocPage Component                    │
│  ┌──────────────────────────────────────────┐  │
│  │     useVoiceInteraction Hook             │  │
│  │  - Speech Recognition Management         │  │
│  │  - Speech Synthesis Management           │  │
│  │  - Voice Activity Detection              │  │
│  │  - Settings Management                   │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │     VoiceControls Component              │  │
│  │  - UI Controls                           │  │
│  │  - Visual Indicators                     │  │
│  │  - Status Display                        │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Key Components

1. **useVoiceInteraction Hook** (`hooks/useVoiceInteraction.ts`)
   - Manages Web Speech API instances
   - Handles STT and TTS lifecycle
   - Implements voice activity detection
   - Persists settings to localStorage
   - Provides callbacks for transcript completion and errors

2. **VoiceControls Component** (`components/VoiceControls.tsx`)
   - Renders voice control buttons
   - Displays visual indicators
   - Shows interim transcripts
   - Handles user interactions

3. **AIDocSettingsModal** (`components/AIDocSettingsModal.tsx`)
   - Voice settings tab
   - Language selection
   - Speech rate adjustment
   - Voice selection
   - Mode toggles

### Data Flow

```
User speaks → Speech Recognition API → Interim Results → Display
                                    ↓
                              Final Transcript
                                    ↓
                         Silence Detection (1.5s)
                                    ↓
                            Send to AI Backend
                                    ↓
                              AI Response
                                    ↓
                    Display in Chat + TTS (if enabled)
                                    ↓
                         Resume Listening (continuous mode)
```

### Settings Storage

Voice settings are persisted in localStorage:
```javascript
{
  "aiDocVoiceSettings": {
    "enabled": false,
    "autoSpeak": true,
    "language": "en-US",
    "speechRate": 1.0,
    "voiceName": "Google US English",
    "pushToTalk": false
  }
}
```

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Microphone access denied" | User denied permission | Grant permission in browser settings |
| "No microphone found" | No audio input device | Connect a microphone |
| "No speech detected" | Too quiet or no speech | Speak louder or check microphone |
| "Network error" | Connection issue | Check internet connection |
| "Speech recognition not supported" | Browser incompatibility | Use Chrome, Edge, or Safari |

### Graceful Degradation
- If Web Speech API is not supported, voice controls are hidden
- Error messages are displayed clearly to the user
- System falls back to text-only mode
- No impact on core chat functionality

## Accessibility

### Features for Accessibility
- **Hands-free operation**: Ideal for users with mobility impairments
- **Visual feedback**: All audio states have visual indicators
- **Keyboard accessible**: All controls can be accessed via keyboard
- **Screen reader friendly**: Proper ARIA labels and semantic HTML
- **Adjustable speech rate**: Accommodates different processing speeds
- **Multiple languages**: Supports non-English speakers

## Privacy & Security

### Data Handling
- **Speech processing**: Handled by browser's Web Speech API
- **No audio recording**: Audio is not stored or transmitted
- **Transcript only**: Only text transcripts are sent to the AI backend
- **HTTPS required**: Ensures secure transmission
- **Local settings**: Voice preferences stored locally in browser

### Permissions
- Microphone access is requested only when voice mode is activated
- Users can revoke permissions at any time via browser settings
- No persistent microphone access when voice mode is disabled

## Future Enhancements

### Planned Features
- [ ] Voice command shortcuts (e.g., "show SOAP note", "start new consultation")
- [ ] Noise cancellation and audio preprocessing
- [ ] Wake word detection ("Hey AIDoc")
- [ ] Multi-speaker support for group consultations
- [ ] Voice biometrics for patient identification
- [ ] Offline speech recognition
- [ ] Custom medical vocabulary training
- [ ] Voice emotion detection for better triage

### Experimental Features
- [ ] Real-time translation for multilingual consultations
- [ ] Voice-based SOAP note dictation
- [ ] Integration with medical transcription services
- [ ] Voice-controlled navigation

## Troubleshooting

### Voice Mode Not Working
1. Check browser compatibility
2. Ensure HTTPS connection (or localhost)
3. Grant microphone permissions
4. Check microphone is not muted
5. Try refreshing the page
6. Clear browser cache and localStorage

### Poor Recognition Accuracy
1. Speak more clearly and slowly
2. Reduce background noise
3. Check microphone quality
4. Adjust microphone position
5. Try a different browser
6. Select appropriate language in settings

### TTS Not Working
1. Check browser supports Speech Synthesis API
2. Ensure auto-speak is enabled in settings
3. Check system volume is not muted
4. Try selecting a different voice
5. Adjust speech rate if too fast/slow

## Support

For issues or questions about voice mode:
1. Check this documentation
2. Review browser console for errors
3. Test microphone in browser settings
4. Try disabling browser extensions
5. Contact support with error details

## Credits

Built using:
- **Web Speech API**: Browser-native speech recognition and synthesis
- **React Hooks**: State management and lifecycle
- **TypeScript**: Type-safe implementation
- **CSS Animations**: Visual feedback and indicators


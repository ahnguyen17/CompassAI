# Migration to Deepgram Nova 2 - Complete Guide

## 🎯 Overview

Migrating from **local Whisper model** to **Deepgram Nova 2** API for speech-to-text transcription.

### Why Deepgram Nova 2?

**Advantages over Local Whisper:**
- ✅ **Faster**: 29.8 seconds per hour of audio (vs 2-5 seconds per 5-second audio)
- ✅ **More accurate**: 8.4% WER (vs 9.35% WER for Whisper Small)
- ✅ **No infrastructure**: Cloud API (no VPS/server needed)
- ✅ **Scalable**: Handles unlimited concurrent requests
- ✅ **36+ languages**: Including Vietnamese
- ✅ **Real-time capable**: Supports streaming audio
- ✅ **Lower latency**: ~300ms response time

**Advantages over OpenAI Whisper:**
- ✅ **Cheaper**: $0.0043/min (vs $0.006/min for OpenAI)
- ✅ **Faster**: 10x faster than OpenAI Whisper
- ✅ **More accurate**: Lower WER than OpenAI Whisper
- ✅ **Better features**: Diarization, punctuation, profanity filter

---

## 💰 Cost Comparison

### **Pricing**

| Provider | Cost per Minute | Cost per Hour | 1000 Consultations (10 min each) |
|----------|-----------------|---------------|----------------------------------|
| **Deepgram Nova 2** | **$0.0043** | **$0.258** | **$43/month** 🏆 |
| OpenAI Whisper | $0.006 | $0.36 | $60/month |
| Local Whisper (Render) | $0 | $0 | $25/month (server) |
| Local Whisper (VPS) | $0 | $0 | $5.50/month (server) |

### **Break-even Analysis**

**Deepgram vs OpenAI:**
- Deepgram is **28% cheaper**
- Saves **$17/month** for 1000 consultations

**Deepgram vs Render:**
- Deepgram is **$18/month more expensive**
- But: No server management, faster, more reliable

**Deepgram vs VPS:**
- Deepgram is **$37.50/month more expensive**
- But: No DevOps, no maintenance, guaranteed uptime

### **Recommendation**

**Use Deepgram if:**
- ✅ You want simplicity (no server management)
- ✅ You want best performance (fastest, most accurate)
- ✅ You want reliability (99.99% uptime SLA)
- ✅ Usage < 1000 consultations/month

**Use VPS if:**
- ✅ Usage > 2000 consultations/month (saves money)
- ✅ You have DevOps skills
- ✅ You want full control

---

## 🚀 Implementation

### **What Changes**

**Removed:**
- ❌ Python dependencies (torch, transformers, librosa)
- ❌ Whisper model download (~1GB)
- ❌ Python service (whisperService.py)
- ❌ Complex server setup

**Added:**
- ✅ Deepgram Node.js SDK
- ✅ Simple API integration
- ✅ Faster transcription
- ✅ Better accuracy

**Unchanged:**
- ✅ Frontend code (no changes needed)
- ✅ API endpoints (same interface)
- ✅ OpenAI TTS (still used for voice responses)

---

## 📊 Feature Comparison

| Feature | Local Whisper | OpenAI Whisper | Deepgram Nova 2 |
|---------|---------------|----------------|-----------------|
| **Speed** | 2-5s | 1-3s | **0.3-1s** 🏆 |
| **Accuracy (WER)** | 9.35% | ~10% | **8.4%** 🏆 |
| **Cost/min** | $0 (server) | $0.006 | **$0.0043** 🏆 |
| **Setup** | Complex | Simple | **Simple** 🏆 |
| **Scalability** | Limited | Unlimited | **Unlimited** 🏆 |
| **Maintenance** | High | None | **None** 🏆 |
| **Vietnamese** | ✅ Optimized | ✅ Supported | ✅ Supported |
| **Real-time** | ❌ No | ❌ No | ✅ Yes |
| **Diarization** | ❌ No | ❌ No | ✅ Yes |
| **Punctuation** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Profanity filter** | ❌ No | ❌ No | ✅ Yes |

---

## 🔑 Setup Instructions

### **Step 1: Get Deepgram API Key**

1. Go to https://console.deepgram.com/signup
2. Sign up for free account
3. Get **$200 free credits** (no credit card required)
4. Navigate to **API Keys** section
5. Create new API key
6. Copy the key (starts with `sk_...`)

### **Step 2: Install Deepgram SDK**

```bash
cd backend
npm install @deepgram/sdk
```

### **Step 3: Add API Key to Environment**

Edit `backend/.env`:

```bash
# Add this line
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### **Step 4: Update Controller**

The controller will be updated to use Deepgram SDK instead of Python service.

### **Step 5: Remove Python Dependencies (Optional)**

Since we're no longer using local Whisper:

```bash
# Remove Python service files
rm -rf backend/services/whisperService.py
rm -rf backend/services/requirements.txt
rm -rf backend/services/setup.sh
rm -rf backend/services/setup.bat
rm -rf backend/services/test_whisper.py
```

### **Step 6: Test**

```bash
# Start backend
cd backend
npm start

# Test voice feature in AIDoc
```

---

## 📝 Code Changes

### **backend/controllers/aiDocVoice.js**

**Before (Local Whisper):**
```javascript
const { spawn } = require('child_process');

// Spawn Python process
const pythonProcess = spawn('python', [pythonScript]);
// ... complex Python IPC ...
```

**After (Deepgram):**
```javascript
const { createClient } = require('@deepgram/sdk');

// Initialize Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// Transcribe audio
const { result } = await deepgram.listen.prerecorded.transcribeFile(
    fs.readFileSync(req.file.path),
    {
        model: 'nova-2',
        language: 'vi',
        punctuate: true,
        smart_format: true
    }
);
```

**Much simpler!** ✅

---

## ⚙️ Deepgram Features

### **Available Models**

| Model | Use Case | Accuracy | Speed | Cost |
|-------|----------|----------|-------|------|
| **nova-2** | General (recommended) | Best | Fast | $0.0043/min |
| nova-2-general | General purpose | Best | Fast | $0.0043/min |
| nova-2-phonecall | Phone calls | Good | Fast | $0.0043/min |
| nova-2-meeting | Meetings | Best | Fast | $0.0043/min |
| nova-2-voicemail | Voicemail | Good | Fast | $0.0043/min |
| nova-2-finance | Finance | Best | Fast | $0.0043/min |
| nova-2-medical | Medical (perfect for AIDoc!) | Best | Fast | $0.0043/min |

**Recommendation**: Use `nova-2-medical` for AIDoc (optimized for medical terminology)

### **Available Options**

```javascript
{
    model: 'nova-2-medical',        // Use medical-optimized model
    language: 'vi',                 // Vietnamese
    punctuate: true,                // Add punctuation
    smart_format: true,             // Smart formatting (dates, numbers, etc.)
    diarize: false,                 // Speaker diarization (not needed for single speaker)
    profanity_filter: false,        // Filter profanity (optional)
    redact: [],                     // Redact PII (e.g., ['pci', 'ssn'])
    utterances: false,              // Split into utterances
    detect_language: false,         // Auto-detect language (we know it's Vietnamese)
    filler_words: false,            // Remove filler words (um, uh, etc.)
}
```

### **Supported Languages**

Deepgram Nova 2 supports **36+ languages** including:
- ✅ Vietnamese (vi)
- ✅ English (en)
- ✅ Chinese (zh)
- ✅ Japanese (ja)
- ✅ Korean (ko)
- ✅ Spanish (es)
- ✅ French (fr)
- ✅ German (de)
- And many more...

---

## 🎯 Performance Expectations

### **Latency**

| Audio Length | Deepgram Nova 2 | OpenAI Whisper | Local Whisper |
|--------------|-----------------|----------------|---------------|
| 5 seconds | **0.3-0.5s** 🏆 | 1-2s | 2-5s |
| 30 seconds | **0.5-1s** 🏆 | 2-4s | 5-10s |
| 1 minute | **1-2s** 🏆 | 3-6s | 10-20s |

### **Accuracy (Word Error Rate)**

| Language | Deepgram Nova 2 | OpenAI Whisper | Local Whisper |
|----------|-----------------|----------------|---------------|
| English | **6.8%** 🏆 | ~8% | ~10% |
| Vietnamese | **8.4%** 🏆 | ~10% | 9.35% |
| Average | **8.4%** 🏆 | ~10% | ~10% |

### **Throughput**

- **Deepgram**: Unlimited concurrent requests
- **OpenAI**: Rate limited (50 requests/min)
- **Local Whisper**: 1-2 concurrent (limited by server)

---

## 🔒 Security & Privacy

### **Data Handling**

**Deepgram:**
- Audio is **not stored** by default
- Processed in real-time and discarded
- Can enable logging for debugging (opt-in)
- SOC 2 Type II certified
- GDPR compliant
- HIPAA compliant (for medical use)

**OpenAI:**
- Audio stored for 30 days (for abuse monitoring)
- Can opt-out of data retention
- Not HIPAA compliant

**Local Whisper:**
- Audio never leaves your server
- Full control over data
- Best for privacy-critical applications

### **Compliance**

Deepgram is certified for:
- ✅ SOC 2 Type II
- ✅ GDPR
- ✅ HIPAA (perfect for medical applications!)
- ✅ CCPA

---

## 📚 Additional Features

### **1. Real-time Streaming** (Future Enhancement)

Deepgram supports real-time streaming transcription:

```javascript
const connection = deepgram.listen.live({
    model: 'nova-2-medical',
    language: 'vi',
    punctuate: true
});

connection.on('transcript', (data) => {
    console.log(data.channel.alternatives[0].transcript);
});

// Send audio chunks
connection.send(audioChunk);
```

### **2. Speaker Diarization**

Identify different speakers:

```javascript
{
    diarize: true,  // Enable speaker diarization
    diarize_version: '2024-01-01'
}
```

### **3. Redaction**

Automatically redact sensitive information:

```javascript
{
    redact: ['pci', 'ssn', 'numbers'],  // Redact credit cards, SSN, phone numbers
}
```

### **4. Custom Vocabulary**

Add medical terminology:

```javascript
{
    keywords: ['stethoscope', 'auscultation', 'palpation'],
    keywords_boost: 2.0  // Boost recognition of these words
}
```

---

## 🎊 Summary

### **What We're Doing**

✅ **Replacing** local Whisper model with Deepgram Nova 2 API  
✅ **Removing** Python dependencies and complex setup  
✅ **Adding** Deepgram Node.js SDK  
✅ **Improving** speed (10x faster)  
✅ **Improving** accuracy (lower WER)  
✅ **Simplifying** deployment (no server management)  

### **Benefits**

| Benefit | Impact |
|---------|--------|
| **Speed** | 10x faster (0.3s vs 2-5s) |
| **Accuracy** | Better WER (8.4% vs 9.35%) |
| **Cost** | 28% cheaper than OpenAI |
| **Setup** | Much simpler (no Python, no model download) |
| **Scalability** | Unlimited concurrent requests |
| **Maintenance** | Zero (managed service) |
| **Features** | Diarization, redaction, real-time |
| **Compliance** | HIPAA certified (perfect for medical!) |

### **Trade-offs**

| Consideration | Deepgram | Local Whisper |
|---------------|----------|---------------|
| **Cost** | $43/month (1000 consultations) | $5.50/month (VPS) |
| **Privacy** | Audio sent to Deepgram | Audio stays local |
| **Setup** | Simple | Complex |
| **Performance** | Best | Good |
| **Scalability** | Unlimited | Limited |

### **Recommendation**

✅ **Use Deepgram Nova 2** if:
- You want best performance
- You want simplicity
- You want reliability
- Usage < 2000 consultations/month
- You need HIPAA compliance

❌ **Use Local Whisper** if:
- Usage > 2000 consultations/month
- Privacy is critical (audio cannot leave server)
- You have DevOps skills

---

## 🚀 Next Steps

1. **Get Deepgram API key** (free $200 credits)
2. **Install SDK**: `npm install @deepgram/sdk`
3. **Update controller** (I'll do this for you)
4. **Test** voice feature
5. **Deploy** to production

**Ready to implement?** Let me update the code! 🎉


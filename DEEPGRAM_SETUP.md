# Deepgram Nova 2 Setup Guide

## 🎯 Quick Start

Get Deepgram Nova 2 running in **5 minutes**!

---

## 📋 Prerequisites

- ✅ Node.js 16+ installed
- ✅ Backend server running
- ✅ Internet connection

---

## 🚀 Setup Steps

### **Step 1: Get Deepgram API Key** (2 minutes)

1. **Sign up for Deepgram**:
   - Go to https://console.deepgram.com/signup
   - Sign up with email or GitHub
   - **No credit card required!**

2. **Get free credits**:
   - You'll receive **$200 in free credits**
   - Enough for ~46,500 minutes of transcription
   - Enough for ~4,650 consultations (10 min each)

3. **Create API key**:
   - Navigate to **API Keys** in the dashboard
   - Click **Create a New API Key**
   - Give it a name (e.g., "CompassAI Production")
   - Copy the key (starts with `sk_...`)
   - **Save it securely** (you won't see it again!)

---

### **Step 2: Install Deepgram SDK** (1 minute)

```bash
cd backend
npm install @deepgram/sdk
```

Expected output:
```
added 1 package, and audited 123 packages in 3s
```

---

### **Step 3: Configure API Key** (1 minute)

**Option A: Environment Variable (Recommended)**

Edit `backend/.env`:

```bash
# Add this line
DEEPGRAM_API_KEY=sk_your_actual_api_key_here
```

**Option B: Admin Panel**

1. Login to CompassAI admin panel
2. Go to **Settings** → **API Keys**
3. Add new key:
   - **Key Name**: `DEEPGRAM_API_KEY`
   - **Key Value**: `sk_your_actual_api_key_here`
4. Save

---

### **Step 4: Restart Backend** (30 seconds)

```bash
# Stop the server (Ctrl+C)
# Start it again
npm start
```

Expected output:
```
Server listening on port 5000
MongoDB connected successfully
```

---

### **Step 5: Test Voice Feature** (1 minute)

1. Open CompassAI in browser
2. Navigate to **AIDoc** page
3. Click **microphone icon**
4. Speak in Vietnamese: "Xin chào, tôi cần tư vấn y tế"
5. Check that transcription appears in chat

**Expected result**: Text appears in chat box automatically ✅

---

## ✅ Verification

### **Check Logs**

You should see in console:

```
[Deepgram] Transcription successful: Xin chào, tôi cần tư vấn y tế...
```

### **Check Response**

API response should include:

```json
{
  "success": true,
  "transcript": "Xin chào, tôi cần tư vấn y tế",
  "language": "vi",
  "confidence": 0.95
}
```

---

## 🔧 Configuration Options

### **Change Model**

Edit `backend/controllers/aiDocVoice.js`:

```javascript
{
    model: 'nova-2-medical',    // Current: Medical-optimized
    // model: 'nova-2',         // General purpose
    // model: 'nova-2-meeting', // Meeting-optimized
    // model: 'nova-2-phonecall', // Phone call-optimized
}
```

**Recommendation**: Keep `nova-2-medical` for AIDoc (best for medical terminology)

### **Change Language**

Frontend already sends language in request. To change default:

```javascript
const language = req.body.language || 'vi';  // Change 'vi' to 'en', 'zh', etc.
```

### **Enable Features**

```javascript
{
    model: 'nova-2-medical',
    language: 'vi',
    punctuate: true,           // Add punctuation (recommended)
    smart_format: true,        // Format dates, numbers (recommended)
    diarize: true,             // Speaker diarization (if multiple speakers)
    profanity_filter: true,    // Filter profanity (optional)
    redact: ['pci', 'ssn'],    // Redact sensitive info (optional)
    filler_words: true,        // Remove "um", "uh" (optional)
}
```

---

## 💰 Cost Tracking

### **Check Usage**

1. Go to https://console.deepgram.com/
2. Navigate to **Usage** tab
3. View:
   - Total minutes transcribed
   - Cost breakdown
   - Remaining credits

### **Set Alerts**

1. Go to **Billing** → **Alerts**
2. Set alert at 80% of credits
3. Get email notification

### **Estimate Costs**

| Usage | Minutes/Month | Cost/Month |
|-------|---------------|------------|
| 100 consultations | 1,000 min | $4.30 |
| 500 consultations | 5,000 min | $21.50 |
| 1000 consultations | 10,000 min | $43.00 |
| 2000 consultations | 20,000 min | $86.00 |

**Free credits last**: $200 / $0.0043 = ~46,500 minutes = ~4,650 consultations

---

## 🐛 Troubleshooting

### **Error: "Deepgram API key not configured"**

**Solution**:
1. Check `.env` file has `DEEPGRAM_API_KEY=sk_...`
2. Restart backend server
3. Verify key is correct (no extra spaces)

### **Error: "Invalid API key"**

**Solution**:
1. Go to Deepgram console
2. Create new API key
3. Update `.env` file
4. Restart server

### **Error: "Transcription failed"**

**Solution**:
1. Check internet connection
2. Check Deepgram status: https://status.deepgram.com/
3. Check console logs for detailed error
4. Verify audio file is valid

### **Error: "No transcription returned"**

**Solution**:
1. Audio might be too short (< 0.5 seconds)
2. Audio might be silent
3. Check microphone permissions in browser
4. Try speaking louder/clearer

### **Slow transcription**

**Solution**:
1. Check internet speed
2. Deepgram is usually < 1 second
3. If slow, check Deepgram status page
4. Try different model (nova-2 vs nova-2-medical)

---

## 📊 Performance Monitoring

### **Add Logging**

Edit `backend/controllers/aiDocVoice.js`:

```javascript
// Add timing
const startTime = Date.now();

const { result, error } = await deepgram.listen.prerecorded.transcribeFile(...);

const duration = Date.now() - startTime;
console.log(`[Deepgram] Transcription took ${duration}ms`);
```

### **Track Metrics**

Monitor:
- ✅ Response time (should be < 1 second)
- ✅ Success rate (should be > 99%)
- ✅ Confidence score (should be > 0.8)
- ✅ Error rate (should be < 1%)

---

## 🔒 Security Best Practices

### **1. Protect API Key**

```bash
# Never commit .env file
echo ".env" >> .gitignore

# Use environment variables in production
export DEEPGRAM_API_KEY=sk_...
```

### **2. Rotate Keys**

- Rotate API keys every 90 days
- Use different keys for dev/staging/production
- Revoke old keys after rotation

### **3. Monitor Usage**

- Set up usage alerts
- Review usage logs monthly
- Investigate unusual spikes

### **4. Rate Limiting**

Add rate limiting to prevent abuse:

```javascript
const rateLimit = require('express-rate-limit');

const voiceLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Too many transcription requests, please try again later'
});

router.post('/transcribe', protect, voiceLimiter, upload.single('audio'), transcribeAudio);
```

---

## 🎯 Advanced Features

### **1. Real-time Streaming** (Future Enhancement)

For live transcription:

```javascript
const { createClient } = require('@deepgram/sdk');

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

const connection = deepgram.listen.live({
    model: 'nova-2-medical',
    language: 'vi',
    punctuate: true,
    interim_results: true
});

connection.on('open', () => {
    console.log('Connection opened');
});

connection.on('transcript', (data) => {
    const transcript = data.channel.alternatives[0].transcript;
    console.log('Transcript:', transcript);
});

// Send audio chunks
microphone.on('data', (chunk) => {
    connection.send(chunk);
});
```

### **2. Speaker Diarization**

Identify different speakers:

```javascript
{
    diarize: true,
    diarize_version: '2024-01-01'
}

// Result includes speaker labels
result.results.channels[0].alternatives[0].words.forEach(word => {
    console.log(`Speaker ${word.speaker}: ${word.word}`);
});
```

### **3. Custom Vocabulary**

Boost medical terms:

```javascript
{
    keywords: [
        'stethoscope:2.0',
        'auscultation:2.0',
        'palpation:2.0',
        'hypertension:2.0'
    ]
}
```

---

## 📚 Resources

### **Documentation**
- **Deepgram Docs**: https://developers.deepgram.com/
- **Node.js SDK**: https://github.com/deepgram/deepgram-js-sdk
- **API Reference**: https://developers.deepgram.com/reference/

### **Support**
- **Discord**: https://discord.gg/deepgram
- **Email**: support@deepgram.com
- **Status Page**: https://status.deepgram.com/

### **Pricing**
- **Pricing Page**: https://deepgram.com/pricing
- **Calculator**: https://deepgram.com/pricing#calculator

---

## 🎊 Summary

### **What You Did**

✅ Signed up for Deepgram (free $200 credits)  
✅ Installed Deepgram SDK  
✅ Configured API key  
✅ Updated backend controller  
✅ Tested voice transcription  

### **What You Get**

✅ **10x faster** transcription (0.3-1s vs 2-5s)  
✅ **Better accuracy** (8.4% WER vs 9.35%)  
✅ **28% cheaper** than OpenAI ($0.0043/min vs $0.006/min)  
✅ **No infrastructure** (no VPS, no Python, no model download)  
✅ **HIPAA compliant** (perfect for medical use)  
✅ **Scalable** (unlimited concurrent requests)  

### **Next Steps**

1. ✅ Test thoroughly with different voices
2. ✅ Monitor usage in Deepgram console
3. ✅ Set up usage alerts
4. ✅ Deploy to production
5. ✅ Enjoy faster, better transcription! 🎉

---

## 🚀 Deployment

### **Render Deployment**

No changes needed! Just add environment variable:

1. Go to Render dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Add: `DEEPGRAM_API_KEY` = `sk_your_key`
5. Save and redeploy

### **VPS Deployment**

Update `.env` file on server:

```bash
ssh user@your-server
cd /opt/CompassAI/backend
nano .env
# Add: DEEPGRAM_API_KEY=sk_your_key
pm2 restart compassai
```

### **Docker Deployment**

Add to `docker-compose.yml`:

```yaml
environment:
  - DEEPGRAM_API_KEY=${DEEPGRAM_API_KEY}
```

Then:

```bash
docker-compose down
docker-compose up -d
```

---

**Status**: ✅ **READY TO USE!**

Enjoy lightning-fast, accurate transcription with Deepgram Nova 2! 🎤✨


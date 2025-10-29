# Voice Transcription 500 Error - Debugging Guide

## 🐛 Current Issue

Voice transcription is returning a **500 Internal Server Error**:

```
POST https://compassai-pj5g.onrender.com/api/v1/aidoc/voice/transcribe 500 (Internal Server Error)
Whisper transcription error: he {message: 'Request failed with status code 500', ...}
```

---

## 🔍 Most Likely Causes

### **1. Deepgram API Key Not Configured (MOST LIKELY)**

The backend requires a Deepgram API key to transcribe audio. If the key is not configured, the backend returns a 500 error.

**How to Check:**
1. Open AIDoc page
2. Click **Settings** (gear icon)
3. Go to **Voice Settings** tab
4. Check if **Deepgram API Key** field has a value
5. If empty, you need to add your Deepgram API key

**How to Fix:**
1. Get your Deepgram API key from https://console.deepgram.com/
2. Open AIDoc Settings > Voice Settings
3. Paste your Deepgram API key in the **Deepgram API Key** field
4. Click **Save**
5. Try voice transcription again

---

### **2. Invalid Deepgram API Key**

If the API key is configured but invalid, Deepgram will reject the request.

**How to Check:**
- Check backend logs on Render (see below)
- Look for error message from Deepgram API

**How to Fix:**
1. Verify your API key is correct at https://console.deepgram.com/
2. Update the key in AIDoc Settings > Voice Settings
3. Save and try again

---

### **3. Deepgram API Quota Exceeded**

If you've used up your Deepgram credits, the API will reject requests.

**How to Check:**
- Check your Deepgram dashboard: https://console.deepgram.com/
- Look at your usage and remaining credits

**How to Fix:**
1. Add more credits to your Deepgram account
2. Or wait for your quota to reset (if on free tier)

---

### **4. Audio File Format Issue**

The audio file might be in an unsupported format or corrupted.

**How to Check:**
- Check backend logs for file upload details
- Look for errors about file format or size

**How to Fix:**
- This is unlikely as the frontend uses standard WebM format
- If this is the issue, we may need to adjust the audio recording settings

---

## 🔧 How to Check Backend Logs on Render

Since your backend is deployed on Render at `compassai-pj5g.onrender.com`, you need to check the logs there:

### **Steps:**

1. **Go to Render Dashboard**
   - Visit https://dashboard.render.com/
   - Log in to your account

2. **Find Your Backend Service**
   - Look for your backend service (probably named "compassai" or similar)
   - Click on it

3. **View Logs**
   - Click on the **Logs** tab
   - You should see real-time logs from your backend

4. **Look for Deepgram Logs**
   - I've added detailed logging with `[Deepgram]` prefix
   - Look for lines like:
     ```
     [Deepgram] Transcription request received
     [Deepgram] Audio file received: {...}
     [Deepgram] Language: vi
     [Deepgram] Checking for API key in environment: false
     [Deepgram] No env key, checking database...
     [Deepgram] Database query result: false
     [Deepgram] No API key configured
     ```

5. **Identify the Error**
   - If you see `[Deepgram] No API key configured` → **Add API key in Voice Settings**
   - If you see `[Deepgram] Transcription error from API:` → **Check the error message**
   - If you see `[Deepgram] Error stack:` → **Copy the full error and share it**

---

## 📋 Detailed Logging Added

I've added comprehensive logging to the backend to help diagnose the issue:

### **Log Points:**

1. **Request Received**
   ```
   [Deepgram] Transcription request received
   ```

2. **File Upload**
   ```
   [Deepgram] Audio file received: {
       filename: "audio-1234567890.webm",
       size: 12345,
       mimetype: "audio/webm"
   }
   ```

3. **Language Detection**
   ```
   [Deepgram] Language: vi
   ```

4. **API Key Check (Environment)**
   ```
   [Deepgram] Checking for API key in environment: false
   ```

5. **API Key Check (Database)**
   ```
   [Deepgram] No env key, checking database...
   [Deepgram] Database query result: false
   ```

6. **API Key Status**
   ```
   [Deepgram] No API key configured
   ```
   OR
   ```
   [Deepgram] API key found in database
   ```

7. **Deepgram Client Initialization**
   ```
   [Deepgram] Initializing Deepgram client...
   ```

8. **Audio Buffer**
   ```
   [Deepgram] Reading audio file...
   [Deepgram] Audio buffer size: 12345
   ```

9. **Model Selection**
   ```
   [Deepgram] Using model: nova-2-general for language: vi
   ```

10. **API Call**
    ```
    [Deepgram] Calling Deepgram API...
    [Deepgram] API call completed
    ```

11. **Success**
    ```
    [Deepgram] Transcription successful: Hello, this is a test...
    ```

12. **Errors**
    ```
    [Deepgram] Transcription error from API: {error details}
    [Deepgram] Transcription error (catch block): {error}
    [Deepgram] Error stack: {stack trace}
    ```

---

## 🎯 Step-by-Step Debugging Process

### **Step 1: Check if API Key is Configured**

1. Open AIDoc page
2. Click Settings (gear icon)
3. Go to Voice Settings tab
4. Check Deepgram API Key field

**If Empty:**
- ✅ **This is the issue!**
- Add your Deepgram API key
- Save and test again

**If Filled:**
- Continue to Step 2

---

### **Step 2: Check Backend Logs**

1. Go to Render Dashboard
2. Open your backend service
3. View Logs tab
4. Try voice transcription again
5. Watch the logs in real-time

**Look for:**
- `[Deepgram] No API key configured` → Add API key
- `[Deepgram] Transcription error from API:` → Check error message
- `[Deepgram] Error stack:` → Copy full error

---

### **Step 3: Verify API Key is Valid**

1. Go to https://console.deepgram.com/
2. Check your API keys
3. Verify the key you added matches
4. Check if the key is active (not revoked)

**If Invalid:**
- Generate a new API key
- Update in AIDoc Settings
- Save and test again

---

### **Step 4: Check Deepgram Credits**

1. Go to https://console.deepgram.com/
2. Check your usage dashboard
3. Verify you have remaining credits

**If No Credits:**
- Add more credits
- Or wait for quota reset

---

### **Step 5: Test with Simple Audio**

1. Enable voice mode
2. Click microphone
3. Say a short phrase (2-3 words)
4. Check if it works

**If Works:**
- ✅ Issue resolved!

**If Still Fails:**
- Check backend logs for specific error
- Share the error message for further debugging

---

## 🚀 Quick Fix Checklist

- [ ] **Add Deepgram API Key** in AIDoc Settings > Voice Settings
- [ ] **Save Settings**
- [ ] **Refresh AIDoc Page**
- [ ] **Try Voice Transcription**
- [ ] **Check Backend Logs** on Render if still failing
- [ ] **Verify API Key** is valid on Deepgram console
- [ ] **Check Credits** on Deepgram dashboard

---

## 📊 Expected Behavior After Fix

### **Before Fix:**
```
User clicks microphone
  └─> Records audio
  └─> Sends to backend
  └─> ❌ 500 Internal Server Error
  └─> Console: "Whisper transcription error"
  └─> No transcript appears
```

### **After Fix:**
```
User clicks microphone
  └─> Records audio
  └─> Sends to backend
  └─> ✅ Backend transcribes with Deepgram
  └─> ✅ Transcript appears in chat
  └─> ✅ Message sent to AI
  └─> ✅ AI responds
```

---

## 🔍 Common Error Messages

### **"Deepgram API key not configured"**
- **Cause**: No API key in environment or database
- **Fix**: Add API key in Voice Settings

### **"Invalid API key"**
- **Cause**: API key is incorrect or revoked
- **Fix**: Verify key on Deepgram console, update in settings

### **"Insufficient credits"**
- **Cause**: Deepgram account has no remaining credits
- **Fix**: Add credits to Deepgram account

### **"No transcription returned"**
- **Cause**: Deepgram API returned empty result
- **Fix**: Check audio quality, try again

### **"Failed to transcribe audio"**
- **Cause**: Generic error (network, API, etc.)
- **Fix**: Check backend logs for specific error

---

## 📝 Next Steps

1. **Check if Deepgram API key is configured** in Voice Settings
2. **If not configured**: Add your Deepgram API key and save
3. **If configured**: Check backend logs on Render for specific error
4. **Share the error message** from backend logs if issue persists

---

## 🎉 Once Fixed

After adding the Deepgram API key and saving:

1. ✅ Voice transcription will work
2. ✅ Transcript will appear in chat
3. ✅ AI will respond with voice (if auto-speak enabled)
4. ✅ Continuous mode will work (if enabled)
5. ✅ Talk-to-interrupt will work

---

## 💡 Pro Tip

**Get a Deepgram API Key:**
1. Go to https://console.deepgram.com/
2. Sign up for free account
3. Get $200 in free credits
4. Copy your API key
5. Add to AIDoc Settings > Voice Settings
6. Enjoy voice features! 🎤

**Deepgram Pricing:**
- **Free Tier**: $200 credits (enough for ~46,000 minutes!)
- **nova-2-medical**: $0.0043/minute (English only)
- **nova-2-general**: $0.0043/minute (100+ languages)

---

## 🆘 Still Having Issues?

If you've followed all steps and still getting errors:

1. **Check backend logs** on Render
2. **Copy the full error message** including stack trace
3. **Share the error** for further debugging
4. **Include**:
   - Error message from backend logs
   - Browser console error
   - Steps you've tried
   - Whether API key is configured

I'll help you debug further! 🚀


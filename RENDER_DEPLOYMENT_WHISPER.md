# Deploying Local Whisper Model to Render - Complete Guide

## ⚠️ Important Considerations

### **Can You Run This on Render?**

**Short Answer**: **Yes, but with significant limitations** ⚠️

**Long Answer**: Here are the challenges and solutions:

---

## 🚨 Challenges with Render Deployment

### **1. Disk Space Limitations**

**Problem:**
- Whisper model size: **~1GB**
- Render free tier: **512MB disk space**
- Render paid tier: **10GB disk space** (sufficient)

**Solution:**
- ✅ Use **Render Paid Plan** ($7/month minimum)
- ❌ Free tier won't work

### **2. Memory Limitations**

**Problem:**
- Model inference (CPU): **~2GB RAM**
- Render free tier: **512MB RAM**
- Render Starter: **512MB RAM**
- Render Standard: **2GB RAM** (minimum needed)

**Solution:**
- ✅ Use **Render Standard Plan** ($25/month)
- ❌ Free/Starter tiers won't work

### **3. Cold Start Time**

**Problem:**
- Model download: **5-10 minutes** (first deployment)
- Model loading: **5-10 seconds** (each cold start)
- Render free tier: **Spins down after 15 minutes of inactivity**
- First request after spin-down: **Very slow** (30+ seconds)

**Solution:**
- ✅ Use **Paid Plan** (no spin-down)
- ✅ Keep model cached in memory
- ⚠️ Accept slow first request on free tier

### **4. Build Time**

**Problem:**
- Python dependencies: **5-10 minutes**
- Model download: **5-10 minutes**
- Total build time: **10-20 minutes**
- Render build timeout: **15 minutes** (free), **30 minutes** (paid)

**Solution:**
- ✅ Use **Docker** to cache dependencies
- ✅ Download model during build (not runtime)
- ✅ Use **Render Paid Plan** for longer timeout

### **5. Cost Comparison**

| Option | Cost/Month | Pros | Cons |
|--------|------------|------|------|
| **OpenAI API** | ~$60 (1000 consultations) | Simple, fast, scalable | Ongoing costs, privacy concerns |
| **Render Free** | $0 | Free | ❌ Won't work (insufficient resources) |
| **Render Starter** | $7 | Cheap | ❌ Won't work (512MB RAM) |
| **Render Standard** | $25 | Works, no spin-down | More expensive than OpenAI for low usage |
| **Render Pro** | $85 | Fast, reliable | Very expensive |

**Recommendation:**
- **Low usage (<400 consultations/month)**: Use **OpenAI API** ($0-$25/month)
- **Medium usage (400-1000)**: Use **Render Standard** ($25/month)
- **High usage (>1000)**: Use **Render Standard** ($25/month) or self-host

---

## ✅ Deployment Options

### **Option 1: Render with Docker (Recommended)**

**Pros:**
- ✅ Works on Render
- ✅ Caches dependencies
- ✅ Faster builds
- ✅ Predictable environment

**Cons:**
- ⚠️ Requires Render Standard ($25/month)
- ⚠️ Longer initial build time

### **Option 2: Render with Build Script**

**Pros:**
- ✅ Simpler setup
- ✅ No Docker knowledge needed

**Cons:**
- ⚠️ Slower builds
- ⚠️ Requires Render Standard ($25/month)

### **Option 3: Keep OpenAI API**

**Pros:**
- ✅ Works on Render Free
- ✅ Fast, reliable
- ✅ No infrastructure management

**Cons:**
- ⚠️ Ongoing API costs
- ⚠️ Privacy concerns

### **Option 4: Self-Host (VPS)**

**Pros:**
- ✅ Full control
- ✅ Cheaper for high usage
- ✅ Better performance

**Cons:**
- ⚠️ Requires server management
- ⚠️ More complex setup

---

## 🐳 Option 1: Docker Deployment (Recommended)

### **Step 1: Create Dockerfile**

Create `backend/Dockerfile`:

```dockerfile
# Use official Node.js image as base
FROM node:18-bullseye

# Install Python and system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy Python requirements
COPY services/requirements.txt ./services/

# Install Python dependencies
RUN pip3 install --no-cache-dir -r services/requirements.txt

# Download Whisper model during build (not runtime)
RUN python3 -c "from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor; \
    print('Downloading Whisper model...'); \
    AutoProcessor.from_pretrained('namphungdn134/whisper-small-vi'); \
    AutoModelForSpeechSeq2Seq.from_pretrained('namphungdn134/whisper-small-vi'); \
    print('Model downloaded successfully!')"

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/voice-temp

# Expose port
EXPOSE 5000

# Start command
CMD ["npm", "start"]
```

### **Step 2: Create .dockerignore**

Create `backend/.dockerignore`:

```
node_modules
npm-debug.log
.env
.git
.gitignore
uploads/*
!uploads/.gitkeep
*.md
```

### **Step 3: Create render.yaml**

Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: compassai-backend
    env: docker
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    plan: standard  # Required for 2GB RAM
    region: oregon
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false  # Set in Render dashboard
      - key: JWT_SECRET
        sync: false  # Set in Render dashboard
      - key: JWT_EXPIRE
        value: 30d
      - key: PORT
        value: 5000
    healthCheckPath: /api/v1/health
```

### **Step 4: Deploy to Render**

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add Docker support for Whisper model"
   git push origin main
   ```

2. **Create Render Service:**
   - Go to https://render.com/
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render will detect `render.yaml`
   - Click "Apply"

3. **Set Environment Variables:**
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Strong random secret
   - `JWT_EXPIRE`: `30d`

4. **Deploy:**
   - Click "Create Web Service"
   - Wait 15-20 minutes for build
   - Model will be downloaded during build

---

## 📝 Option 2: Build Script Deployment

### **Step 1: Create Build Script**

Create `backend/render-build.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting Render build..."

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install Python and pip
echo "🐍 Setting up Python..."
apt-get update
apt-get install -y python3 python3-pip python3-dev build-essential libsndfile1 ffmpeg

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r services/requirements.txt

# Download Whisper model
echo "📥 Downloading Whisper model..."
python3 -c "from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor; \
    print('Downloading model...'); \
    AutoProcessor.from_pretrained('namphungdn134/whisper-small-vi'); \
    AutoModelForSpeechSeq2Seq.from_pretrained('namphungdn134/whisper-small-vi'); \
    print('Model downloaded!')"

echo "✅ Build complete!"
```

Make it executable:
```bash
chmod +x backend/render-build.sh
```

### **Step 2: Configure Render**

In Render dashboard:

**Build Command:**
```bash
./render-build.sh
```

**Start Command:**
```bash
npm start
```

**Environment:**
- `NODE_ENV`: `production`
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: Strong random secret
- `PORT`: `5000`

**Plan:**
- Select **Standard** ($25/month) for 2GB RAM

---

## 🔧 Optimization Tips

### **1. Reduce Model Size**

Use a smaller model for faster loading:

```python
# In whisperService.py
MODEL_ID = "openai/whisper-tiny"  # 39M params, ~150MB
# or
MODEL_ID = "openai/whisper-base"  # 74M params, ~300MB
```

**Trade-off:**
- Smaller model = Faster, less RAM, lower accuracy
- Larger model = Slower, more RAM, higher accuracy

### **2. Model Caching**

Keep model in memory between requests:

```python
# Already implemented in whisperService.py
# Model loaded once, cached globally
```

### **3. Health Check Endpoint**

Add to `backend/server.js`:

```javascript
// Health check endpoint
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
```

### **4. Timeout Configuration**

Increase timeout for first request:

```javascript
// In backend/routes/aiDocVoice.js
router.post('/transcribe', protect, (req, res, next) => {
    req.setTimeout(60000); // 60 seconds
    next();
}, upload.single('audio'), transcribeAudio);
```

---

## 📊 Performance Expectations

### **Render Standard (2GB RAM, CPU)**

| Metric | Value |
|--------|-------|
| **Build time** | 15-20 minutes |
| **Cold start** | 5-10 seconds |
| **First transcription** | 5-10 seconds |
| **Subsequent** | 2-5 seconds |
| **Memory usage** | ~1.5-2GB |
| **Disk usage** | ~1.5GB |

### **Render Pro (4GB RAM, CPU)**

| Metric | Value |
|--------|-------|
| **Build time** | 15-20 minutes |
| **Cold start** | 3-5 seconds |
| **First transcription** | 3-5 seconds |
| **Subsequent** | 1-3 seconds |
| **Memory usage** | ~1.5-2GB |
| **Disk usage** | ~1.5GB |

---

## 💰 Cost Analysis

### **Scenario: 1000 consultations/month, 10 minutes each**

| Option | Monthly Cost | Notes |
|--------|--------------|-------|
| **OpenAI API** | $60 | Simple, reliable |
| **Render Standard** | $25 | Cheaper, more complex |
| **Render Pro** | $85 | Faster, expensive |
| **VPS (DigitalOcean)** | $12 | Cheapest, requires management |

**Break-even point**: ~400 consultations/month

---

## ⚠️ Limitations on Render

1. **No GPU**: CPU-only inference (slower)
2. **Memory**: Minimum 2GB RAM required
3. **Disk**: Minimum 2GB disk required
4. **Build time**: 15-20 minutes
5. **Cold start**: 5-10 seconds (paid plan)

---

## 🎯 Recommendation

### **For Your Use Case:**

**If usage < 400 consultations/month:**
- ✅ **Keep OpenAI API** (simpler, cheaper)
- Cost: $0-$25/month

**If usage > 400 consultations/month:**
- ✅ **Deploy to Render Standard** ($25/month)
- Use Docker deployment (Option 1)
- Accept 2-5 second transcription time

**If you need best performance:**
- ✅ **Self-host on VPS** (DigitalOcean, AWS, etc.)
- Cost: $12-20/month
- Full control, better performance

---

## 🚀 Next Steps

1. **Decide on deployment option**
2. **If using Render:**
   - Create Dockerfile (see Option 1)
   - Push to GitHub
   - Deploy to Render Standard
3. **If keeping OpenAI:**
   - No changes needed
   - Current setup works perfectly

**Need help deciding?** Consider:
- Current usage volume
- Budget constraints
- Performance requirements
- Privacy requirements

---

## 📚 Additional Resources

- **Render Docs**: https://render.com/docs
- **Docker Docs**: https://docs.docker.com/
- **Hugging Face**: https://huggingface.co/docs/transformers/
- **Whisper Model**: https://huggingface.co/namphungdn134/whisper-small-vi

---

## 🎊 Summary

**Can you deploy to Render?** ✅ **Yes**

**Should you?** It depends:
- ✅ Yes if usage > 400 consultations/month
- ❌ No if usage < 400 consultations/month (use OpenAI API)

**Minimum Requirements:**
- Render Standard plan ($25/month)
- 2GB RAM
- 2GB disk space
- Docker deployment recommended

**Status**: ✅ **READY TO DEPLOY** (with Render Standard plan)


# Option C: Self-Host on VPS - Complete Guide

## 🎯 Overview

Self-hosting the local Whisper model on a VPS (Virtual Private Server) gives you **full control**, **best performance**, and **lowest cost** for high-volume usage.

---

## 💰 Cost Comparison

### **Monthly Costs**

| Provider | Plan | RAM | CPU | Disk | GPU | Cost/Month |
|----------|------|-----|-----|------|-----|------------|
| **DigitalOcean** | Basic | 2GB | 2 vCPU | 50GB SSD | ❌ | **$12** |
| **DigitalOcean** | General Purpose | 4GB | 2 vCPU | 80GB SSD | ❌ | **$24** |
| **Linode** | Shared CPU | 2GB | 1 vCPU | 50GB SSD | ❌ | **$12** |
| **Vultr** | Regular Performance | 2GB | 1 vCPU | 55GB SSD | ❌ | **$12** |
| **Hetzner** | CX21 | 4GB | 2 vCPU | 40GB SSD | ❌ | **€5 (~$5.50)** 🏆 |
| **AWS Lightsail** | 2GB | 2GB | 1 vCPU | 60GB SSD | ❌ | **$12** |
| **Contabo** | VPS S | 8GB | 4 vCPU | 200GB SSD | ❌ | **€5 (~$5.50)** 🏆 |
| **DigitalOcean** | GPU Droplet | 8GB | 2 vCPU | 100GB SSD | ✅ 1x GPU | **$90** |
| **Paperspace** | GPU | 8GB | 4 vCPU | 50GB SSD | ✅ 1x GPU | **$8/month + $0.51/hr** |

### **Best Value Recommendations**

**🏆 Best Budget Option: Hetzner CX21**
- **€5/month (~$5.50)**
- 4GB RAM, 2 vCPU, 40GB SSD
- Located in Germany/Finland
- Excellent performance
- **Cheapest option that works well**

**🏆 Best Performance/Price: Contabo VPS S**
- **€5/month (~$5.50)**
- 8GB RAM, 4 vCPU, 200GB SSD
- Located in Germany/US/Singapore
- Overkill specs for the price
- **Best value overall**

**🏆 Best US Option: DigitalOcean Basic**
- **$12/month**
- 2GB RAM, 2 vCPU, 50GB SSD
- US data centers
- Easy to use
- **Best for US-based users**

---

## 📊 Performance Comparison

### **CPU Performance (2GB RAM VPS)**

| Metric | Value |
|--------|-------|
| **First transcription** | 5-10 seconds (model loading) |
| **Subsequent** | 2-5 seconds per 5-second audio |
| **Memory usage** | ~1.5-2GB |
| **Concurrent requests** | 1-2 (limited by RAM) |

### **CPU Performance (4GB+ RAM VPS)**

| Metric | Value |
|--------|-------|
| **First transcription** | 3-5 seconds (model loading) |
| **Subsequent** | 1-3 seconds per 5-second audio |
| **Memory usage** | ~1.5-2GB |
| **Concurrent requests** | 2-4 |

### **GPU Performance (if you add GPU)**

| Metric | Value |
|--------|-------|
| **First transcription** | 2-3 seconds (model loading) |
| **Subsequent** | 0.3-0.8 seconds per 5-second audio |
| **Memory usage** | ~2GB VRAM + 1GB RAM |
| **Concurrent requests** | 5-10 |

---

## 🚀 Deployment Options

### **Option C1: Docker Deployment (Recommended)**

**Pros:**
- ✅ Easy to deploy and update
- ✅ Isolated environment
- ✅ Same setup as Render
- ✅ Easy to scale

**Cons:**
- ⚠️ Slightly more overhead
- ⚠️ Requires Docker knowledge

### **Option C2: Direct Installation**

**Pros:**
- ✅ Maximum performance
- ✅ No Docker overhead
- ✅ Simpler for debugging

**Cons:**
- ⚠️ Manual dependency management
- ⚠️ Harder to update
- ⚠️ Less isolated

### **Option C3: Docker Compose (Best for Production)**

**Pros:**
- ✅ Multi-container orchestration
- ✅ Easy to manage
- ✅ Can add MongoDB, Redis, etc.
- ✅ Production-ready

**Cons:**
- ⚠️ More complex setup
- ⚠️ Requires Docker Compose knowledge

---

## 🐳 Option C1: Docker Deployment (Recommended)

### **Step 1: Choose a VPS Provider**

**Recommended: Hetzner CX21** (€5/month)

1. Go to https://www.hetzner.com/cloud
2. Create account
3. Create new project
4. Add server:
   - **Location**: Nuremberg, Germany (or closest to you)
   - **Image**: Ubuntu 22.04
   - **Type**: CX21 (4GB RAM, 2 vCPU)
   - **SSH Key**: Add your public key
5. Create server

### **Step 2: Initial Server Setup**

SSH into your server:

```bash
ssh root@your-server-ip
```

Update system:

```bash
apt update && apt upgrade -y
```

Install Docker:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Start Docker
systemctl start docker
systemctl enable docker

# Verify installation
docker --version
```

Install Docker Compose:

```bash
# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### **Step 3: Clone Your Repository**

```bash
# Install Git
apt install git -y

# Clone your repo
cd /opt
git clone https://github.com/yourusername/CompassAI.git
cd CompassAI/backend
```

### **Step 4: Create Environment File**

```bash
nano .env
```

Add your environment variables:

```bash
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/compassai?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=30d

# Server Configuration
PORT=5000
NODE_ENV=production
```

Save and exit (Ctrl+X, Y, Enter)

### **Step 5: Build and Run Docker Container**

```bash
# Build the Docker image
docker build -t compassai-backend .

# Run the container
docker run -d \
  --name compassai \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v /opt/CompassAI/backend/uploads:/app/uploads \
  compassai-backend

# Check logs
docker logs -f compassai
```

### **Step 6: Setup Nginx Reverse Proxy**

Install Nginx:

```bash
apt install nginx -y
```

Create Nginx configuration:

```bash
nano /etc/nginx/sites-available/compassai
```

Add configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    # Increase timeouts for Whisper processing
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Increase max upload size for audio files
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
ln -s /etc/nginx/sites-available/compassai /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### **Step 7: Setup SSL with Let's Encrypt (Optional but Recommended)**

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

### **Step 8: Setup Firewall**

```bash
# Install UFW
apt install ufw -y

# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
```

---

## 📦 Option C2: Direct Installation (No Docker)

### **Step 1-2: Same as Option C1**

### **Step 3: Install Dependencies**

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Python and dependencies
apt install -y python3 python3-pip python3-dev build-essential libsndfile1 ffmpeg

# Verify installations
node --version
npm --version
python3 --version
```

### **Step 4: Clone and Setup Application**

```bash
cd /opt
git clone https://github.com/yourusername/CompassAI.git
cd CompassAI/backend

# Install Node.js dependencies
npm install --production

# Install Python dependencies
pip3 install -r services/requirements.txt

# Download Whisper model
python3 -c "from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor; \
    AutoProcessor.from_pretrained('namphungdn134/whisper-small-vi'); \
    AutoModelForSpeechSeq2Seq.from_pretrained('namphungdn134/whisper-small-vi')"
```

### **Step 5: Create Environment File**

```bash
nano .env
```

(Same as Option C1)

### **Step 6: Setup PM2 Process Manager**

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name compassai

# Setup auto-start on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit
```

### **Step 7-8: Same as Option C1** (Nginx + SSL)

---

## 🎼 Option C3: Docker Compose (Production-Ready)

### **Step 1: Create docker-compose.yml**

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  # Backend API with Whisper
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: compassai-backend
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRE=30d
    volumes:
      - ./backend/uploads:/app/uploads
    networks:
      - compassai-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    container_name: compassai-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
    networks:
      - compassai-network

networks:
  compassai-network:
    driver: bridge
```

### **Step 2: Create Nginx Configuration**

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:5000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        client_max_body_size 10M;

        location / {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
}
```

### **Step 3: Deploy**

```bash
# Create .env file
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

---

## 🔧 Maintenance & Updates

### **Update Application (Docker)**

```bash
cd /opt/CompassAI
git pull origin main
cd backend
docker build -t compassai-backend .
docker stop compassai
docker rm compassai
docker run -d --name compassai --restart unless-stopped -p 5000:5000 --env-file .env -v /opt/CompassAI/backend/uploads:/app/uploads compassai-backend
```

### **Update Application (PM2)**

```bash
cd /opt/CompassAI
git pull origin main
cd backend
npm install --production
pm2 restart compassai
```

### **Update Application (Docker Compose)**

```bash
cd /opt/CompassAI
git pull origin main
docker-compose down
docker-compose build
docker-compose up -d
```

### **Monitor Resources**

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check Docker stats
docker stats

# Check PM2 stats
pm2 monit
```

### **Backup**

```bash
# Backup uploads
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz /opt/CompassAI/backend/uploads

# Backup environment
cp /opt/CompassAI/backend/.env /opt/CompassAI/backend/.env.backup
```

---

## 📊 Cost Analysis

### **Scenario: 1000 consultations/month, 10 minutes each**

| Option | Setup Cost | Monthly Cost | Annual Cost |
|--------|------------|--------------|-------------|
| **OpenAI API** | $0 | $60 | $720 |
| **Render Standard** | $0 | $25 | $300 |
| **Hetzner CX21** | $0 | $5.50 | $66 |
| **DigitalOcean Basic** | $0 | $12 | $144 |
| **Contabo VPS S** | $0 | $5.50 | $66 |

**Savings with VPS:**
- vs OpenAI API: **$654-714/year**
- vs Render: **$234-294/year**

---

## ⚡ Performance Optimization Tips

### **1. Use Smaller Model for Faster Inference**

Edit `backend/services/whisperService.py`:

```python
# Faster but less accurate
MODEL_ID = "openai/whisper-tiny"  # 39M params, ~150MB, 2x faster

# Balanced
MODEL_ID = "openai/whisper-base"  # 74M params, ~300MB, 1.5x faster

# Current (best accuracy)
MODEL_ID = "namphungdn134/whisper-small-vi"  # 242M params, ~1GB
```

### **2. Enable Swap (for 2GB RAM VPS)**

```bash
# Create 2GB swap file
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### **3. Optimize Python**

```bash
# Use PyPy for faster Python (optional)
apt install pypy3 pypy3-dev -y
```

### **4. Add Redis Caching (Optional)**

Cache transcriptions for repeated audio:

```bash
# Install Redis
apt install redis-server -y

# Install Python Redis client
pip3 install redis
```

---

## 🎯 Which VPS Provider Should You Choose?

### **Best for Budget: Hetzner CX21** 🏆
- **€5/month (~$5.50)**
- 4GB RAM, 2 vCPU
- **Best value for money**
- Located in Europe
- Excellent performance

### **Best for US Users: DigitalOcean**
- **$12/month**
- 2GB RAM, 2 vCPU
- US data centers
- Easy to use
- Great documentation

### **Best for Overkill Specs: Contabo VPS S**
- **€5/month (~$5.50)**
- 8GB RAM, 4 vCPU
- Insane value
- Multiple locations

### **Best for Simplicity: AWS Lightsail**
- **$12/month**
- 2GB RAM, 1 vCPU
- Integrated with AWS
- Easy backups

---

## 🎊 Summary

### **Why Choose VPS Self-Hosting?**

✅ **Cheapest option** ($5.50-12/month vs $25-60)  
✅ **Full control** over server and configuration  
✅ **Best performance** (dedicated resources)  
✅ **Scalable** (upgrade RAM/CPU as needed)  
✅ **Privacy** (your server, your data)  
✅ **Learning opportunity** (DevOps skills)  

### **When to Choose VPS?**

- ✅ Usage > 400 consultations/month
- ✅ You have basic Linux/server knowledge
- ✅ You want lowest cost
- ✅ You want best performance
- ✅ You care about privacy

### **When NOT to Choose VPS?**

- ❌ No server management experience
- ❌ Don't want to manage infrastructure
- ❌ Need guaranteed uptime (use managed service)
- ❌ Low usage (<400 consultations/month)

---

## 📚 Next Steps

1. **Choose a VPS provider** (Hetzner recommended)
2. **Follow deployment guide** (Option C1 recommended)
3. **Setup monitoring** (PM2 or Docker)
4. **Configure backups**
5. **Test thoroughly**
6. **Update frontend** to point to your VPS

**Need help?** I can guide you through each step! 🚀


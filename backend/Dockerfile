# Multi-stage Dockerfile for CompassAI Backend with Local Whisper Model
# This Dockerfile supports both Node.js backend and Python Whisper service

FROM node:18-bullseye

# Install Python and system dependencies for audio processing
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

# Copy package files for Node.js
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy Python requirements
COPY services/requirements.txt ./services/

# Install Python dependencies
RUN pip3 install --no-cache-dir -r services/requirements.txt

# Download Whisper model during build (not runtime)
# This saves time on container startup
RUN python3 -c "from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor; \
    print('Downloading Whisper model: namphungdn134/whisper-small-vi'); \
    AutoProcessor.from_pretrained('namphungdn134/whisper-small-vi'); \
    AutoModelForSpeechSeq2Seq.from_pretrained('namphungdn134/whisper-small-vi'); \
    print('Model downloaded successfully!')"

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/voice-temp

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start command
CMD ["npm", "start"]


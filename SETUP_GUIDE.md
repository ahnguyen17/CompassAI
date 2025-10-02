# CompassAI Setup Guide

## 🚨 Current Issue: MongoDB Connection

The backend server cannot start because MongoDB is not configured. You have two options:

## Option 1: Local MongoDB (Recommended for Development)

### Step 1: Install MongoDB
1. **Download MongoDB Community Server:**
   - Visit: https://www.mongodb.com/try/download/community
   - Select your OS (Windows)
   - Download and install

2. **Install MongoDB as a Service:**
   - During installation, check "Install MongoDB as a Service"
   - This will start MongoDB automatically

3. **Verify Installation:**
   ```powershell
   # Check if MongoDB is running
   Get-Service -Name MongoDB
   
   # Or try connecting
   mongosh
   ```

### Step 2: Update .env File
The `.env` file has been created with default local settings:
```
MONGODB_URI=mongodb://localhost:27017/compassai
```

This should work once MongoDB is installed and running.

### Step 3: Restart Backend
```powershell
cd backend
npm start
```

## Option 2: MongoDB Atlas (Cloud - Free Tier Available)

### Step 1: Create MongoDB Atlas Account
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up for free account
3. Create a free cluster (M0 Sandbox)

### Step 2: Get Connection String
1. In Atlas dashboard, click "Connect"
2. Choose "Connect your application"
3. Copy the connection string
4. It looks like: `mongodb+srv://username:password@cluster.mongodb.net/`

### Step 3: Update .env File
Edit `backend/.env`:
```env
# Replace with your Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/compassai?retryWrites=true&w=majority
```

**Important:** Replace `username` and `password` with your actual credentials!

### Step 4: Whitelist Your IP
1. In Atlas, go to "Network Access"
2. Click "Add IP Address"
3. Choose "Allow Access from Anywhere" (for development)
4. Or add your specific IP address

### Step 5: Restart Backend
```powershell
cd backend
npm start
```

## ✅ Verification

Once MongoDB is connected, you should see:
```
Server listening on port 5000
MongoDB Connected: localhost (or your Atlas cluster)
```

## 🔧 Additional Configuration

### API Keys (Optional)
The application can work without API keys initially, but you'll need them to use AI features:

1. **OpenAI:** https://platform.openai.com/api-keys
2. **Anthropic:** https://console.anthropic.com/
3. **Google (Gemini):** https://makersuite.google.com/app/apikey
4. **DeepSeek:** https://platform.deepseek.com/
5. **Perplexity:** https://www.perplexity.ai/settings/api

Add them to `backend/.env`:
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AI...
DEEPSEEK_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...
```

Or configure them through the Admin Settings panel after logging in.

### AWS S3 (Optional - for file uploads)
If you want file upload functionality:

1. Create AWS account
2. Create S3 bucket
3. Create IAM user with S3 access
4. Add credentials to `.env`:
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_bucket_name
```

## 🎯 Quick Start (After MongoDB Setup)

### 1. Start Backend
```powershell
cd backend
npm start
```

Expected output:
```
Server listening on port 5000
MongoDB Connected: localhost
```

### 2. Start Frontend
```powershell
cd frontend/client
npm run dev
```

Expected output:
```
VITE v... ready in ...ms
➜  Local:   http://localhost:5173/
```

### 3. Access Application
1. Open browser: http://localhost:5173
2. Register a new account
3. Log in
4. Access AIDoc: Click username → 🏥 AIDoc
5. Enter password: **CompassDoc**

## 🐛 Troubleshooting

### MongoDB Connection Failed
**Error:** `Error connecting to MongoDB: connect ECONNREFUSED`

**Solutions:**
1. Check if MongoDB service is running:
   ```powershell
   Get-Service -Name MongoDB
   ```
2. Start MongoDB service:
   ```powershell
   Start-Service -Name MongoDB
   ```
3. Or restart your computer (if installed as service)

### Port Already in Use
**Error:** `Port 5000 is already in use`

**Solutions:**
1. Kill the process using port 5000:
   ```powershell
   # Find process
   netstat -ano | findstr :5000
   
   # Kill process (replace PID with actual process ID)
   taskkill /PID <PID> /F
   ```
2. Or change port in `backend/.env`:
   ```env
   PORT=5001
   ```

### JWT Secret Warning
**Warning:** Change JWT_SECRET in production

**Solution:**
For production, generate a secure random string:
```powershell
# In Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Update `backend/.env`:
```env
JWT_SECRET=your_generated_secure_random_string
```

### API Keys Not Working
**Error:** API key not found or disabled

**Solutions:**
1. Add API keys to `backend/.env`
2. Or configure through Admin Settings panel:
   - Log in as admin
   - Go to Settings
   - Add API keys in the API Keys section

## 📚 Next Steps

After successful setup:

1. **Create Admin Account:**
   - Register first user (automatically becomes admin)
   - Or use seeder script to create test data

2. **Configure API Keys:**
   - Add at least one AI provider API key
   - Test regular chat functionality

3. **Test AIDoc:**
   - Access via navbar dropdown
   - Enter password: CompassDoc
   - Start a medical consultation

4. **Explore Features:**
   - Regular chat
   - Custom AI assistants
   - User memory
   - Settings configuration

## 🔐 Security Notes

### Development vs Production

**Development (.env file created):**
- ✅ Simple setup
- ✅ Local MongoDB
- ⚠️ Weak JWT secret
- ⚠️ No encryption

**Production (TODO):**
- 🔒 Use environment variables (not .env file)
- 🔒 Strong JWT secret
- 🔒 MongoDB Atlas with authentication
- 🔒 HTTPS only
- 🔒 Rate limiting
- 🔒 Input validation
- 🔒 API key encryption

### .env File Security
**Important:** The `.env` file contains sensitive information!

1. **Never commit to Git:**
   - Already in `.gitignore`
   - Double-check before pushing

2. **Backup securely:**
   - Store in password manager
   - Don't share publicly

3. **Rotate keys regularly:**
   - Change JWT secret periodically
   - Rotate API keys if compromised

## 📞 Support

### Common Issues
1. **MongoDB not connecting:** See troubleshooting above
2. **Port conflicts:** Change port in .env
3. **API keys not working:** Check format and validity
4. **Frontend not loading:** Check if backend is running

### Getting Help
1. Check error messages in terminal
2. Review browser console (F12)
3. Check MongoDB logs
4. Verify .env file configuration

## ✅ Setup Checklist

- [ ] MongoDB installed and running (or Atlas configured)
- [ ] `.env` file created in backend directory
- [ ] MONGODB_URI configured correctly
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can register/login to application
- [ ] At least one API key configured
- [ ] AIDoc accessible and working

---

**Current Status:** ⚠️ MongoDB connection needed

**Next Step:** Install MongoDB (Option 1) or setup MongoDB Atlas (Option 2)


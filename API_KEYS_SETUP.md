# API Keys Setup Guide for AIDoc

## 🔑 Why You Need API Keys

AIDoc requires at least one AI provider API key to function. Without API keys, the model dropdown will be empty or show fallback options that won't work.

## 📋 Recommended Providers for AIDoc

For medical triage, these providers are recommended:

1. **OpenAI (GPT-3.5/GPT-4)** - Best for general medical knowledge
2. **Anthropic (Claude)** - Excellent for detailed medical reasoning
3. **Google (Gemini)** - Good for comprehensive responses
4. **DeepSeek** - Cost-effective alternative

## 🚀 Quick Setup (2 Methods)

### Method 1: Via Environment Variables (Recommended)

1. **Edit `backend/.env` file:**
   ```env
   # Add at least one of these:
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GOOGLE_API_KEY=AI...
   DEEPSEEK_API_KEY=sk-...
   PERPLEXITY_API_KEY=pplx-...
   ```

2. **Restart backend server:**
   ```powershell
   # Stop the current server (Ctrl+C)
   cd backend
   npm start
   ```

3. **Refresh AIDoc page** - Models should now appear in dropdown

### Method 2: Via Admin Settings Panel

1. **Log in to CompassAI**
2. **Go to Settings** (click username → Settings)
3. **Navigate to API Keys section**
4. **Add your API keys** for each provider
5. **Save settings**
6. **Refresh AIDoc page**

## 🔐 Getting API Keys

### OpenAI (GPT-3.5, GPT-4)
1. Go to: https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. **Cost:** Pay-as-you-go, ~$0.002 per 1K tokens (GPT-3.5)

### Anthropic (Claude)
1. Go to: https://console.anthropic.com/
2. Sign up or log in
3. Go to API Keys section
4. Create new key
5. Copy the key (starts with `sk-ant-`)
6. **Cost:** Pay-as-you-go, ~$0.003 per 1K tokens

### Google (Gemini)
1. Go to: https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key (starts with `AI`)
5. **Cost:** Free tier available, then pay-as-you-go

### DeepSeek
1. Go to: https://platform.deepseek.com/
2. Sign up or log in
3. Navigate to API Keys
4. Create new key
5. Copy the key (starts with `sk-`)
6. **Cost:** Very affordable, ~$0.0001 per 1K tokens

### Perplexity
1. Go to: https://www.perplexity.ai/settings/api
2. Sign up or log in
3. Generate API key
4. Copy the key (starts with `pplx-`)
5. **Cost:** Pay-as-you-go

## ✅ Verification

### Check if API Keys are Working

1. **Via Backend Logs:**
   ```
   # You should see models being loaded
   Available models: OpenAI, Anthropic, etc.
   ```

2. **Via AIDoc Settings:**
   - Open AIDoc
   - Click ⚙️ Settings
   - Check if models appear in dropdown
   - Should see: "GPT-3.5 Turbo (OpenAI)", etc.

3. **Via Test Message:**
   - Send a test message in AIDoc
   - If it responds, API key is working!

## 🐛 Troubleshooting

### Dropdown Still Empty After Adding Keys

**Solution 1: Restart Backend**
```powershell
# Stop backend (Ctrl+C in terminal)
cd backend
npm start
```

**Solution 2: Clear Browser Cache**
```javascript
// In browser console (F12)
localStorage.clear();
sessionStorage.clear();
location.reload();
```

**Solution 3: Check API Key Format**
- OpenAI: `sk-proj-...` or `sk-...`
- Anthropic: `sk-ant-api03-...`
- Google: `AIza...`
- DeepSeek: `sk-...`
- Perplexity: `pplx-...`

### API Key Invalid Error

**Check:**
1. No extra spaces in `.env` file
2. Key is not expired
3. Key has correct permissions
4. Account has credits/billing enabled

**Example of correct `.env` format:**
```env
OPENAI_API_KEY=sk-proj-abc123xyz
ANTHROPIC_API_KEY=sk-ant-api03-abc123xyz
```

**Example of WRONG format:**
```env
OPENAI_API_KEY = sk-proj-abc123xyz  ❌ (extra spaces)
OPENAI_API_KEY="sk-proj-abc123xyz" ❌ (quotes not needed)
```

### Models Not Showing for Specific Provider

**Possible Causes:**
1. API key not configured
2. API key invalid or expired
3. Provider service is down
4. Rate limit exceeded

**Solution:**
- Check backend logs for errors
- Verify API key in provider's dashboard
- Try a different provider

## 💡 Recommendations

### For Testing/Development
**Use:** OpenAI GPT-3.5 Turbo
- **Why:** Fast, cheap, reliable
- **Cost:** ~$0.002 per 1K tokens
- **Setup:** Easiest to get started

### For Production Medical Use
**Use:** Anthropic Claude 3.5 Sonnet
- **Why:** Best reasoning, safety-focused
- **Cost:** ~$0.003 per 1K tokens
- **Setup:** Requires approval for medical use

### For Budget-Conscious
**Use:** DeepSeek Chat
- **Why:** Very affordable
- **Cost:** ~$0.0001 per 1K tokens
- **Setup:** Easy, no approval needed

### For Free Tier
**Use:** Google Gemini
- **Why:** Free tier available
- **Cost:** Free up to limit, then pay-as-you-go
- **Setup:** Requires Google account

## 🔒 Security Best Practices

### Protecting Your API Keys

1. **Never commit `.env` to Git**
   - Already in `.gitignore`
   - Double-check before pushing

2. **Use environment variables in production**
   - Don't hardcode keys
   - Use secure secret management

3. **Rotate keys regularly**
   - Change keys every 90 days
   - Immediately if compromised

4. **Set usage limits**
   - Configure spending limits in provider dashboards
   - Monitor usage regularly

5. **Use separate keys for dev/prod**
   - Different keys for different environments
   - Easier to track and revoke

## 📊 Cost Estimation

### Typical AIDoc Consultation
- **Average tokens:** ~2,000 tokens (500 words input + 1,500 words output)
- **GPT-3.5:** ~$0.004 per consultation
- **GPT-4:** ~$0.06 per consultation
- **Claude 3.5:** ~$0.006 per consultation
- **DeepSeek:** ~$0.0002 per consultation
- **Gemini:** Free tier, then ~$0.001 per consultation

### Monthly Estimates (100 consultations)
- **GPT-3.5:** ~$0.40/month
- **GPT-4:** ~$6.00/month
- **Claude 3.5:** ~$0.60/month
- **DeepSeek:** ~$0.02/month
- **Gemini:** Free tier covers most usage

## 🎯 Quick Start Checklist

- [ ] Choose at least one AI provider
- [ ] Get API key from provider
- [ ] Add key to `backend/.env` file
- [ ] Restart backend server
- [ ] Open AIDoc settings
- [ ] Verify models appear in dropdown
- [ ] Send test message
- [ ] Confirm AI responds

## 📞 Support

### If Models Still Don't Appear

1. **Check backend logs:**
   ```
   Look for: "Error fetching models" or API key errors
   ```

2. **Check browser console (F12):**
   ```
   Look for: Network errors or API failures
   ```

3. **Verify API key:**
   ```javascript
   // In backend terminal
   node -e "console.log(process.env.OPENAI_API_KEY)"
   ```

4. **Test API key directly:**
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

### Common Error Messages

**"No models available"**
- Solution: Add at least one API key

**"API key invalid"**
- Solution: Check key format and validity

**"Rate limit exceeded"**
- Solution: Wait or upgrade plan

**"Insufficient credits"**
- Solution: Add billing to provider account

---

**Need Help?** Check `SETUP_GUIDE.md` for general setup or `AIDOC_FEATURE.md` for feature documentation.


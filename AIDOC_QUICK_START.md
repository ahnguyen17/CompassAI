# AIDoc Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Access AIDoc
1. Log in to CompassAI
2. Click your username in the top-right navbar
3. Select **"🏥 AIDoc"** from the dropdown menu

### Step 2: Enter Password
- Default password: **CompassDoc**
- Password is case-sensitive
- Authentication lasts until browser closes

### Step 3: Start Consulting
1. Click **"+ New Consultation"**
2. Type your symptoms or medical concerns
3. Press **Enter** to send (Shift+Enter for new line)
4. AI will respond with medical guidance

## ⚙️ Quick Settings

### Change System Prompt
1. Click **"⚙️ Settings"** button
2. Edit the system prompt text
3. Click **"Save Settings"**

### Change AI Model
1. Click **"⚙️ Settings"** button
2. Select model from dropdown
3. Click **"Save Settings"**

### Available Models
- **Gemini** - Google's models
- **DeepSeek** - DeepSeek chat
- **OpenAI** - GPT-3.5, GPT-4, etc.

## 🔑 Password Management

### View Current Password
```javascript
// In browser console:
localStorage.getItem('aiDocPassword')
```

### Change Password
```javascript
// In browser console:
localStorage.setItem('aiDocPassword', 'YourNewPassword');
```

### Reset to Default
```javascript
// In browser console:
localStorage.setItem('aiDocPassword', 'CompassDoc');
```

## 💡 Tips & Tricks

### Keyboard Shortcuts
- **Enter** - Send message
- **Shift + Enter** - New line in message

### Session Management
- **New Consultation** - Creates fresh session
- **Click Session** - Switch to that consultation
- **🗑️ Icon** - Delete consultation (hover to see)

### Best Practices
1. **Be Specific** - Describe symptoms in detail
2. **Include Timeline** - When did symptoms start?
3. **Mention History** - Relevant medical history
4. **Ask Questions** - Don't hesitate to ask for clarification
5. **Follow Up** - Continue conversation for better guidance

## ⚠️ Important Reminders

### Medical Disclaimer
- AIDoc is for **informational purposes only**
- **Not a replacement** for professional medical advice
- **Always consult** a healthcare provider
- **Call emergency services** for urgent situations

### Privacy
- Conversations are stored in your account
- Only you can see your consultations
- Delete sessions you no longer need

## 🎨 Interface Guide

### Main Screen Layout
```
┌─────────────────────────────────────────┐
│ 🏥 AIDoc - Medical Triage Assistant    │
│                          ⚙️ Settings    │
├─────────────────────────────────────────┤
│ ⚠️ Medical Disclaimer                   │
├─────────────────────────────────────────┤
│                                         │
│  [Your messages appear here]            │
│                                         │
│  [AI responses appear here]             │
│                                         │
├─────────────────────────────────────────┤
│ Type your message here...         ➤    │
└─────────────────────────────────────────┘
```

### Sidebar (Left)
```
┌──────────────────┐
│ Medical          │
│ Consultations    │
├──────────────────┤
│ + New            │
│   Consultation   │
├──────────────────┤
│ Session 1   🗑️   │
│ Session 2   🗑️   │
│ Session 3   🗑️   │
└──────────────────┘
```

## 🔧 Troubleshooting

### Can't Access AIDoc
- ✅ Make sure you're logged in
- ✅ Check navbar dropdown menu
- ✅ Try refreshing the page

### Password Not Working
- ✅ Default is "CompassDoc" (case-sensitive)
- ✅ Check for typos
- ✅ Try resetting password (see above)

### Messages Not Sending
- ✅ Check internet connection
- ✅ Verify AI model is selected
- ✅ Check browser console for errors

### Settings Not Saving
- ✅ Make sure to click "Save Settings"
- ✅ Check if localStorage is enabled
- ✅ Try clearing browser cache

## 📱 Mobile Usage

### Accessing Sidebar
- Tap **◀/▶** button in top-left
- Sidebar slides in/out
- Tap outside to close

### Typing Messages
- Tap text area to open keyboard
- Use on-screen keyboard
- Swipe up for more space

## 🎯 Common Use Cases

### Symptom Check
```
User: "I have a headache and fever for 2 days"
AI: [Asks follow-up questions about severity, other symptoms]
AI: [Provides assessment and recommendations]
```

### Medication Questions
```
User: "Can I take ibuprofen with my blood pressure medication?"
AI: [Asks about specific medications]
AI: [Provides general guidance and recommends consulting pharmacist]
```

### General Health Advice
```
User: "How can I improve my sleep quality?"
AI: [Asks about current sleep habits]
AI: [Provides evidence-based recommendations]
```

## 📚 Additional Resources

- **Full Documentation:** See `AIDOC_FEATURE.md`
- **Implementation Details:** See `AIDOC_IMPLEMENTATION_SUMMARY.md`
- **Support:** Check troubleshooting section above

## 🆘 Emergency Situations

### When to Call Emergency Services
- Chest pain or pressure
- Difficulty breathing
- Severe bleeding
- Loss of consciousness
- Severe allergic reaction
- Stroke symptoms (FAST: Face, Arms, Speech, Time)
- Severe injuries

**In emergencies, always call your local emergency number immediately!**

## ✅ Quick Checklist

Before starting a consultation:
- [ ] Logged into CompassAI
- [ ] Accessed AIDoc via navbar
- [ ] Entered password successfully
- [ ] Created or selected a session
- [ ] Read medical disclaimer
- [ ] Ready to describe symptoms

## 🎓 Learning the System

### First Time Users
1. Start with a simple question
2. Explore the settings
3. Try different AI models
4. Create multiple sessions
5. Practice using keyboard shortcuts

### Power Users
- Customize system prompt for specific needs
- Use different models for different types of questions
- Organize sessions by topic or date
- Export important consultations (future feature)

---

**Need Help?** Check the full documentation in `AIDOC_FEATURE.md`

**Ready to Start?** Click your username → 🏥 AIDoc → Enter "CompassDoc"


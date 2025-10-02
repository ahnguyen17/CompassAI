# AIDoc Feature Documentation

## Overview
AIDoc is a password-protected medical triage assistant integrated into the CompassAI application. It provides a dedicated interface for medical consultations with AI, featuring customizable system prompts and model selection.

## Features

### 🔐 Access & Authentication
- **Protected Route:** `/aidoc` and `/aidoc/:sessionId`
- **Password Protection:** Default password is "CompassDoc"
- **Password Configuration:** Stored in localStorage under key `aiDocPassword`
- **Session Authentication:** Uses sessionStorage (expires when browser closes)
- **User Authentication:** Requires user to be logged in to the main application

### 💬 Core Functionality
- **Dedicated Chat Interface:** Separate from regular chat, specifically for medical triage
- **Streaming Responses:** Real-time AI responses with visual feedback
- **Session Management:** Create, view, and delete medical consultation sessions
- **Auto-Title Generation:** Automatically generates session titles from first message
- **Message History:** Full conversation history preserved across sessions
- **Multiple Sessions:** Users can maintain multiple consultation sessions

### ⚙️ Settings Panel
The AIDoc settings modal includes:

1. **System Prompt Configuration**
   - Large textarea for customizing AI behavior
   - Default medical triage template provided
   - Persisted in localStorage (`aiDocSystemPrompt`)

2. **AI Model Selection**
   - Dropdown selector for available models
   - Supports Gemini, DeepSeek, and OpenAI models
   - Persisted in localStorage (`aiDocSelectedModel`)

3. **Settings Persistence**
   - All settings saved to localStorage
   - Settings applied to current and new sessions
   - Can be updated at any time

### 🎨 UI/UX Features
- **Medical Theme:** Blue and green color scheme with medical icons (🏥, 👨‍⚕️)
- **Mobile Responsive:** Fully functional on all device sizes
- **Dark Mode Support:** Adapts to user's theme preference
- **Collapsible Sidebar:** Session list can be hidden for more space
- **Medical Disclaimer:** Prominent warning about AI limitations
- **Visual Feedback:** Loading states, streaming indicators, error messages

## Default System Prompt

```
You are an AI Medical Doctor designed to triage patients efficiently and safely. Your responsibilities include:

Asking targeted, relevant, and comprehensive questions to gather patient symptoms, medical history, and other necessary information.
Using empathetic and professional language that is clear and understandable to patients of varying medical literacy.
Analyzing the information provided to formulate a prioritized differential diagnosis.
Displaying clinical reasoning by asking appropriate follow-up questions as needed.
Summarizing the encounter in a detailed and well-structured SOAP (Subjective, Objective, Assessment, Plan) note.
Providing an initial assessment and clearly explaining your reasoning.
Outlining specific and practical next steps or recommendations for care (the plan), including when to seek further evaluation or emergency care.

Throughout, always:
- Adhere to evidence-based medicine and recognized clinical guidelines.
- Maintain patient safety and confidentiality.
- Avoid providing a definitive diagnosis without adequate information or outside your scope.

At the end of each triage session, output a SOAP note in the following format:

Subjective:
Objective:
Assessment:
Plan:
```

## Technical Implementation

### Backend

#### Models
- **AIDocSession** (`backend/models/AIDocSession.js`)
  - Stores consultation sessions
  - Fields: user, title, systemPrompt, modelUsed, timestamps
  
- **AIDocMessage** (`backend/models/AIDocMessage.js`)
  - Stores individual messages
  - Fields: session, sender, content, modelUsed, reasoningContent, timestamp

#### Controllers
- **aiDocSessions** (`backend/controllers/aiDocSessions.js`)
  - CRUD operations for sessions
  - Session ownership validation
  
- **aiDocMessages** (`backend/controllers/aiDocMessages.js`)
  - Message handling with AI integration
  - Streaming and non-streaming support
  - Supports Anthropic, OpenAI, DeepSeek, Gemini, Perplexity

#### Routes
- **GET** `/api/v1/aidocsessions` - List all user's sessions
- **POST** `/api/v1/aidocsessions` - Create new session
- **GET** `/api/v1/aidocsessions/:id` - Get specific session
- **PUT** `/api/v1/aidocsessions/:id` - Update session
- **DELETE** `/api/v1/aidocsessions/:id` - Delete session
- **GET** `/api/v1/aidocsessions/:sessionId/messages` - Get messages
- **POST** `/api/v1/aidocsessions/:sessionId/messages` - Send message

### Frontend

#### Components
- **AIDocPage** (`frontend/client/src/pages/AIDocPage.tsx`)
  - Main page component
  - Handles session management, messaging, streaming
  
- **AIDocPasswordModal** (`frontend/client/src/components/AIDocPasswordModal.tsx`)
  - Password entry interface
  - Validates against stored password
  
- **AIDocSettingsModal** (`frontend/client/src/components/AIDocSettingsModal.tsx`)
  - Settings configuration interface
  - System prompt and model selection

#### Styling
- **AIDocPage.module.css** (`frontend/client/src/pages/AIDocPage.module.css`)
  - Medical-themed styling
  - Responsive design
  - Dark mode support

#### Routes
- `/aidoc` - Main AIDoc page (creates new session if none exist)
- `/aidoc/:sessionId` - Specific consultation session

## Configuration

### Changing the Default Password
To change the AIDoc password:

1. **Via Browser Console:**
   ```javascript
   localStorage.setItem('aiDocPassword', 'YourNewPassword');
   ```

2. **Via Settings Page (Future Enhancement):**
   - Could add admin setting to configure default password
   - Could add user-specific password override

### Customizing System Prompt
Users can customize the system prompt through the Settings modal in AIDoc, or programmatically:

```javascript
localStorage.setItem('aiDocSystemPrompt', 'Your custom prompt here');
```

### Selecting Default Model
```javascript
localStorage.setItem('aiDocSelectedModel', 'gpt-4');
```

## Usage Guide

### For Users

1. **Accessing AIDoc:**
   - Log in to CompassAI
   - Click on your username in the navbar
   - Select "🏥 AIDoc" from the dropdown
   - Enter password (default: "CompassDoc")

2. **Starting a Consultation:**
   - Click "+ New Consultation" button
   - Describe your symptoms or medical concerns
   - Press Enter to send (Shift+Enter for new line)

3. **Managing Sessions:**
   - View all consultations in the left sidebar
   - Click on a session to view its history
   - Delete sessions using the trash icon

4. **Configuring Settings:**
   - Click "⚙️ Settings" button in the header
   - Modify system prompt as needed
   - Select preferred AI model
   - Click "Save Settings"

### For Administrators

1. **Monitoring Usage:**
   - AIDoc sessions are stored separately from regular chat
   - Can query `AIDocSession` and `AIDocMessage` collections in MongoDB

2. **Customizing Defaults:**
   - Modify `DEFAULT_SYSTEM_PROMPT` in `AIDocPage.tsx`
   - Update default password in `AIDocPasswordModal.tsx`
   - Adjust available models in model fetching logic

## Security Considerations

1. **Password Storage:**
   - Password stored in localStorage (client-side)
   - Consider moving to environment variable or database for production
   - Current implementation suitable for internal/trusted users

2. **Session Authentication:**
   - Uses sessionStorage (expires on browser close)
   - Requires main application authentication
   - Protected routes ensure only logged-in users can access

3. **Medical Disclaimer:**
   - Prominent disclaimer displayed on every page
   - Reminds users this is not a replacement for professional medical advice
   - Encourages seeking emergency services when appropriate

## Future Enhancements

1. **Enhanced Security:**
   - Server-side password validation
   - Role-based access control
   - Audit logging for medical consultations

2. **Additional Features:**
   - Export consultation history as PDF
   - Share consultations with healthcare providers
   - Integration with medical databases/APIs
   - Voice input for symptoms
   - Image upload for visual symptoms

3. **Analytics:**
   - Track common symptoms/conditions
   - Monitor AI performance
   - Generate usage reports

4. **Compliance:**
   - HIPAA compliance considerations
   - Data encryption at rest and in transit
   - Patient consent management

## Troubleshooting

### Password Not Working
- Check localStorage: `localStorage.getItem('aiDocPassword')`
- Default is "CompassDoc" (case-sensitive)
- Clear sessionStorage and try again: `sessionStorage.clear()`

### Settings Not Saving
- Check browser console for errors
- Verify localStorage is enabled
- Check keys: `aiDocSystemPrompt`, `aiDocSelectedModel`

### Messages Not Sending
- Verify backend is running
- Check API keys are configured for selected model
- Review browser console and network tab for errors

### Streaming Not Working
- Ensure browser supports Server-Sent Events (SSE)
- Check network connection
- Verify backend streaming implementation

## API Reference

See inline documentation in:
- `backend/controllers/aiDocSessions.js`
- `backend/controllers/aiDocMessages.js`
- `backend/routes/aiDocSessions.js`
- `backend/routes/aiDocMessages.js`

## Support

For issues or questions:
1. Check browser console for errors
2. Review backend logs
3. Verify all dependencies are installed
4. Ensure MongoDB is running and connected
5. Check API keys are properly configured


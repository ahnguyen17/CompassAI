# Progress: CompassAI

## What Works
- **Chat History Date Grouping & Sorting (Finalized & Debug Logs Removed):**
    - Chat sessions in the sidebar of `ChatPage.tsx` are now grouped by date categories: "Previous 7 Days", "Previous 30 Days", current year by month (e.g., "April 2025"), previous year by month (e.g., "December 2024"), and older years (e.g., "2023").
    - **Backend (`chatMessages.js`):** `lastMessageTimestamp` on `ChatSession` is reliably updated to the timestamp of the *new AI message* after it's saved. The updated session object is returned in API responses/SSE events.
    - **Frontend (`ChatPage.tsx`):**
        - `groupSessionsByDate` function uses `session.lastMessageTimestamp || session.createdAt` for determining the `dateToUse` for grouping and for intra-group sorting. `lastAccessedAt` is no longer a primary factor.
        - An explicit call to `fetchSessions()` was added at the end of `handleSendMessage` to ensure the session list is re-fetched and the sidebar UI refreshes automatically, moving the active session to the correct group.
    - All debugging `console.log` statements previously added to `groupSessionsByDate` have been removed.
- **Shared Chat Page Color Scheme Update:**
    - Updated user chat bubble background and "Chat with AI" button colors in `SharedChatPage.tsx` for consistency with `ChatPage.tsx`.
- **User Memory Feature Implementation:**
    - **Backend:** New `UserMemory` model, controller, and routes for CRUD operations on personalized contexts. `chatMessages.js` updated to inject these contexts and perform basic automatic extraction.
    - **Frontend:** "Personalized Memory" panel in `SettingsPage.tsx` for managing memory settings and contexts. Session-specific memory toggle added to `ChatPage.tsx`.
- **S3 File Deletion on Session Delete:** Implemented in `backend/controllers/chatSessions.js`.
- **`ChatPage.tsx` UI Redesign & TypeScript Fixes:** Advanced chat input, various UI tweaks, and resolution of most TypeScript errors.
- **AI Vision Input (Multimodal):** Backend and frontend updated to support image inputs with vision-capable models.
- **Centralized Session State:** Chat session management moved to `authStore.ts`.
- **Navbar Enhancements:** "New Chat" icon, logo as sidebar toggle, reordered icons.
- **Multilingual Title Generation:** Refined backend prompt for English/Vietnamese titles.
- **Custom Model Enhancements:** Usage stats name fix, vision capability display.
- **File/Image Previews & Paste:** Implemented in `ChatPage.tsx` with backend support.
- **User Chat Bubble Color & Reasoning Toggle:** UI updates for consistency and always-on reasoning.

## What's Left to Build
- **Thoroughly test the User Memory feature (Primary Next Step):**
    - Backend API functionality (CRUD for settings and contexts).
    - Frontend "Personalized Memory" panel in Settings.
    - Frontend session memory toggle on Chat Page.
    - Context injection logic and its impact on LLM responses.
    - Automatic context extraction behavior and accuracy.
    - Uniqueness and recency logic for context storage.
- Address the persistent "Parameter 's' implicitly has an 'any' type" error in `ChatPage.tsx` (around line 694-699) if it causes runtime issues or blocks compilation.
- Confirm which specific Perplexity models support vision via API and update backend/frontend accordingly.
- Potential new features based on user feedback.

## Current Status
The project is actively being developed. The Chat History Date Grouping and User Memory features have been implemented and refined. The immediate next steps are to conduct comprehensive testing of the User Memory feature.

## Known Issues
- A persistent TypeScript error ("Parameter 's' implicitly has an 'any' type") remains in `ChatPage.tsx`.
- Vision support for specific Perplexity models via API is unconfirmed.
- Automatic context extraction for User Memory is basic and may require further refinement.

## Evolution of Project Decisions
- Prioritized `lastMessageTimestamp` (falling back to `createdAt`) for chat history sorting to ensure accuracy and reflect true last activity, removing `lastAccessedAt` from this core logic.
- Implemented an explicit `fetchSessions()` call after message sending to ensure immediate UI refresh of the sorted chat history.
- Added S3 file deletion to the chat session deletion process.
- Leveraged existing OpenAI vision implementation logic for other vision models.
- Implemented multimodal support by adding provider-specific logic.
- Redesigned chat input for a Perplexity-like experience.
- Adopted a hybrid model (manual + basic auto-extraction) for User Memory.

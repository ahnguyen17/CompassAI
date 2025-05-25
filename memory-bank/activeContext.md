# Active Context: CompassAI

## Current Work Focus
Finalized and refined the Chat History Date Grouping and automatic refresh functionality.

## Recent Changes
- **Chat History Date Grouping & Sorting (Finalized):**
    - **Backend (`chatMessages.js`):**
        - Ensured `lastMessageTimestamp` on `ChatSession` is reliably updated to the timestamp of the *new AI message* after it's saved (for both streaming and non-streaming).
        - Ensured the API response/SSE 'done' event includes the fully updated `ChatSession` object with the correct `lastMessageTimestamp`.
    - **Frontend (`ChatPage.tsx`):**
        - Modified `groupSessionsByDate` to use `session.lastMessageTimestamp || session.createdAt` for determining the `dateToUse` for grouping.
        - Updated intra-group sorting to also use `new Date(a.lastMessageTimestamp || a.createdAt)`. This ensures `lastAccessedAt` is not used for primary sorting/grouping decisions, and `createdAt` is the ultimate fallback.
        - Added an explicit call to `fetchSessions()` at the end of `handleSendMessage` (after AI response processing) to ensure the session list is re-fetched from the backend (which sorts by the correct `lastMessageTimestamp`) and the sidebar UI refreshes automatically, moving the active session to the correct group.
    - **Debugging Logs Removed:** All `console.log` statements previously added to `groupSessionsByDate` for debugging have been removed now that the feature is confirmed to be working as intended.
- **Shared Chat Page Color Scheme Update:**
    - Updated the user chat bubble background color in `SharedChatPage.tsx` to match the colors used in `ChatPage.tsx`:
        - Dark mode: `#10402c` (dark green)
        - Light mode: `#057A55` (primary green)
    - Updated the "Chat with AI" button to use the same color scheme.
- **User Memory Feature Implementation:**
    - **Backend:**
        - Created new Mongoose model `UserMemory` (`backend/models/UserMemory.js`) to store user-specific contexts, global enable/disable settings, and max context limits. Includes sub-document schema `ContextItemSchema` with timestamps and a pre-save hook for sorting and trimming contexts.
        - Created new controller `userMemoryController.js` (`backend/controllers/userMemoryController.js`) with functions for:
            - Getting user memory (`getUserMemory`).
            - Updating global memory settings (`updateUserMemorySettings`).
            - Adding new context items (`addContext`), handling uniqueness.
            - Updating existing context items (`updateContext`).
            - Deleting specific context items (`deleteContext`).
            - Clearing all contexts for a user (`clearAllContexts`).
        - Created new routes `userMemoryRoutes.js` (`backend/routes/userMemoryRoutes.js`) for all controller actions, protected by authentication.
        - Mounted user memory routes in `backend/server.js` under `/api/v1/usermemory`.
        - Integrated User Memory into `chatMessages.js` (`backend/controllers/chatMessages.js`):
            - Accepts `useSessionMemory` flag from frontend.
            - Fetches user memory contexts if globally and session-enabled.
            - Injects formatted memory contexts into the system prompt sent to the LLM.
            - Added basic automatic context extraction logic (for short, statement-like user messages) after AI response.
    - **Frontend:**
        - Updated API service `api.ts` (`frontend/client/src/services/api.ts`) with new interfaces (`UserMemoryData`, `ContextItemData`) and functions to call user memory endpoints.
        - Added "Personalized Memory" section to `SettingsPage.tsx` (`frontend/client/src/pages/SettingsPage.tsx`):
            - UI for managing global memory settings (enable/disable toggle, max contexts input).
            - UI for CRUD operations on individual context items (add, list with edit/delete, clear all).
            - Includes an edit modal for context items.
        - Added session-specific memory toggle (using `MdAutoAwesome` icon) to `ChatPage.tsx` (`frontend/client/src/pages/ChatPage.tsx`) near the model selector.
            - This toggle controls a `useSessionMemory` flag sent with chat messages to the backend.
- **Previous Work (S3 File Deletion, UI Redesign, TypeScript Fixes):**
    - S3 file deletion on session delete was finalized.
    - `ChatPage.tsx` UI redesign and various TypeScript error resolutions were completed.
- **UI Update (Model Selector Icon):**
    - Changed the chat model selection icon in `ModelSelectorDropdown.tsx` from "🤖" to `MdPsychology`.
    - Adjusted CSS in `ModelSelectorDropdown.module.css` to make the icon size and button style consistent.
- **Chat Input Redesign (Advanced Perplexity Style):**
    - Restructured JSX in `ChatPage.tsx` for a new input layout.
    - Updated `useEffect` in `ChatPage.tsx` to manage `isTextareaElevated` state and continue auto-expanding textarea height.
    - Updated `ChatPage.module.css`.
- **Chat Input Keydown Behavior:**
    - Modified `handleKeyDown` in `ChatPage.tsx` so that pressing "Enter" now adds a newline, and "Shift+Enter" sends the message.
- **Chat Input UI Tweak (Vertical Spacing):**
    - Reduced the vertical space between the text input field (`.messageInput`) and the row of icons below it in `ChatPage.tsx`.
- **User Chat Bubble Color Update (Dark Mode Contrast Fix Iteration 2 & 3):**
    - Adjusted user chat bubble background color in dark mode for improved contrast.
- **Reasoning Toggle Hidden & Always On:**
    - Removed the "Show Reasoning Steps" toggle button from `ChatPage.tsx`. Reasoning steps are always active.

## Next Steps
- Thoroughly test the User Memory feature.
- Update other Memory Bank files (`progress.md`, `systemPatterns.md`, `productContext.md`, and `techContext.md`) to document all recent features.
- Present all completed features to the user.

## Active Decisions and Considerations
- Automatic context extraction for User Memory is basic; potential for future NLP enhancement.
- Uniqueness check for User Memory contexts is exact string match.
- Number of injected User Memory contexts could be configurable.

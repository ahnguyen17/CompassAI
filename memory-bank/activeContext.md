# Active Context: CompassAI

## Current Work Focus
Implementation of the User Memory feature, enabling personalized chat responses based on stored user-specific contexts.

## Recent Changes
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
- **UI Update:** Changed the chat model selection icon in `ModelSelectorDropdown.tsx` from "🤖" to `MdPsychology` for better theme consistency.

## Next Steps
- Thoroughly test the new User Memory feature:
    - Backend API endpoints for creating, reading, updating, and deleting memory settings and contexts.
    - Frontend "Personalized Memory" panel in Settings: global toggles, context CRUD operations.
    - Frontend session memory toggle on the Chat Page and its effect on context injection.
    - Automatic context extraction logic (verify its behavior and effectiveness).
    - Ensure context prioritization (recency) and uniqueness (exact match) are working as expected.
- Update other Memory Bank files: `progress.md`, `systemPatterns.md`, `productContext.md`, and `techContext.md` to document the User Memory feature.
- Present the completed User Memory feature to the user.

## Active Decisions and Considerations
- The current automatic context extraction in `chatMessages.js` is very basic (short, non-question user messages). This is an area for potential future enhancement with more sophisticated NLP techniques if desired.
- The uniqueness check for contexts is currently an exact string match. Semantic similarity was deemed out of scope for the initial implementation.
- The number of contexts injected into the LLM prompt is currently hardcoded (e.g., top 10 recent). This could be made configurable or dynamic in the future.
- The session memory toggle on `ChatPage.tsx` overrides the global memory setting for that specific session (i.e., if global is ON, session can be OFF; if global is OFF, session toggle won't enable memory).

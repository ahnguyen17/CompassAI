# Active Context: CompassAI

## Current Work Focus
Implementation of the User Memory feature, enabling personalized chat responses based on stored user-specific contexts.

## Recent Changes
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
    - Restructured JSX in `ChatPage.tsx` for a new input layout:
        - Added `isTextareaElevated` state to control layout.
        - When text input is multi-line or contains newlines, the textarea moves to a line above the main icon row.
        - Reordered icons in the main input row to: Model Selector, Session Memory Toggle, Reasoning Toggle, (inline textarea or placeholder), File Attachment, Voice, Send.
    - Updated `useEffect` in `ChatPage.tsx` to manage `isTextareaElevated` state (using a more direct scrollHeight vs clientHeight comparison) and continue auto-expanding textarea height.
    - Updated `ChatPage.module.css`:
        - Adjusted padding for `styles.messageInput` to better match icon button heights for improved inline vertical alignment.
        - Confirmed `styles.inputControls` defaults to `flex-direction: row` and `align-items: center` for the non-elevated state.
        - Confirmed `styles.iconRow` uses `align-items: center`.
        - Removed `align-self: center` from `styles.messageInput` as parent alignment should suffice.
        - Added `styles.elevatedTextarea` for styling the textarea when it's on its own line above icons.
- **Chat Input Keydown Behavior:**
    - Modified `handleKeyDown` in `ChatPage.tsx` so that pressing "Enter" now adds a newline, and "Shift+Enter" sends the message. This reverses the previous behavior.
- **Chat Input UI Tweak (Vertical Spacing):**
    - Reduced the vertical space between the text input field (`.messageInput`) and the row of icons below it in `ChatPage.tsx`.
    - Achieved by changing `padding` in `.messageInput` from `8px 15px` to `8px 15px 4px 15px` in `frontend/client/src/pages/ChatPage.module.css`, effectively reducing its bottom padding from 8px to 4px.
- **User Chat Bubble Color Update (Dark Mode Contrast Fix Iteration 2):**
    - Further adjusted the user's chat bubble background color in dark mode to an even darker green (`#113319`) for improved contrast, per user request.
    - In `frontend/client/src/index.css`:
        - Added a new CSS variable ` --user-bubble-dark-bg: #113319;` within the `body.dark` rule.
    - In `frontend/client/src/pages/ChatPage.module.css`:
        - Modified the `body.dark .messageBubbleUser` rule to use `background-color: var(--user-bubble-dark-bg);`.
        - The `.messageBubbleUser` base rule (for light theme) remains unchanged, using `var(--primary-color)`.
    - Text color remains `var(--text-on-primary-color)` (white).
- **Reasoning Toggle Hidden & Always On:**
    - Removed the "Show Reasoning Steps" toggle button from `ChatPage.tsx`.
    - The `showReasoning` state variable remains initialized to `true` and is no longer modifiable by the user via the UI.
    - This ensures that reasoning steps are always displayed and message streaming is always active by default.
- **Chat History Date Grouping:**
    - Implemented client-side logic in `ChatPage.tsx` to group chat sessions by date categories: "Previous 7 Days", "Previous 30 Days", "Previous Year (by month)", and "Older (by year)".
    - Used native JavaScript `Date` objects for date calculations and `i18next` for translating fixed group titles (e.g., "Previous 7 Days"). Month names in group titles are localized using `Date.toLocaleDateString()` or similar browser/JS capabilities.
    - Added new CSS styles in `ChatPage.module.css` for the group titles.
    - Added translation keys for group titles to `i18n.ts`.
- **Chat History Dynamic Grouping Fix:**
    - Updated `ChatSession` interface in `ChatPage.tsx` and `authStore.ts` to include `lastAccessedAt`.
    - Modified `groupSessionsByDate` in `ChatPage.tsx` to use `lastAccessedAt` (instead of `createdAt`) for grouping and sorting sessions, ensuring recently interacted chats move to more recent date groups.
    - Ensured `fetchSessions()` is called after selecting a session (in `fetchMessages`) to refresh `lastAccessedAt`.
    - Updated `handleSendMessage` to use the full updated session object (including `lastAccessedAt`) from the backend response to update frontend state, with a fallback to optimistic update.

## Next Steps
- Verify the latest chat input UI fixes (CSS padding, JS elevation logic, vertical spacing tweak) in the browser.
- Verify the user chat bubble color fix in dark mode (now using inline style with color `#10402c` directly in the React component).
- Thoroughly test the new User Memory feature:
    - Backend API endpoints for creating, reading, updating, and deleting memory settings and contexts.
    - Frontend "Personalized Memory" panel in Settings: global toggles, context CRUD operations.
    - Frontend session memory toggle on the Chat Page and its effect on context injection.
    - Automatic context extraction logic (verify its behavior and effectiveness).
    - Ensure context prioritization (recency) and uniqueness (exact match) are working as expected.
- Test the new Chat History Date Grouping feature across different languages and with various chat session dates.
- Update other Memory Bank files (`progress.md`, `systemPatterns.md`, `productContext.md`, and `techContext.md`) to document the User Memory feature, chat input UI fixes, and the new Chat History Date Grouping.
- Present all completed features (User Memory, UI fixes, Chat History Grouping) to the user.

## Active Decisions and Considerations
- The current automatic context extraction in `chatMessages.js` is very basic (short, non-question user messages). This is an area for potential future enhancement with more sophisticated NLP techniques if desired.
- The uniqueness check for contexts is currently an exact string match. Semantic similarity was deemed out of scope for the initial implementation.
- The number of contexts injected into the LLM prompt is currently hardcoded (e.g., top 10 recent). This could be made configurable or dynamic in the future.
- The session memory toggle on `ChatPage.tsx` overrides the global memory setting for that specific session (i.e., if global is ON, session can be OFF; if global is OFF, session toggle won't enable memory).

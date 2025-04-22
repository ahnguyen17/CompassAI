# Progress: CompassAI

## What Works
- Basic structure for both backend and frontend is in place.
- Backend has models, controllers, and routes for various entities.
- Frontend has components and pages for different functionalities.
- Memory Bank initialization is complete with core files created.
- User and Setting models are defined.
- Settings controller provides endpoints for getting and updating global settings.
- SettingsPage.tsx manages various settings on the client side.
- ChatPage.tsx handles chat functionality, including session management and message sending.
- ChatPage.tsx now displays a "Start New Chat" button below the prompt when no chat session is selected, allowing users to easily initiate a new session from the initial view.
- ChatPage.tsx now defaults the "brain" toggle (reasoning/streaming) to the 'on' state.
- ChatPage.tsx speech recognition now dynamically uses Vietnamese ('vi-VN') when the application language is set to Vietnamese ('vi'), otherwise defaults to English ('en-US').
- ChatPage.tsx microphone icon now glows when speech recognition is active, using CSS animations defined in `ChatPage.module.css`.
- ChatPage.tsx input field now uses "Enter" for newline and "Shift+Enter" to send the message.
- **Custom Models Feature:**
    - Admins can create/delete "Custom Providers" in settings.
    - Admins can create/edit "Custom Models" under a provider, linking them to a base model and adding a custom system prompt.
    - **Fixed:** Deleting custom models now works correctly (replaced deprecated `.remove()` with `findByIdAndDelete()` in `backend/controllers/customModels.js`).
    - Chat page model selector now displays both base models and custom models, grouped by provider.
    - Selecting a custom model in the chat page automatically applies its system prompt during AI response generation.
- **Load Last Viewed Session:** The chat page now loads the most recently viewed or interacted with session by default, instead of the most recently created one. This is achieved by tracking and sorting sessions by a `lastAccessedAt` timestamp in the backend.
- **Settings Page UI:** Several admin panels ("User Management", "Model Visibility", "Usage Statistics", "Custom Providers & Models") are now collapsed by default using `<details>` elements for a cleaner initial view.
- **Model Selector Dropdown UI:** Updated text color for model items in light mode to `#34495e` (dark slate blue) for better readability as requested, modified in `ModelSelectorDropdown.module.css`.
- **Navbar "New Chat" Icon:** Added an SVG icon button next to the logo in the Navbar (`Navbar.tsx`). Clicking this button (visible when logged in) triggers a new chat session creation via a global state action (`authStore.ts`) and navigates the user to the new chat.
- **Centralized Session State:** Moved chat session list management (state, loading, errors, fetch/delete actions) from `ChatPage.tsx` to the global store (`authStore.ts`) to fix UI update issues when creating new chats from the navbar. Refactored `ChatPage.tsx` accordingly.
- **Navbar Logo Sidebar Toggle:** Removed the hamburger icon. The logo in `Navbar.tsx` now toggles the sidebar visibility when clicked on chat pages (`/` or `/chat/...`) and acts as a home link on other pages.
- **Navbar Icon Order:** Swapped the positions of the language dropdown and theme toggle icons in `Navbar.tsx`.

## What's Left to Build
- Further testing and refinement of existing features.
- Potential new features based on user feedback.

## Current Status
The project is actively being developed. Recent updates include swapping navbar icons, consolidating the sidebar toggle into the logo click, centralizing chat session state management, adding a "New Chat" icon to the navbar, UI improvements, backend logic for session loading, and a fix for custom model deletion.

## Known Issues
- None documented yet.

## Evolution of Project Decisions
- As the project progresses, decisions regarding the tech stack and architecture may evolve based on requirements and challenges encountered.

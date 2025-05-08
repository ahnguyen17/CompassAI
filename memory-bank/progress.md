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
- **Multilingual Title Generation:** Refined the backend prompt (`chatMessages.js`) again to instruct the AI to detect the language of the first message, generate the title in Vietnamese if detected, otherwise generate it in English, and respond *only* with the title text.
- **Custom Model Usage Stats Name Fix:** Modified the backend aggregation pipelines in `backend/controllers/stats.js` to include custom model names instead of IDs in the usage statistics.
- **File/Image Previews & Paste Functionality:**
    - Backend (`server.js`) now statically serves the `uploads` directory.
    - Frontend (`ChatPage.tsx`) allows pasting images, selecting files, and shows previews before sending.
    - Uploaded images are displayed in chat messages; other file types are shown as downloadable links.
    - CSS (`ChatPage.module.css`) updated for preview elements.
    - **Fixed:** Corrected image URL construction in `ChatPage.tsx` to properly display uploaded images.
    - **Fixed:** Implemented immediate display of uploaded images in chat by sending the saved user message back from the backend and updating the frontend state accordingly.
- **AI Vision Input (Multimodal):**
    - Backend (`providers.js`) updated to flag vision-capable models (OpenAI GPT-4o/Turbo/4.1 series, Anthropic Claude 3 series, Gemini 1.5 series) and to enrich custom model data with a `baseModelSupportsVision` flag.
    - Backend (`chatMessages.js`) updated to read uploaded images, base64 encode them, and format API requests with image data for supported providers/models.
    - Frontend (`ModelSelectorDropdown.tsx`) updated to display an icon (`👁️`) next to vision-capable base models and custom models (if their base model supports vision).
    - **Fixed:** Resolved TypeScript build error (`TS2719`) in `ChatPage.tsx` by updating its local `CustomModelData` interface definition to include `baseModelSupportsVision`, aligning it with `ModelSelectorDropdown.tsx` and backend data.
    - **Fixed:** Resolved backend ReferenceError in `chatMessages.js` by ensuring `modelIdentifierForApi` is initialized before use in vision checks.
    - **Fixed:** Corrected OpenAI/Perplexity API request formatting for `image_url` to send an object `{ "url": "data:..." }` instead of a string, resolving 400 errors.

## What's Left to Build
- Further testing and refinement of existing features, especially AI vision input and immediate image display.
- Address remaining TypeScript errors in `ChatPage.tsx` and `ModelSelectorDropdown.tsx` if they cause runtime issues or for better code quality.
- Confirm which specific Perplexity models support vision via API and update backend/frontend accordingly.
- Potential new features based on user feedback.

## Current Status
The project is actively being developed. Recent work focused on implementing and refining AI vision input capabilities, including displaying vision icons for custom models if their base model supports it, and fixing related backend/frontend bugs (ReferenceError, OpenAI 400 error, immediate image display). User-facing file/image previews and paste support are functional.

## Known Issues
- Numerous TypeScript errors (mostly implicit 'any' types and missing module declarations) remain in `ChatPage.tsx` and `ModelSelectorDropdown.tsx`. These should be reviewed.
- Vision support for specific Perplexity models via API is unconfirmed.

## Evolution of Project Decisions
- Leveraged existing OpenAI vision implementation logic to easily enable support for the GPT-4.1 series models.
- Implemented multimodal support by adding provider-specific logic to the backend message controller.
- Used base64 encoding as the primary method for sending image data to AI APIs.
- Updated the frontend model selector to clearly indicate vision capabilities.
- The `ChatMessage` model already had a suitable `fileInfo` structure, simplifying backend changes for file metadata storage.
- Corrected variable initialization order and API payload formatting in `chatMessages.js` to prevent runtime errors when handling vision models.
- Refactored frontend image URL construction to correctly use the base server URL without the API path prefix.
- Modified backend response and frontend message handling to enable immediate display of uploaded images without page refresh.
- Extended vision icon display logic in the frontend model selector to custom models by checking a new `baseModelSupportsVision` flag provided by the backend.

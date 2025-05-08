# Active Context: CompassAI

## Current Work Focus
Implemented AI model image understanding (multimodal vision input).

## Recent Changes
- **AI Vision Input Implementation:**
    - **Backend (`controllers/providers.js`):** Updated `AVAILABLE_MODELS` structure to include a `supportsVision: boolean` flag. Marked relevant OpenAI, Anthropic Claude 3, and Gemini models as supporting vision.
    - **Backend (`controllers/chatMessages.js`):**
        - Modified `findProviderForModel` to work with the new model object structure.
        - Added `modelSupportsVision` helper function.
        - Updated `addMessageToSession` to check `supportsVision` flag. If true and an image is uploaded, it reads the image file, base64 encodes it, and prepares a provider-specific multimodal content structure.
        - Updated `formatMessagesForProvider`, `callApi`, and `callApiStream` to correctly handle and pass the multimodal content structure (text + image data) to the respective provider SDKs (OpenAI, Anthropic, Gemini). Includes logic for base64 prefix handling (stripping for Gemini).
        - Text-only logic is retained for non-vision models or when no image is sent.
    - **Frontend (`components/ModelSelectorDropdown.tsx`):** Updated component to parse the new `baseModels` structure and conditionally display a vision icon (`👁️`) next to models where `supportsVision` is true.
    - **Frontend (`components/ModelSelectorDropdown.module.css`):** Added CSS styles for the `.visionIcon`.
- **File/Image Previews & Paste Functionality:** (Previous Task)
    - Modified `backend/server.js` to statically serve the `uploads` directory.
    - Updated `frontend/client/src/pages/ChatPage.tsx` for image pasting, file selection previews, and rendering uploaded files/images in messages.
    - Added CSS styles to `frontend/client/src/pages/ChatPage.module.css` for preview elements.

## Next Steps
- Update `progress.md` and other relevant Memory Bank files.
- Present the completed task to the user.

## Active Decisions and Considerations
- Implemented multimodal input handling for OpenAI, Anthropic, and Gemini based on research.
- Used base64 encoding as the primary method for sending image data.
- Handled provider-specific API request formatting for multimodal content.
- Updated frontend to visually indicate vision-capable models.
- Deferred flagging Perplexity models for vision support pending further confirmation.
- DeepSeek remains text-only.

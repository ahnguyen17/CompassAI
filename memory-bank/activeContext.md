# Active Context: CompassAI

## Current Work Focus
Implemented file and image previews in chat, and the ability to paste images.

## Recent Changes
- **File/Image Previews & Paste Functionality:**
    - Modified `backend/server.js` to statically serve the `uploads` directory, making uploaded files accessible via URL.
    - Updated `frontend/client/src/pages/ChatPage.tsx` to:
        - Handle pasting images into the chat input.
        - Display a preview of selected/pasted files (image thumbnail or file icon/name) near the input area.
        - Allow removal of the selected/pasted file before sending.
        - Display uploaded images directly in chat messages.
        - Display links to other uploaded file types in chat messages.
        - Construct file URLs using `VITE_API_BASE_URL` for proper pathing.
    - Added CSS styles to `frontend/client/src/pages/ChatPage.module.css` for the new preview elements (image previews, file name previews, clear buttons) and file links within messages.
- **Multilingual Title Generation Language Constraint:** (Previous Task)
    - Updated the title generation prompt in `backend/controllers/chatMessages.js` again.
    - The prompt now instructs the AI to detect the language, generate the title in Vietnamese if detected as Vietnamese, otherwise generate the title in English. It also strongly emphasizes responding *only* with the title text.
- **Custom Model Usage Stats Name Fix:** (Previous Task)
    - Modified the aggregation pipelines in `backend/controllers/stats.js` to include custom model names instead of IDs in the usage statistics.

## Next Steps
- Update `progress.md` and other relevant Memory Bank files.
- Present the completed task to the user.

## Active Decisions and Considerations
- Ensured uploaded files are publicly accessible by serving the `uploads` directory.
- Implemented frontend logic for image pasting, file selection, and previews.
- Added rendering for images and file links within chat messages.
- Used `VITE_API_BASE_URL` for constructing file URLs on the frontend.

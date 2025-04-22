# Active Context: CompassAI

## Current Work Focus
Modifying chat input behavior: "Enter" for newline, "Shift+Enter" to send.

## Recent Changes
- **Dynamic Speech Recognition Language:** Modified `frontend/client/src/pages/ChatPage.tsx` to dynamically set the speech recognition language. It now uses 'vi-VN' when the application language (`i18n.language`) is 'vi', and defaults to 'en-US' otherwise. This was achieved by importing the `i18n` instance from `useTranslation` and adding a `useEffect` hook that listens for language changes.
- **Set "Brain" Toggle Default:** Modified `frontend/client/src/pages/ChatPage.tsx` to initialize the `showReasoning` state variable to `true`. This makes the reasoning/streaming toggle enabled by default when the chat page loads.
- Placed the "Start New Chat" button below the prompt shown when no chat is selected in `frontend/client/src/pages/ChatPage.tsx`.
- Reverted the previous change that added the "Start New Chat" button when a chat session was open but empty.
- Analyzed backend models (User.js, Setting.js).
- Examined backend controllers (settings.js).
- Reviewed frontend components (SettingsPage.tsx, ChatPage.tsx, i18n.ts).
- **Microphone Glow Effect:** Added CSS rules to `frontend/client/src/pages/ChatPage.module.css` to make the microphone icon glow using a `box-shadow` animation when the `micButtonListening` class is applied. The class is toggled based on the `isListening` state in `ChatPage.tsx`.
- **Chat Input Behavior:** Modified the `handleKeyDown` function in `frontend/client/src/pages/ChatPage.tsx`. Pressing "Enter" now inserts a newline, while "Shift+Enter" sends the message.

## Next Steps
- Update `progress.md` to reflect the chat input behavior change.
- Present the completed task to the user.

## Active Decisions and Considerations
- Used the `i18n.language` property from the `useTranslation` hook to detect the current application language.
- Implemented a `useEffect` hook in `ChatPage.tsx` to react to changes in `i18n.language` and update the `lang` property of the `SpeechRecognition` instance.
- Confirmed the language code for Vietnamese in `i18n.ts` is 'vi' and the corresponding speech recognition code is 'vi-VN'.
- The "brain" toggle controls both the display of reasoning steps and the enabling of streaming responses. Setting its default state to `true` enables both features by default.
- Identified the `showReasoning` state in `ChatPage.tsx` as the controlling variable for the brain toggle.
- The microphone glow effect relies on the existing `isListening` state in `ChatPage.tsx` and the conditional application of the `styles.micButtonListening` class.
- Added `@keyframes micGlow` and styles for `.micButtonListening` in `ChatPage.module.css` to create the visual effect.
- Modified the `handleKeyDown` function in `ChatPage.tsx` to check for `e.key === 'Enter' && e.shiftKey` to trigger `handleSendMessage()`, allowing the default newline behavior for "Enter" alone.
- Ensured the Memory Bank is comprehensive and up-to-date.

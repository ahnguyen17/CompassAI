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

## What's Left to Build
- Complete implementation of chat functionality.
- Finalize user settings management.
- Ensure proper authentication and authorization.

## Current Status
The project is in its initial stages with basic structures in place. The Memory Bank has been initialized and updated with insights from the codebase analysis.

## Known Issues
- None documented yet.

## Evolution of Project Decisions
- As the project progresses, decisions regarding the tech stack and architecture may evolve based on requirements and challenges encountered.

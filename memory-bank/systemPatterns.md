# System Patterns: CompassAI

## Architecture
The project follows a client-server architecture. The backend is built using Node.js and Express, providing RESTful APIs. The frontend is developed using React and Vite, consuming these APIs.

## Key Technical Decisions
1. Use of Node.js and Express for the backend due to their scalability and performance.
2. React and Vite for the frontend to leverage their component-based architecture and fast development capabilities.
3. MongoDB is likely used for data storage, given the presence of Mongoose models in the backend.
4. `multer` (using `memoryStorage`) is used for handling `multipart/form-data` for file uploads in the backend, with files then uploaded to AWS S3.
5. AWS S3 is used for cloud storage of uploaded files. Files are configured to be publicly readable via their S3 URL.
6. AI Vision Input: Implemented support for sending images (via base64 encoding) to vision-capable models (OpenAI GPT-4o/Turbo/4.1 series, Anthropic Claude 3 series, Gemini 1.5 series) by adapting API request structures based on the provider.

## Design Patterns
1. MVC (Model-View-Controller) pattern in the backend.
2. Component-based architecture in the frontend.
3. Provider-specific formatting logic within the `chatMessages` controller to handle multimodal API differences.
4. Configuration-driven feature enablement (`supportsVision` flag in `providers.js` for base models, which then informs a `baseModelSupportsVision` flag for custom models).

## Data Models (Mongoose)
- `User`: Stores user authentication and profile data.
- `Setting`: Stores global application settings (e.g., global streaming toggle).
- `ApiKey`: Stores API keys for different providers, including priority and enabled status.
- `ChatSession`: Represents a single chat conversation. Includes `lastAccessedAt` timestamp updated on view/interaction.
- `ChatMessage`: Stores individual messages within a session.
    - Includes sender, content, model used, citations, and reasoning steps.
    - Includes `fileInfo` object to store metadata for uploaded files:
        - `filename`: Unique S3 object key.
        - `originalname`: Original name from the user's computer.
        - `mimetype`: MIME type of the file.
        - `size`: Size of the file in bytes.
        - `path`: Full public S3 URL of the file.
- `DisabledModel`: Stores names of base models explicitly disabled by an admin.
- `ReferralCode`: Stores referral codes for user registration.
- `CustomProvider`: Stores admin-defined custom provider names.
- `CustomModel`: Stores admin-defined custom models, linking a name and system prompt to a base model identifier under a specific CustomProvider.
- `UserMemory`: Stores user-specific contexts for personalized responses.
    - `userId`: Reference to the `User`.
    - `isGloballyEnabled`: Boolean to toggle the feature for the user.
    - `maxContexts`: Number defining the limit of contexts to store.
    - `contexts`: Array of `ContextItemSchema` sub-documents, each containing:
        - `text`: The string of context.
        - `source`: Enum ('manual', 'chat_auto_extracted').
        - `createdAt`, `updatedAt`: Timestamps for the context item.

## Component Relationships
- Backend controllers handle business logic and interact with models.
- Backend routes expose APIs consumed by the frontend.
- Frontend components make API calls to the backend to perform various operations.
- `CustomProvider` has a one-to-many relationship with `CustomModel`.
- `CustomModel` references a `CustomProvider`.
- The `chatMessages` controller checks if a requested model ID is a `CustomModel` ObjectId. If so, it uses the linked `baseModelIdentifier` and `systemPrompt` for the API call. It also checks if the `baseModelIdentifier` supports vision (using data from `providers.js`) and formats the API call accordingly if an image is present.
- `ChatPage.tsx` on the frontend handles file selection, image pasting, preview generation, sending file data along with messages, and manages chat input behavior (Enter for newline, Shift+Enter for send). It also renders uploaded images and file links. It now includes a session-specific toggle for user memory usage and sends a `useSessionMemory` flag to the backend.
- `ModelSelectorDropdown.tsx` displays models and indicates vision support for base models directly, and for custom models based on their underlying base model's capabilities, using data from the `providers` controller.
- `userMemoryController.js` handles business logic for the `UserMemory` model.
- `chatMessages.js` controller now:
    - Optionally fetches contexts from `UserMemory` based on global and session settings.
    - Injects fetched contexts into the system prompt for the LLM.
    - Contains basic logic to auto-extract and save new contexts to `UserMemory`.
- `SettingsPage.tsx` provides UI for users to manage their `UserMemory` settings and contexts via the `/usermemory` API.

## Key API Endpoints (`/api/v1/...`)
- `/auth`: User registration, login, password updates.
- `/apikeys`: CRUD operations for provider API keys (Admin).
- `/users`: User management (Admin).
- `/chatsessions`: CRUD for chat sessions. Sorted by `lastAccessedAt` descending.
- `/chatsessions/:sessionId/messages`:
    - `GET`: Retrieve messages for a session. Updates session `lastAccessedAt`.
    - `POST`: Add message (text and/or file) to session, triggers AI response. Updates session `lastAccessedAt`. Handles `multipart/form-data` for file uploads. Now supports sending image data to vision-capable AI models.
- `/providers/models`: Get available models (filtered base models + all custom models) for chat page dropdown. Base models include a `supportsVision` flag. Custom models now include a `baseModelSupportsVision` flag derived from their base model.
- `/providers/all-models`: Get all hardcoded base models for admin settings dropdowns. Now returns array of objects including `supportsVision` flag.
- `/referralcodes`: CRUD for referral codes (Admin).
- `/disabledmodels`: CRUD for disabling/enabling base models (Admin).
- `/stats`: Usage statistics retrieval (Admin).
- `/settings`: Get/Update global application settings (Admin).
- `/customproviders`: CRUD for custom providers (Admin).
- `/custommodels`: CRUD for custom models (Admin).
- `/usermemory`:
    - `GET /`: Get user's memory settings and all contexts.
    - `PUT /settings`: Update global memory settings (isGloballyEnabled, maxContexts).
    - `POST /contexts`: Add a new context item.
    - `PUT /contexts/:contextId`: Update an existing context item.
    - `DELETE /contexts/:contextId`: Delete a specific context item.
    - `POST /contexts/clear`: Clear all contexts for the user.

## Development Workflow Patterns
1.  **Planning:** Utilize the `sequentialthinking` MCP to break down complex tasks or new features into detailed, logical steps before implementation.
2.  **Research & Integration:** Before integrating new third-party libraries/APIs or making significant structural changes, use the `context7` MCP (`resolve-library-id` then `get-library-docs`) or `perplexity-mcp` (`get_documentation`) to consult the latest documentation. This ensures adherence to current best practices and avoids deprecated features.

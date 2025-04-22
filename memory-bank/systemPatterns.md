# System Patterns: CompassAI

## Architecture
The project follows a client-server architecture. The backend is built using Node.js and Express, providing RESTful APIs. The frontend is developed using React and Vite, consuming these APIs.

## Key Technical Decisions
1. Use of Node.js and Express for the backend due to their scalability and performance.
2. React and Vite for the frontend to leverage their component-based architecture and fast development capabilities.
3. MongoDB is likely used for data storage, given the presence of Mongoose models in the backend.

## Design Patterns
1. MVC (Model-View-Controller) pattern in the backend.
2. Component-based architecture in the frontend.

## Data Models (Mongoose)
- `User`: Stores user authentication and profile data.
- `Setting`: Stores global application settings (e.g., global streaming toggle).
- `ApiKey`: Stores API keys for different providers, including priority and enabled status.
- `ChatSession`: Represents a single chat conversation.
- `ChatMessage`: Stores individual messages within a session, including sender, content, model used, file info, citations, and reasoning steps.
- `DisabledModel`: Stores names of base models explicitly disabled by an admin.
- `ReferralCode`: Stores referral codes for user registration.
- `CustomProvider`: Stores admin-defined custom provider names. (NEW)
- `CustomModel`: Stores admin-defined custom models, linking a name and system prompt to a base model identifier under a specific CustomProvider. (NEW)

## Component Relationships
- Backend controllers handle business logic and interact with models.
- Backend routes expose APIs consumed by the frontend.
- Frontend components make API calls to the backend to perform various operations.
- `CustomProvider` has a one-to-many relationship with `CustomModel`.
- `CustomModel` references a `CustomProvider`.
- The `chatMessages` controller checks if a requested model ID is a `CustomModel` ObjectId. If so, it uses the linked `baseModelIdentifier` and `systemPrompt` for the API call.

## Key API Endpoints (`/api/v1/...`)
- `/auth`: User registration, login, password updates.
- `/apikeys`: CRUD operations for provider API keys (Admin).
- `/users`: User management (Admin).
- `/chatsessions`: CRUD for chat sessions, message retrieval.
- `/chatsessions/:sessionId/messages`: Add message to session, triggers AI response.
- `/providers/models`: Get available models (filtered base models + all custom models) for chat page dropdown.
- `/providers/all-models`: Get all hardcoded base models for admin settings dropdowns.
- `/referralcodes`: CRUD for referral codes (Admin).
- `/disabledmodels`: CRUD for disabling/enabling base models (Admin).
- `/stats`: Usage statistics retrieval (Admin).
- `/settings`: Get/Update global application settings (Admin).
- `/customproviders`: CRUD for custom providers (Admin). (NEW)
- `/custommodels`: CRUD for custom models (Admin). (NEW)

## Development Workflow Patterns
1.  **Planning:** Utilize the `sequentialthinking` MCP to break down complex tasks or new features into detailed, logical steps before implementation.
2.  **Research & Integration:** Before integrating new third-party libraries/APIs or making significant structural changes, use the `context7` MCP (`resolve-library-id` then `get-library-docs`) to consult the latest documentation. This ensures adherence to current best practices and avoids deprecated features.

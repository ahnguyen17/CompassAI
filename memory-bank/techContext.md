# Tech Context: CompassAI

## Technologies Used
1. Backend: Node.js, Express, MongoDB (likely), Mongoose, `multer` (for file uploads using `memoryStorage`), `@aws-sdk/client-s3` (for AWS S3 integration), `uuid` (for generating unique S3 keys), `fs` (potentially for some text extractors if they don't handle buffers directly), `pdf-parse`, `mammoth`, `xlsx` (for text extraction from files).
2. Frontend: React, Vite, TypeScript.
3. AI Provider SDKs/APIs:
    - `@anthropic-ai/sdk` (Anthropic Claude)
    - `openai` (OpenAI GPT, also used for DeepSeek & Perplexity wrappers)
    - `@google/genai` (Google Gemini)
4. Tooling:
    - npm for package management.
    - `sequentialthinking` MCP for detailed task planning and breakdown.
    - `context7` MCP for retrieving up-to-date documentation for libraries/APIs.
    - `perplexity-mcp` for research and documentation retrieval.
5. Other: npm for package management.
6. User Memory Feature: Utilizes Mongoose for the `UserMemory` model, with backend logic in Express controllers for CRUD operations and integration into chat processing. Frontend uses React state and Axios for API interactions.

## Development Setup
1. Backend and frontend are separate directories within the project.
2. npm is used for managing dependencies in both backend and frontend.
3. The project uses a .env file for environment variables (example provided), including AWS S3 credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_S3_REGION`).
4. Backend uploads files to AWS S3, and they are served publicly via S3 URLs. Local static file serving for uploads has been removed.
5. Backend configuration (`providers.js`) defines base model capabilities, including vision support. This information is used to populate `supportsVision` flags for base models and a `baseModelSupportsVision` flag for custom models in API responses.

## Technical Constraints
1. The backend and frontend must be able to communicate via RESTful APIs.
2. The application should be scalable and performant.
3. Security considerations, such as proper authentication and authorization, are crucial.
4. Multimodal input (images) requires provider-specific API formatting (base64 encoding, content structure). Logic is centralized in `chatMessages.js`.
5. Base64 image encoding/decoding adds processing overhead.
6. Vision model API calls might have different pricing structures and rate limits compared to text-only models.
7. Vision support for specific models (especially newer ones like GPT-4.1 series or Perplexity models) needs verification against official API documentation.
8. **User Memory Storage:** The `UserMemory` model stores an array of context sub-documents. Performance considerations for querying and updating this array (especially with sorting, uniqueness checks, and trimming) should be monitored as data grows. The current `maxContexts` limit (e.g., 50-200) helps mitigate this.
9. **Automatic Context Extraction:** The initial implementation for auto-extracting context is rule-based and simple. More advanced NLP techniques would require additional libraries or services and add complexity.
10. **Context Injection:** Injecting too much context into LLM prompts can increase token usage and costs, and potentially dilute the immediate query's focus. The amount of context injected (e.g., top 10 recent items) is a balance.

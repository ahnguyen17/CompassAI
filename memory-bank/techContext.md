# Tech Context: CompassAI

## Technologies Used
1. Backend: Node.js, Express, MongoDB (likely), Mongoose, `multer` (for file uploads), `fs` (for file system access), `pdf-parse` (for PDF text extraction).
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

## Development Setup
1. Backend and frontend are separate directories within the project.
2. npm is used for managing dependencies in both backend and frontend.
3. The project uses a .env file for environment variables (example provided).
4. Backend serves uploaded files statically from the `backend/uploads` directory.

## Technical Constraints
1. The backend and frontend must be able to communicate via RESTful APIs.
2. The application should be scalable and performant.
3. Security considerations, such as proper authentication and authorization, are crucial.
4. Multimodal input (images) requires provider-specific API formatting (base64 encoding, content structure).
5. Base64 image encoding/decoding adds processing overhead.
6. Vision model API calls might have different pricing structures and rate limits compared to text-only models.

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

## Component Relationships
- Backend controllers handle business logic and interact with models.
- Backend routes expose APIs consumed by the frontend.
- Frontend components make API calls to the backend to perform various operations.

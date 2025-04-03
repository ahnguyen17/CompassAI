# CompassAI Chatbox

This project is a web-based AI chat application inspired by platforms like chat.deepseek.com, featuring chat history, sharing, API key management, user administration, and multi-provider support. It consists of a Node.js/Express backend and a React/Vite frontend.

## Project Structure

```
ai-chatbox/
├── backend/         # Node.js/Express backend code
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── uploads/       # Default location for file uploads (consider cloud storage for production)
│   ├── .env           # Environment variables (local development, DO NOT COMMIT)
│   ├── package.json
│   └── server.js      # Main backend entry point
├── frontend/        # React/Vite frontend code
│   └── client/
│       ├── public/
│       │   └── _redirects # Netlify redirect rule for SPA routing
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── services/
│       │   ├── types/
│       │   ├── App.tsx
│       │   ├── i18n.ts
│       │   ├── index.css
│       │   ├── main.tsx     # Main frontend entry point
│       │   └── vite-env.d.ts
│       ├── .env           # Environment variables (local development, DO NOT COMMIT)
│       ├── index.html
│       ├── package.json
│       ├── vite.config.js # Vite config including proxy for local dev
│       └── tsconfig.json
└── .gitignore       # Git ignore rules for the whole project
```

## Features

*   **User Authentication:** Secure login and registration system using JWT.
*   **Chat History:** Sidebar displays past chat sessions for easy navigation.
*   **Chat Sharing:** Generate unique, shareable links for specific chat sessions.
*   **Multi-Provider Support:** Integrates with multiple AI providers:
    *   Anthropic (Claude models)
    *   OpenAI (GPT models)
    *   Google (Gemini models)
    *   DeepSeek (DeepSeek models)
*   **Model Selection:** Choose specific models from enabled providers for each chat message.
*   **Streaming Responses:** Real-time AI responses using Server-Sent Events (SSE).
*   **Streaming Toggle:** Option to enable/disable streaming mode per user preference.
*   **File Attachments:** Attach files (including basic PDF text extraction) to messages.
*   **Admin Panel:**
    *   Manage API keys for different providers (add, enable/disable, set priority).
    *   Manage users (view, edit roles, delete).
    *   Manage disabled models.
    *   Manage referral codes.
*   **Dark Mode:** Toggle between light and dark themes.
*   **Internationalization (i18n):** Basic setup for multi-language support.
*   **Responsive Design:** Adapts to different screen sizes.

## Local Development Setup

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm
*   MongoDB (local instance or connection string for Atlas)

### Backend

1.  Navigate to the backend directory: `cd backend`
2.  Create a `.env` file by copying `.env.example` (if it exists) or creating a new one.
3.  Set the following environment variables in `.env`:
    *   `MONGODB_URI`: Your MongoDB connection string (local or Atlas).
    *   `JWT_SECRET`: A strong secret string for signing tokens.
    *   `JWT_EXPIRE`: Token expiration time (e.g., `30d`).
    *   `PORT`: Port for the backend server (e.g., `5001`).
    *   `NODE_ENV`: `development`
4.  Install dependencies: `npm install`
5.  Start the server: `npm start` (uses `node server.js`)
6.  **(Optional) Create Initial Admin User:** To create the default admin user (`admin`/`password`), run the seeder: `node seeder.js -i`. **Change this password immediately after first login!**

### Frontend

1.  Navigate to the frontend client directory: `cd ../frontend/client`
2.  Install dependencies: `npm install`
3.  Start the development server: `npm run dev` (Use `npm run dev -- --host` to expose on your local network for mobile testing). The `vite.config.js` file includes a proxy to redirect `/api` requests to your backend (defaulting to `http://localhost:5001`).

## Deployment Instructions

This guide uses **Render** for the backend and **Netlify** for the frontend as examples.

### I. Preparation

1.  **Copy Project:** Create a separate copy of this entire `ai-chatbox` directory for deployment.
2.  **Version Control (Git):**
    *   Navigate into the copied directory.
    *   Initialize Git: `git init`
    *   Ensure a `.gitignore` file exists in the root (see example below or use the one provided). It **must** ignore `.env` files, `node_modules`, and build output (`dist`).
    *   Stage all files: `git add .`
    *   Commit: `git commit -m "Initial commit for deployment"`
    *   Create a new **private** repository on GitHub/GitLab.
    *   Link and push your local repository to the remote:
        ```bash
        git remote add origin <your-remote-repo-url>
        git branch -M main
        git push -u origin main
        ```

### II. Backend Deployment (Render)

1.  **Database (MongoDB Atlas):**
    *   Ensure you have an Atlas cluster ready.
    *   Create a Database User with read/write permissions. **Save the password securely.**
    *   Configure Network Access to allow connections (use `0.0.0.0/0` for Render, restrict later if possible).
    *   Get the Connection String and replace `<username>`, `<password>`, and add your database name (e.g., `compassai-db`). This is your `MONGODB_URI`.
2.  **Render Setup:**
    *   Create a new "Web Service" on Render, connecting your GitHub repository.
    *   **Settings:**
        *   Root Directory: `backend`
        *   Build Command: `npm install`
        *   Start Command: `npm start`
    *   **Environment Variables:**
        *   `MONGODB_URI`: Your full Atlas connection string.
        *   `JWT_SECRET`: A **new, strong, random** secret for production.
        *   `JWT_EXPIRE`: `30d` (or your desired expiration).
        *   `NODE_ENV`: `production`
        *   `PORT`: Render typically sets this automatically, but you can set it if needed (e.g., `10000`).
    *   Deploy the service.
    *   **Copy the backend URL** provided by Render (e.g., `https://your-backend.onrender.com`).
    *   **(Optional) Seed Initial Admin:** Connect to your deployed backend environment (e.g., Render Shell, SSH) navigate to the `backend` directory, and run `node seeder.js -i` once to create the default admin user.

### III. Frontend Deployment (Netlify)

1.  **Netlify Setup:**
    *   Create a new "Site from Git" on Netlify, connecting the same GitHub repository.
    *   **Build Settings:**
        *   Base directory: `frontend/client`
        *   Build command: `npm run build`
        *   Publish directory: `frontend/client/dist`
    *   **Environment Variables:**
        *   `VITE_API_BASE_URL`: The **full URL of your deployed Render backend**, including `/api/v1` (e.g., `https://your-backend.onrender.com/api/v1`).
    *   Deploy the site.
    *   Ensure the `frontend/client/public/_redirects` file exists with `/* /index.html 200` to handle SPA routing.

### IV. Final Checks

1.  **Backend CORS:** Verify the `origin` in `backend/server.js`'s `corsOptions` includes your deployed Netlify frontend URL. If you had to update it after getting the Netlify URL, commit, push, and redeploy the backend.
2.  **Initial Login:** If you ran the seeder, log in with `admin` / `password` and **change the password immediately**. Otherwise, register the first user through the UI.
3.  **Test:** Access your Netlify URL and test registration, login, chat functionality (streaming/non-streaming, file uploads), sharing, and admin features.

## Important Notes

*   **Secrets:** Never commit `.env` files or hardcode secrets (DB URI, JWT Secret). Use hosting platform environment variables.
*   **Uploads:** The default file upload saves to the backend server's filesystem (`backend/uploads/`). This is **not suitable for most production environments** (especially PaaS like Render free tier) as the filesystem is often temporary. For persistent uploads, integrate a cloud storage service (AWS S3, Google Cloud Storage, Cloudinary) which requires backend code changes.
*   **Security:** Restrict database IP access in Atlas once your backend IP is stable. Use strong secrets. Implement rate limiting and input validation on the backend.

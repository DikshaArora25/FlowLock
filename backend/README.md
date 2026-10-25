# FlowLock Backend

## Overview
FlowLock Backend provides the server-side APIs for task management, authentication, and activity tracking.

## Technology Stack
- Node.js
- Express.js
- MongoDB with Mongoose
- JSON Web Tokens (JWT)

## Setup

1. Open a terminal in the backend directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file using `.env.example` as a reference.
4. Configure your MongoDB connection, frontend origin, and JWT secret.
5. Start the development server:

   ```bash
   npm run dev
   ```

## Available Scripts

| Command | Purpose |
|---|---|
| `npm start` | Start the server |
| `npm run dev` | Start in development mode |
| `npm test` | Run backend tests |
| `npm run test:auth` | Run authentication tests |
| `npm run test:task` | Run task tests |

## API Routes

- `/api/health` — Health check
- `/api/tasks` — Task API
- Authentication and activity routes are also available.

## Security
Keep `.env` private. Never commit real credentials, database connection strings, or JWT secrets.

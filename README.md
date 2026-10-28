# FlowLock — Dependency-Aware Task Management System

**A full-stack Kanban board with intelligent task dependencies, workflow validation, and activity tracking.**

FlowLock is a task management application designed to make project workflows more reliable and transparent. It combines a responsive Kanban interface with a Node.js and Express backend, MongoDB persistence, and server-side dependency validation.

The full-stack upgrade separates frontend presentation from backend business logic, enabling tasks to be created, retrieved, updated, and deleted through REST APIs while enforcing dependency and workflow rules on the server.

**Live Application:** https://flowlock.onrender.com

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Key Features](#2-key-features)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Project Structure](#5-project-structure)
6. [Prerequisites](#6-prerequisites)
7. [Local Installation](#7-local-installation)
8. [Environment Configuration](#8-environment-configuration)
9. [API Reference](#9-api-reference)
10. [Thunder Client Testing](#10-thunder-client-testing)
11. [Dependency Management and Workflow Rules](#11-dependency-management-and-workflow-rules)
12. [Automated Testing](#12-automated-testing)
13. [HTTP Status Codes and Error Handling](#13-http-status-codes-and-error-handling)
14. [Security Considerations](#14-security-considerations)
15. [Deployment](#15-deployment)
16. [Future Improvements](#16-future-improvements)

---

## 1. Project Overview

Traditional Kanban boards allow users to move tasks between workflow stages, but they may not prevent a task from progressing before its prerequisites are complete.

FlowLock addresses this problem by incorporating dependency-aware task management into a full-stack application.

The application combines:

- A responsive frontend for managing tasks and viewing workflow progress.
- A centralized API client for communication with the backend.
- RESTful endpoints for authentication, task management, and activity tracking.
- MongoDB persistence through Mongoose.
- Server-side validation of task dependencies and workflow transitions.
- Dependency-cycle detection and downstream lock recalculation.

The backend is responsible for enforcing workflow rules instead of relying exclusively on frontend validation.

## 2. Key Features

### Task Management

- Create, read, update, and delete tasks through REST APIs.
- Search and filter tasks using query parameters.
- Sort tasks by supported fields.
- Maintain task details such as title, description, status, priority, assignee, due date, and dependencies.

### Dependency-Aware Workflows

- Define prerequisite relationships between tasks.
- Detect invalid and circular dependencies.
- Prevent blocked tasks from entering restricted workflow states.
- Recalculate downstream task locks when prerequisite tasks are completed.
- Protect prerequisite tasks from deletion when other tasks depend on them.

### Authentication and User Management

- User registration and login endpoints.
- Password hashing using bcrypt.
- JSON Web Token (JWT) authentication.
- Protected profile and password-management endpoints.
- Server-side validation of incoming requests.

### Activity Tracking

- Retrieve recent activity records.
- Add activity entries through the API.
- Search and paginate activity results where supported.
- Provide activity statistics through a dedicated endpoint when available in the deployed version.

### Development and Testing

- Automated backend tests.
- REST API testing using Thunder Client or Postman.
- Separate frontend and backend responsibilities.
- Environment-based configuration for local and deployed environments.

## 3. Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Frontend structure |
| CSS3 | Responsive interface and styling |
| JavaScript (ES Modules) | Frontend interactions and API communication |
| Node.js | JavaScript runtime for the backend |
| Express.js | HTTP server, routing, and middleware |
| MongoDB | Persistent data storage |
| Mongoose | MongoDB schemas, models, queries, and validation |
| bcrypt / bcryptjs | Password hashing |
| JSON Web Token (JWT) | Token-based authentication |
| npm | Dependency and script management |
| Thunder Client | REST API testing |
| Render | Hosted application endpoint |

## 4. System Architecture

FlowLock follows a layered architecture that separates user interaction, API communication, business logic, and data persistence.

```text
                 USER
                   |
                   v
       +------------------------+
       |   Frontend Interface   |
       | HTML, CSS, JavaScript  |
       +------------------------+
                   |
                   v
       +------------------------+
       |    Central API Client  |
       | HTTP Requests / JSON   |
       +------------------------+
                   |
                   v
       +------------------------+
       |   Express.js Server    |
       | Routes and Middleware  |
       +------------------------+
                   |
                   v
       +------------------------+
       | Controllers / Services |
       | Validation and Rules   |
       +------------------------+
                   |
                   v
       +------------------------+
       |    Mongoose Models     |
       +------------------------+
                   |
                   v
       +------------------------+
       |      MongoDB           |
       | Persistent Application |
       | Data                   |
       +------------------------+
```

### Request Lifecycle

1. The frontend sends an HTTP request to the backend.
2. Express receives the request and matches the appropriate route.
3. Middleware performs applicable parsing, authentication, or validation.
4. The controller processes the request and applies business rules.
5. Mongoose interacts with MongoDB when database access is required.
6. The backend returns a JSON response with an appropriate HTTP status code.
7. The frontend processes the response and updates the interface.

## 5. Project Structure

The following structure describes the main application areas. Some filenames may differ between branches, so use the actual files in your checked-out repository as the source of truth.

```text
FlowLock/
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── signup.html
│   ├── dashboard.html
│   ├── tasks.html
│   ├── activity.html
│   ├── profile.html
│   ├── styles.css
│   └── js/
│       ├── api.js
│       ├── app.js
│       ├── auth.js
│       ├── dependencyEngine.js
│       ├── landing.js
│       ├── storage.js
│       ├── taskManager.js
│       ├── ui.js
│       ├── utils.js
│       └── validation.js
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── app.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── tests/
├── .gitignore
├── README.md
└── package.json (if present in the repository)
```

**Important:** If your current branch uses `express/` instead of `backend/`, retain the actual folder name in your README and terminal commands.

## 6. Prerequisites

Install the following before running FlowLock locally:

- Node.js 18 or later.
- npm, included with Node.js.
- A MongoDB instance, either local MongoDB or MongoDB Atlas.
- Git.
- Visual Studio Code or another code editor.

For API testing, install the Thunder Client extension in Visual Studio Code. Postman can also be used.

## 7. Local Installation

### Step 1: Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
cd FlowLock
```

Replace `YOUR_REPOSITORY_URL` with the actual Git repository URL.

### Step 2: Install backend dependencies

If your backend folder is named `backend`:

```bash
cd backend
npm install
```

If your repository uses `express`, navigate to that folder instead.

### Step 3: Configure environment variables

Create a local `.env` file in the backend directory using the variables described in the next section.

Do not commit your real `.env` file or secrets to GitHub.

### Step 4: Start the backend

Use the script defined in your backend `package.json`. Common examples are:

```bash
npm run dev
```

or:

```bash
npm start
```

The exact available commands depend on the scripts configured in your repository.

### Step 5: Open the application

If Express serves the frontend, open:

```text
http://localhost:5000
```

Test the health endpoint:

```text
http://localhost:5000/api/health
```

If the frontend is hosted separately, configure its API URL to point to the backend server.

## 8. Environment Configuration

Configure the backend using environment variables rather than hardcoding sensitive values.

Example `.env` configuration:

```dotenv
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/flowlock
JWT_SECRET=replace_with_a_strong_random_secret
FRONTEND_URL=http://localhost:3000
```

### Configuration Notes

- `PORT`: Port on which the backend listens.
- `NODE_ENV`: Environment, such as `development` or `production`.
- `MONGODB_URI`: MongoDB connection string.
- `JWT_SECRET`: Secret used to sign authentication tokens.
- `FRONTEND_URL`: Frontend origin used for CORS configuration, if supported by the application.

Use the correct variable names expected by your backend code. When using MongoDB Atlas, replace the local URI with your Atlas connection string.

Never publish real database credentials, JWT secrets, or passwords.

## 9. API Reference

**Base URL**

Local:

```text
http://localhost:5000
```

Deployed:

```text
https://flowlock.onrender.com
```

The endpoints below document the API routes associated with the current FlowLock project. An endpoint's inclusion in this reference does not by itself confirm that it is available or working on the deployed Render instance. Verify the actual HTTP response during testing.

### 9.1 Health and Read APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check server and database health |
| GET | `/api/tasks` | Retrieve tasks |
| GET | `/api/activity` | Retrieve activity history |
| GET | `/api/activity/stats` | Retrieve activity statistics, if supported by the deployed version |

Example:

```http
GET /api/health
```

A successful response should indicate that the server is responding and provide database health information where implemented.

### 9.2 Authentication APIs

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| POST | `/api/auth/signup` | Register a user | Not normally required |
| POST | `/api/auth/login` | Authenticate a user | Not normally required |
| GET | `/api/auth/me` | Retrieve the current user's profile | Bearer token |
| PATCH | `/api/auth/me` | Update the current user's profile | Bearer token |
| PATCH | `/api/auth/password` | Change the current user's password | Bearer token |

#### Register a User

```http
POST /api/auth/signup
Content-Type: application/json
```

Example request body:

```json
{
  "name": "FlowLock Demo User",
  "email": "YOUR_VALID_EMAIL",
  "password": "UseYourOwnStrongDemoPassword",
  "role": "Backend Tester"
}
```

Replace `YOUR_VALID_EMAIL` with a valid email address. Use the field names and role values accepted by your current backend.

#### Login

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "YOUR_VALID_EMAIL",
  "password": "UseYourOwnStrongDemoPassword"
}
```

After successful login, inspect the response for the JWT token field. Copy the actual token into Thunder Client's Bearer authentication settings.

#### Get the Current User

```http
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

This request demonstrates token-based authentication. Repeat it without the token to test the application's unauthorized-request handling.

#### Update Profile

```http
PATCH /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

```json
{
  "name": "FlowLock Demo User Updated",
  "role": "Backend Tester"
}
```

#### Change Password

```http
PATCH /api/auth/password
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

```json
{
  "currentPassword": "YOUR_CURRENT_PASSWORD",
  "newPassword": "YOUR_NEW_STRONG_PASSWORD"
}
```

Use a disposable demo account when demonstrating password changes.

### 9.3 Task Management APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | Retrieve all tasks |
| GET | `/api/tasks/:id` | Retrieve one task by supported identifier |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task, subject to dependency rules |

#### Create a Task

```http
POST /api/tasks
Content-Type: application/json
```

```json
{
  "title": "DEMO - API Testing",
  "description": "Testing FlowLock through Thunder Client",
  "status": "Todo",
  "priority": "High",
  "assignee": "Diksha",
  "dueDate": "2026-11-05",
  "dependsOn": []
}
```

Use the identifier returned by the response when testing subsequent requests.

#### Retrieve One Task

```http
GET /api/tasks/YOUR_TASK_ID
```

#### Update a Task

```http
PATCH /api/tasks/YOUR_TASK_ID
Content-Type: application/json
```

```json
{
  "description": "Updated using the FlowLock REST API",
  "priority": "Low"
}
```

#### Delete a Task

```http
DELETE /api/tasks/YOUR_TASK_ID
```

Only delete tasks created specifically for testing. Deletion may be rejected if other tasks depend on the selected task.

### 9.4 Task Search, Filtering, and Sorting

The task listing endpoint supports query parameters implemented by the backend.

| Feature | Example |
|---|---|
| Search | `/api/tasks?search=design` |
| Filter by status | `/api/tasks?status=Todo` |
| Filter by priority | `/api/tasks?priority=High` |
| Sort by priority | `/api/tasks?sortBy=priority` |
| Sort by due date | `/api/tasks?sortBy=dueDate` |

Query parameter values must match the filtering and sorting rules in the current implementation.

### 9.5 Activity APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/activity` | Retrieve activity records |
| GET | `/api/activity?page=1&limit=5` | Test pagination, if supported |
| GET | `/api/activity?search=task` | Search activity, if supported |
| POST | `/api/activity` | Create an activity entry |
| GET | `/api/activity/stats` | Retrieve activity statistics, if supported |

#### Create an Activity Entry

```http
POST /api/activity
Content-Type: application/json
```

```json
{
  "text": "Thunder Client API demonstration",
  "type": "info"
}
```

Verify the accepted activity types and validation rules against the current backend implementation.

**Production safety:** Avoid clearing activity logs or resetting demo data on the live deployment during routine testing.

### 9.6 Optional Maintenance Endpoints

The project source may also include maintenance routes such as:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/tasks/import` | Bulk import tasks |
| POST | `/api/tasks/reset-demo` | Reset demo task data |
| DELETE | `/api/activity` | Clear activity records |

Use these only after confirming that the routes exist in the deployed version and understanding their effects. They can modify or remove stored data and should not be included in a routine production demonstration.

## 10. Thunder Client Testing

Thunder Client provides a convenient way to send HTTP requests directly from Visual Studio Code.

### Step 1: Configure the Base URL

Create a collection named `FlowLock API Testing`.

Set the base URL to:

```text
https://flowlock.onrender.com
```

Use this URL for deployed testing. For local testing, use `http://localhost:5000`.

### Step 2: Test Server Health

Send:

```http
GET https://flowlock.onrender.com/api/health
```

Inspect the status code and JSON response.

### Step 3: Test Authentication

1. Register a test user with valid details.
2. Log in using the same credentials.
3. Copy the JWT token from the response.
4. Open the request's Auth tab.
5. Select Bearer authentication and paste the token.
6. Request `GET /api/auth/me`.
7. Remove the token and repeat the request to test authentication failure.

### Step 4: Test Task CRUD

1. Fetch the task list.
2. Create a clearly labelled demo task.
3. Copy its returned identifier.
4. Retrieve the task using its identifier.
5. Update one of its fields.
6. Retrieve it again to confirm the update.
7. Delete the demo task after completing the tests, provided no other task depends on it.

### Step 5: Test Filtering and Activity

Try the supported task filters, retrieve activity history, create a test activity entry, and verify whether it appears in the returned records.

Test `/api/activity/stats` separately because its availability must be confirmed on the deployed server.

### Step 6: Record Actual Results

For each request, record:

- HTTP method and endpoint.
- Status code.
- Response JSON.
- Response time.
- Whether the result matches expectations.

Mark an endpoint as **Passed** only after a successful test against the environment you intend to demonstrate.

## 11. Dependency Management and Workflow Rules

FlowLock's dependency-aware workflow is designed to maintain task consistency.

### Blocked Task Protection

A task must not be moved into a restricted workflow state while its prerequisite tasks remain incomplete.

For example, attempting to move a blocked task to `In Progress` should be rejected when the server's dependency rules require all prerequisites to be completed.

### Circular Dependency Prevention

A dependency graph must not contain a cycle.

For example:

```text
Task A → Task B → Task C → Task A
```

A cycle would make the prerequisite chain impossible to resolve normally. The backend should reject invalid dependency changes.

### Invalid Dependency References

A task must not reference a prerequisite that does not exist.

The backend validates dependency references to prevent inconsistent relationships.

### Lock Recalculation

When a prerequisite is completed, downstream tasks can be recalculated so that eligible tasks become available for progression.

### Dependency-Aware Deletion

Deleting a prerequisite task may affect other tasks. The backend must protect dependent records according to its deletion rules and return an appropriate error when confirmation or additional handling is required.

These rules should be tested against the actual server implementation, rather than inferred solely from frontend behavior.

## 12. Automated Testing

Run the backend's configured test suite from its directory:

```bash
npm test
```

The repository's automated tests may cover:

- Health checks and database connectivity.
- Task retrieval and creation.
- Request validation.
- Invalid dependency references.
- Circular and self-dependency checks.
- Blocked task status transitions.
- Dependency lock recalculation.
- Deletion restrictions.
- Activity-related behavior.
- Authentication and token validation, where included in the test suite.

The precise coverage depends on the test files present in the current branch.

### Local and Deployed Testing

Automated local tests and live API tests serve different purposes:

- **Automated tests** check behavior in the configured test environment.
- **Thunder Client tests** check the API exposed by the chosen server.
- **Integration tests** check interactions between application components and dependencies.

Passing local tests does not guarantee that every production endpoint is deployed correctly or that the live database is healthy.

## 13. HTTP Status Codes and Error Handling

FlowLock APIs use HTTP status codes to communicate the outcome of requests. The exact codes depend on the route implementation.

| Status | Meaning | Typical example |
|---|---|---|
| `200 OK` | Request succeeded | Fetch or update a record |
| `201 Created` | A resource was created | Successful task creation |
| `400 Bad Request` | Invalid request data or business rule violation | Invalid dependency |
| `401 Unauthorized` | Authentication is missing or invalid | Protected request without a valid token |
| `404 Not Found` | Resource or route not found | Requesting a nonexistent task |
| `409 Conflict` | Request conflicts with existing state | Duplicate account or protected deletion, if implemented |
| `500 Internal Server Error` | Unexpected server-side failure | Unhandled application or database error |

A useful API response should communicate success or failure clearly and provide a meaningful message without exposing sensitive internal details.

## 14. Security Considerations

- Store passwords as secure hashes rather than plaintext.
- Keep JWT signing secrets in environment variables.
- Validate incoming request bodies on the backend.
- Authenticate protected endpoints.
- Avoid exposing database connection strings or secrets in source control.
- Configure CORS for the intended frontend origins.
- Use HTTPS for deployed API communication.
- Avoid destructive operations against production data during demonstrations.
- Apply rate limiting and security headers where appropriate.
- Review error responses to ensure they do not disclose secrets or sensitive internal information.

Security features should be described as implemented only when they are present and configured in the current codebase.

## 15. Deployment

The current hosted application endpoint is:

**https://flowlock.onrender.com**

### Deployment Checklist

- Configure the production MongoDB connection string.
- Configure the JWT secret and other required environment variables.
- Confirm the backend binds to the port supplied by the hosting platform.
- Configure CORS for the deployed frontend.
- Verify the health endpoint.
- Verify authentication and task APIs against the deployed environment.
- Check server logs for failed database connections or route errors.
- Confirm that environment secrets are not committed to GitHub.

For hosted testing, use the deployed base URL instead of the local `localhost` URL.

## 16. Future Improvements

Potential improvements include:

- Role-based authorization and finer-grained permissions.
- Rate limiting and additional security headers.
- More comprehensive API integration tests.
- Automated API documentation using OpenAPI or Swagger.
- CI/CD pipelines for automated testing and deployment.
- Improved monitoring, logging, and error reporting.
- Pagination and filtering consistency across endpoints.
- Stronger production data-management and backup procedures.
- Expanded activity analytics and workflow reporting.

---

## Conclusion

FlowLock demonstrates how a client-side Kanban application can evolve into a full-stack system with REST APIs, persistent storage, authentication, and server-side workflow validation.

Its dependency-aware design focuses on maintaining consistent task relationships and preventing invalid workflow transitions. The separation of frontend, backend, and database responsibilities also makes the project easier to test, maintain, and extend.

**Live Application:** https://flowlock.onrender.com

**API Health Check:** https://flowlock.onrender.com/api/health

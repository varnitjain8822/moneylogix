# MoneyLogix - Portfolio {{PROJECT_NAME}} Wallet - Low Level Design (LLD)

## Document Information
| Field | Value |
|-------|-------|
| Project | MoneyLogix - Portfolio {{PROJECT_NAME}} Wallet |
| Version | 1.0 |
| Date | 2026-07-29 |
| Author | Development Team |
| Status | Draft |
| Reviewers | {{REVIEWERS}} |

---

## 1. API Specification

### 1.1 API Overview

| Property | Value |
|----------|-------|
| Base URL | `{{BASE_URL}}` |
| Protocol | HTTPS |
| Authentication | Bearer Token (JWT) |
| Content Type | application/json |
| Rate Limit | {{RATE_LIMIT}} requests/minute |

### 1.2 Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "email": "string (required)",
  "password": "string (required, min 8 chars)",
  "name": "string (required)"
}
```

**Response (201 Created):**
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "createdAt": "timestamp"
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Validation Error",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

#### POST /api/auth/login
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "token": "string (JWT)",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string"
  }
}
```

#### POST /api/auth/refresh
Refresh expired JWT token.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "token": "string (new JWT)"
}
```

### 1.3 Core Feature Endpoints

#### GET /api/{{RESOURCE}}
List all resources with pagination.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page |
| sort | string | createdAt | Sort field |
| order | string | desc | Sort order (asc/desc) |
| search | string | - | Search query |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### GET /api/{{RESOURCE}}/:id
Get single resource by ID.

**Response (200 OK):**
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**Error (404 Not Found):**
```json
{
  "error": "Resource Not Found",
  "message": "Resource with id {{id}} not found"
}
```

#### POST /api/{{RESOURCE}}
Create new resource.

**Request:**
```json
{
  "name": "string (required)",
  "description": "string (optional)"
}
```

**Response (201 Created):**
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "createdAt": "timestamp"
}
```

#### PUT /api/{{RESOURCE}}/:id
Update existing resource.

**Request:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)"
}
```

**Response (200 OK):**
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "updatedAt": "timestamp"
}
```

#### DELETE /api/{{RESOURCE}}/:id
Delete resource by ID.

**Response (204 No Content)**

### 1.4 AI/ML Endpoints

#### POST /api/ai/analyze
Analyze data using AI model.

**Request:**
```json
{
  "type": "string (required)",
  "data": "object (required)",
  "options": {
    "model": "string (optional)",
    "temperature": "number (optional, 0-1)"
  }
}
```

**Response (200 OK):**
```json
{
  "result": "object",
  "confidence": "number (0-1)",
  "metadata": {
    "model": "string",
    "processingTime": "number (ms)"
  }
}
```

### 1.5 WebSocket Events

#### Connection
```javascript
// Client connects
socket.on('connect', () => {
  console.log('Connected to server');
});

// Subscribe to updates
socket.emit('subscribe', { channel: 'updates' });

// Receive updates
socket.on('update', (data) => {
  console.log('Received update:', data);
});

// Disconnect
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
```

#### Event Types

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| update | Server→Client | `{type, data}` | Real-time update |
| subscribe | Client→Server | `{channel}` | Subscribe to channel |
| unsubscribe | Client→Server | `{channel}` | Unsubscribe from channel |

---

## 2. Database Schema

### 2.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE SCHEMA                             │
│                                                                     │
│  ┌──────────────┐          ┌──────────────┐                        │
│  │    users     │          │   sessions   │                        │
│  ├──────────────┤          ├──────────────┤                        │
│  │ id (PK)      │────┐     │ id (PK)      │                        │
│  │ email        │    │     │ userId (FK)  │                        │
│  │ password     │    │     │ token        │                        │
│  │ name         │    │     │ expiresAt    │                        │
│  │ createdAt    │    │     │ createdAt    │                        │
│  │ updatedAt    │    │     └──────────────┘                        │
│  └──────────────┘    │                                             │
│         │            │                                             │
│         │            │     ┌──────────────┐                        │
│         │            │     │  resources   │                        │
│         │            │     ├──────────────┤                        │
│         │            │     │ id (PK)      │                        │
│         └────────────┼────▶│ userId (FK)  │                        │
│                      │     │ name         │                        │
│                      │     │ description  │                        │
│                      │     │ status       │                        │
│                      │     │ createdAt    │                        │
│                      │     │ updatedAt    │                        │
│                      │     └──────────────┘                        │
│                      │            │                                 │
│                      │            │                                 │
│                      │     ┌──────────────┐                        │
│                      │     │   items      │                        │
│                      │     ├──────────────┤                        │
│                      │     │ id (PK)      │                        │
│                      │     │ resourceId   │                        │
│                      │     │ data         │                        │
│                      │     │ createdAt    │                        │
│                      │     └──────────────┘                        │
│                      │                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Table Definitions

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

#### sessions
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_userId ON sessions(userId);
```

#### resources
```sql
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resources_userId ON resources(userId);
CREATE INDEX idx_resources_status ON resources(status);
```

### 2.3 Data Types & Constraints

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| id | UUID | No | gen_random_uuid() | PRIMARY KEY |
| email | VARCHAR(255) | No | - | UNIQUE |
| password | VARCHAR(255) | No | - | - |
| name | VARCHAR(255) | No | - | - |
| role | VARCHAR(50) | Yes | 'user' | CHECK (role IN ('user', 'admin')) |
| status | VARCHAR(50) | Yes | 'active' | CHECK (status IN ('active', 'inactive')) |
| createdAt | TIMESTAMP | No | CURRENT_TIMESTAMP | - |
| updatedAt | TIMESTAMP | No | CURRENT_TIMESTAMP | - |

---

## 3. Component Architecture

### 3.1 Frontend Component Tree

```
App
├── Providers
│   ├── AuthProvider
│   ├── ThemeProvider
│   └── ToastProvider
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   ├── Navigation
│   │   └── UserMenu
│   ├── Sidebar
│   │   ├── NavigationItems
│   │   └── CollapseButton
│   └── MainContent
│       └── {Outlet}
├── Pages
│   ├── Auth
│   │   ├── LoginPage
│   │   └── RegisterPage
│   ├── Dashboard
│   │   ├── DashboardPage
│   │   ├── StatsCards
│   │   └── Charts
│   ├── Features
│   │   ├── FeatureListPage
│   │   ├── FeatureDetailPage
│   │   └── FeatureFormPage
│   └── Settings
│       ├── SettingsPage
│       └── ProfileForm
└── Components
    ├── UI
    │   ├── Button
    │   ├── Input
    │   ├── Modal
    │   └── Card
    └── Shared
        ├── LoadingSpinner
        ├── ErrorBoundary
        └── EmptyState
```

### 3.2 Backend Service Architecture

```
Server
├── Middleware
│   ├── authenticate.ts
│   ├── validate.ts
│   ├── rateLimit.ts
│   └── errorHandler.ts
├── Routes
│   ├── auth.ts
│   ├── resources.ts
│   └── ai.ts
├── Controllers
│   ├── authController.ts
│   ├── resourceController.ts
│   └── aiController.ts
├── Services
│   ├── authService.ts
│   ├── resourceService.ts
│   ├── aiService.ts
│   └── emailService.ts
├── Models
│   ├── User.ts
│   ├── Session.ts
│   └── Resource.ts
└── Utils
    ├── logger.ts
    ├── validator.ts
    └── helpers.ts
```

---

## 4. Error Handling

### 4.1 Error Types

```typescript
// Custom Error Classes
class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(details: any) {
    super(400, 'Validation Error', 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, `${resource} not found`, 'NOT_FOUND', { resource, id });
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}
```

### 4.2 Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {
      "field": "Error details"
    },
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "uuid"
  }
}
```

### 4.3 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Input validation failed |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## 5. State Management

### 5.1 Frontend State Structure

```typescript
// Application State
interface AppState {
  auth: AuthState;
  ui: UIState;
  data: DataState;
}

// Auth State
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// UI State
interface UIState {
  sidebar: {
    collapsed: boolean;
  };
  modal: {
    isOpen: boolean;
    component: string | null;
    props: any;
  };
  theme: 'light' | 'dark';
}

// Data State
interface DataState {
  resources: Resource[];
  loading: boolean;
  error: string | null;
  pagination: Pagination;
}
```

### 5.2 State Actions

```typescript
// Auth Actions
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

// Data Actions
type DataAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Resource[] }
  | { type: 'FETCH_FAILURE'; payload: string }
  | { type: 'ADD_RESOURCE'; payload: Resource }
  | { type: 'UPDATE_RESOURCE'; payload: Resource }
  | { type: 'DELETE_RESOURCE'; payload: string };
```

---

## 6. Configuration

### 6.1 Environment Variables

```bash
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
DATABASE_POOL_SIZE=20

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# External Services
API_KEY={{API_KEY}}
WEBHOOK_URL={{WEBHOOK_URL}}

# Redis
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### 6.2 Configuration Files

```typescript
// config/index.ts
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  database: {
    url: process.env.DATABASE_URL,
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '20'),
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  redis: {
    url: process.env.REDIS_URL,
  },
};
```

---

## 7. Testing Strategy

### 7.1 Test Types

| Type | Coverage Target | Tools | Scope |
|------|----------------|-------|-------|
| Unit Tests | > 80% | Jest | Individual functions |
| Integration Tests | > 70% | Jest + Supertest | API endpoints |
| E2E Tests | Critical paths | Cypress/Playwright | User flows |
| Performance Tests | - | k6/Locust | Load testing |

### 7.2 Test Data

```typescript
// factories/user.factory.ts
export const createUser = (overrides?: Partial<User>): User => ({
  id: uuid(),
  email: faker.internet.email(),
  password: hashSync('password123', 10),
  name: faker.person.fullName(),
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
```

---

## 8. Code Standards

### 8.1 Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Variables | camelCase | `userName` |
| Functions | camelCase | `getUserById` |
| Classes | PascalCase | `UserService` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Files | kebab-case | `user-service.ts` |
| Tables | snake_case | `user_sessions` |

### 8.2 File Structure

```
src/
├── controllers/    # Request handlers
├── services/       # Business logic
├── models/         # Data models
├── routes/         # API routes
├── middleware/      # Express middleware
├── utils/          # Helper functions
├── types/          # TypeScript types
├── config/         # Configuration
└── index.ts        # Entry point
```

---

## 9. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tech Lead | | | |
| Senior Developer | | | |
| DBA | | | |

---

*Document Version: 1.0 | Last Updated: 2026-07-29*

# MoneyLogix - Strategy {{PROJECT_NAME}} Backtesting - Code Implementation Guide

## Document Information
| Field | Value |
|-------|-------|
| Project | MoneyLogix - Strategy {{PROJECT_NAME}} Backtesting |
| Version | 1.0 |
| Date | 2026-07-29 |
| Author | Development Team |
| Status | Draft |

---

## 1. Project Structure

### 1.1 Directory Layout

```
MoneyLogix - Strategy {{PROJECT_NAME}} Backtesting/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
├── docs/
│   ├── api/
│   ├── architecture/
│   └── user-guides/
├── packages/
│   ├── backend/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   ├── agents/
│   │   │   ├── config/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── utils/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/
│       ├── public/
│       ├── src/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── pages/
│       │   ├── services/
│       │   ├── stores/
│       │   ├── styles/
│       │   ├── types/
│       │   ├── utils/
│       │   └── App.tsx
│       ├── package.json
│       └── vite.config.ts
├── scripts/
│   ├── setup.sh
│   └── deploy.sh
├── tests/
│   ├── e2e/
│   └── fixtures/
├── docker-compose.yml
├── package.json
└── README.md
```

### 1.2 Key Files

| File | Purpose | Notes |
|------|---------|-------|
| `package.json` | Root workspace config | npm workspaces |
| `docker-compose.yml` | Local dev environment | PostgreSQL, Redis |
| `.env.example` | Environment variables | Copy to `.env` |
| `tsconfig.json` | TypeScript config | Shared config |

---

## 2. Setup Instructions

### 2.1 Prerequisites

```bash
# Required
node --version  # v18.0.0 or higher
npm --version   # v9.0.0 or higher
docker --version # v20.0.0 or higher

# Optional
nvm use         # Use correct Node version
```

### 2.2 Installation

```bash
# Clone repository
git clone {{REPO_URL}}
cd MoneyLogix - Strategy {{PROJECT_NAME}} Backtesting

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start database
docker-compose up -d

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Start development servers
npm run dev
```

### 2.3 Development Commands

```bash
# Development
npm run dev              # Start all servers
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database
npm run db:reset         # Reset database
npm run db:studio        # Open Prisma Studio

# Testing
npm run test             # Run all tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e         # E2E tests
npm run test:coverage    # Coverage report

# Code Quality
npm run lint             # Lint code
npm run format           # Format code
npm run typecheck        # Type checking

# Build
npm run build            # Build all packages
npm run build:backend    # Build backend
npm run build:frontend   # Build frontend
```

---

## 3. Backend Implementation

### 3.1 Entry Point

```typescript
// packages/backend/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from './config';
import { authenticate } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { setupWebSocket } from './websocket';

// Routes
import authRoutes from './routes/auth';
import resourceRoutes from './routes/resource';

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', authenticate, resourceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// WebSocket
setupWebSocket(server);

// Start server
server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;
```

### 3.2 Service Layer

```typescript
// packages/backend/src/services/resourceService.ts
import { PrismaClient, Resource } from '@prisma/client';
import { ValidationError, NotFoundError } from '../utils/errors';

const prisma = new PrismaClient();

export class ResourceService {
  async findAll(userId: string, options: QueryOptions) {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = options;
    
    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort]: order },
      }),
      prisma.resource.count({ where: { userId } }),
    ]);

    return {
      data: resources,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, userId: string) {
    const resource = await prisma.resource.findFirst({
      where: { id, userId },
    });

    if (!resource) {
      throw new NotFoundError('Resource', id);
    }

    return resource;
  }

  async create(data: CreateResourceDTO, userId: string) {
    // Validate input
    if (!data.name || data.name.length < 3) {
      throw new ValidationError({ name: 'Name must be at least 3 characters' });
    }

    return prisma.resource.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async update(id: string, data: UpdateResourceDTO, userId: string) {
    // Check ownership
    await this.findById(id, userId);

    return prisma.resource.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string) {
    // Check ownership
    await this.findById(id, userId);

    return prisma.resource.delete({
      where: { id },
    });
  }
}
```

### 3.3 Controller Layer

```typescript
// packages/backend/src/controllers/resourceController.ts
import { Request, Response, NextFunction } from 'express';
import { ResourceService } from '../services/resourceService';
import { AuthRequest } from '../types';

const resourceService = new ResourceService();

export const getResources = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, sort, order, search } = req.query;
    const result = await resourceService.findAll(req.userId!, {
      page: Number(page),
      limit: Number(limit),
      sort: sort as string,
      order: order as 'asc' | 'desc',
      search: search as string,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getResource = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const resource = await resourceService.findById(req.params.id, req.userId!);
    res.json(resource);
  } catch (error) {
    next(error);
  }
};

export const createResource = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const resource = await resourceService.create(req.body, req.userId!);
    res.status(201).json(resource);
  } catch (error) {
    next(error);
  }
};

export const updateResource = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const resource = await resourceService.update(
      req.params.id,
      req.body,
      req.userId!
    );
    res.json(resource);
  } catch (error) {
    next(error);
  }
};

export const deleteResource = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await resourceService.delete(req.params.id, req.userId!);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
```

### 3.4 Middleware

```typescript
// packages/backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    
    req.userId = decoded.userId;
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid token'));
  }
};
```

---

## 4. Frontend Implementation

### 4.1 App Entry Point

```typescript
// packages/frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { ToastProvider } from './providers/ToastProvider';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="resources" element={<ResourcesPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
```

### 4.2 State Management (Zustand)

```typescript
// packages/frontend/src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        set({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

### 4.3 API Service

```typescript
// packages/frontend/src/services/api.ts
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 4.4 Custom Hooks

```typescript
// packages/frontend/src/hooks/useResources.ts
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Resource } from '../types';

interface UseResourcesResult {
  resources: Resource[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useResources(): UseResourcesResult {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/resources');
      setResources(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  return { resources, loading, error, refetch: fetchResources };
}
```

---

## 5. Database Implementation

### 5.1 Schema

```prisma
// packages/backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  role      String   @default("user")
  resources Resource[]
  sessions  Session[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

model Session {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@map("sessions")
}

model Resource {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  name        String
  description String?
  status      String   @default("active")
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@map("resources")
}
```

### 5.2 Migrations

```bash
# Create migration
npx prisma migrate dev --name add_resources_table

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset
```

---

## 6. Testing Implementation

### 6.1 Unit Tests

```typescript
// packages/backend/src/__tests__/services/resourceService.test.ts
import { ResourceService } from '../../services/resourceService';
import { prismaMock } from '../mocks/prisma';

describe('ResourceService', () => {
  let service: ResourceService;

  beforeEach(() => {
    service = new ResourceService();
  });

  describe('findAll', () => {
    it('should return paginated resources', async () => {
      const mockResources = [
        { id: '1', name: 'Test', userId: 'user1' },
      ];
      
      prismaMock.resource.findMany.mockResolvedValue(mockResources);
      prismaMock.resource.count.mockResolvedValue(1);

      const result = await service.findAll('user1', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toEqual(mockResources);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('create', () => {
    it('should create a new resource', async () => {
      const mockResource = {
        id: '1',
        name: 'New Resource',
        userId: 'user1',
      };

      prismaMock.resource.create.mockResolvedValue(mockResource);

      const result = await service.create(
        { name: 'New Resource' },
        'user1'
      );

      expect(result).toEqual(mockResource);
    });

    it('should throw error for invalid name', async () => {
      await expect(
        service.create({ name: 'ab' }, 'user1')
      ).rejects.toThrow('Name must be at least 3 characters');
    });
  });
});
```

### 6.2 Integration Tests

```typescript
// packages/backend/src/__tests__/routes/resource.test.ts
import request from 'supertest';
import app from '../../index';
import { createTestUser, getAuthToken } from '../helpers';

describe('Resource Routes', () => {
  let authToken: string;

  beforeEach(async () => {
    const user = await createTestUser();
    authToken = getAuthToken(user.id);
  });

  describe('GET /api/resources', () => {
    it('should return resources for authenticated user', async () => {
      const response = await request(app)
        .get('/api/resources')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/resources')
        .expect(401);
    });
  });
});
```

### 6.3 E2E Tests

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('Invalid credentials');
  });
});
```

---

## 7. Configuration

### 7.1 Environment Variables

```bash
# .env.example
# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/moneylogix

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Redis
REDIS_URL=redis://localhost:6379

# External Services
SARVAM_API_KEY=your-api-key
SARVAM_API_URL=https://api.sarvam.ai/v1
```

### 7.2 TypeScript Config

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

## 8. Code Examples

### 8.1 Complete Feature Example

Here's how to implement a complete feature following our patterns:

1. **Define Types** (`types/resource.ts`)
2. **Create Database Model** (`prisma/schema.prisma`)
3. **Implement Service** (`services/resourceService.ts`)
4. **Create Controller** (`controllers/resourceController.ts`)
5. **Define Routes** (`routes/resource.ts`)
6. **Add Tests** (`__tests__/resource.test.ts`)
7. **Build Frontend** (`pages/ResourcesPage.tsx`)

### 8.2 Key Patterns Used

| Pattern | Usage | Example |
|---------|-------|---------|
| Repository | Data access | `ResourceService` |
| Middleware | Cross-cutting concerns | `authenticate` |
| Factory | Object creation | `createTestUser` |
| Observer | Event handling | WebSocket events |
| Strategy | Algorithm selection | Sorting strategies |

---

## 9. Development Workflow

### 9.1 Git Workflow

```bash
# Create feature branch
git checkout -b feature/add-resource-api

# Make changes
git add .
git commit -m "feat: add resource CRUD API"

# Push and create PR
git push origin feature/add-resource-api

# After review, merge
git merge main
```

### 9.2 Commit Convention

```
<type>(<scope>): <subject>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

Example:
feat(resources): add CRUD endpoints for resource management
```

---

## 10. Troubleshooting

### 10.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Database connection refused | Docker not running | `docker-compose up -d` |
| Port already in use | Another process | Kill process or change port |
| TypeScript errors | Type mismatches | Run `npm run typecheck` |
| Test failures | Environment issues | Reset database, check mocks |

### 10.2 Debug Mode

```bash
# Backend debugging
DEBUG=app:* npm run dev:backend

# Frontend debugging
VITE_DEBUG=true npm run dev:frontend

# Database queries
DATABASE_LOGGING=true npm run dev:backend
```

---

*Document Version: 1.0 | Last Updated: 2026-07-29*

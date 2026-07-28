# {{PROJECT_NAME}} - Code Review Guide

## Document Information
| Field | Value |
|-------|-------|
| Project | {{PROJECT_NAME}} |
| Version | 1.0 |
| Date | {{DATE}} |
| Author | {{AUTHOR}} |
| Status | Draft |

---

## 1. Code Review Philosophy

### 1.1 Goals
- Catch bugs before they reach production
- Ensure code quality and consistency
- Share knowledge across the team
- Improve maintainability
- Mentor junior developers

### 1.2 Principles
1. **Be Kind**: Review code, not people
2. **Be Specific**: Provide actionable feedback
3. **Be Constructive**: Suggest improvements
4. **Be Timely**: Review within 24 hours
5. **Be Educational**: Explain why, not just what

---

## 2. Review Checklist

### 2.1 General Code Quality

- [ ] **Readability**: Code is easy to understand
- [ ] **Simplicity**: No unnecessary complexity
- [ ] **DRY**: No duplicate code
- [ ] **Single Responsibility**: Each function does one thing
- [ ] **Naming**: Clear, descriptive names
- [ ] **Comments**: Complex logic is documented
- [ ] **No Magic Numbers**: Constants are named

### 2.2 Function & Method Review

```typescript
// ❌ Bad: Too many parameters, unclear purpose
function processUser(id, name, email, age, role, status, createdAt) {
  // ...
}

// ✅ Good: Clear parameters, single purpose
interface CreateUserDTO {
  name: string;
  email: string;
  age: number;
  role: UserRole;
}

async function createUser(dto: CreateUserDTO): Promise<User> {
  // ...
}
```

**Checklist:**
- [ ] Function name describes what it does
- [ ] Parameters are necessary and typed
- [ ] Function does one thing
- [ ] No side effects (unless expected)
- [ ] Error handling is present
- [ ] Return type is clear

### 2.3 TypeScript Specific

- [ ] **Strict Mode**: Enabled in tsconfig
- [ ] **No `any`**: Proper types used
- [ ] **Interfaces**: Defined for data structures
- [ ] **Enums**: Used for constants
- [ ] **Generics**: Used appropriately
- [ ] **Null Checks**: Handled properly

```typescript
// ❌ Bad
function getData(id: any): any {
  return fetch(`/api/data/${id}`);
}

// ✅ Good
async function getData(id: string): Promise<Resource> {
  const response = await fetch(`/api/data/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch resource: ${id}`);
  }
  return response.json();
}
```

### 2.4 Error Handling

- [ ] **Try/Catch**: Used for async operations
- [ ] **Error Types**: Custom errors defined
- [ ] **User Messages**: Friendly error messages
- [ ] **Logging**: Errors are logged
- [ ] **Cleanup**: Resources are cleaned up

```typescript
// ❌ Bad
async function fetchData() {
  const data = await api.get('/data');
  return data;
}

// ✅ Good
async function fetchData(): Promise<Data[]> {
  try {
    const { data } = await api.get('/data');
    return data;
  } catch (error) {
    logger.error('Failed to fetch data', { error });
    throw new AppError(500, 'Failed to fetch data');
  }
}
```

### 2.5 Security Review

- [ ] **Input Validation**: All inputs validated
- [ ] **SQL Injection**: Parameterized queries used
- [ ] **XSS**: Output is escaped
- [ ] **Authentication**: Checked on protected routes
- [ ] **Authorization**: User permissions verified
- [ ] **Secrets**: Not in code or logs
- [ ] **Rate Limiting**: Applied to APIs

```typescript
// ❌ Bad: SQL Injection vulnerability
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// ✅ Good: Parameterized query
const user = await prisma.user.findUnique({
  where: { id: userId },
});
```

### 2.6 Performance

- [ ] **N+1 Queries**: Avoided
- [ ] **Caching**: Applied where appropriate
- [ ] **Lazy Loading**: Implemented for heavy resources
- [ ] **Pagination**: Used for lists
- [ ] **Indexing**: Database queries are indexed
- [ ] **Bundle Size**: No unnecessary imports

```typescript
// ❌ Bad: N+1 query
const users = await prisma.user.findMany();
for (const user of users) {
  user.resources = await prisma.resource.findMany({
    where: { userId: user.id },
  });
}

// ✅ Good: Included relations
const users = await prisma.user.findMany({
  include: { resources: true },
});
```

### 2.7 Testing

- [ ] **Unit Tests**: Functions have tests
- [ ] **Integration Tests**: API endpoints tested
- [ ] **Edge Cases**: Boundary conditions tested
- [ ] **Error Cases**: Failure scenarios tested
- [ ] **Mocks**: External dependencies mocked
- [ ] **Coverage**: > 80% coverage

```typescript
// ❌ Bad: No error case tested
it('should create user', async () => {
  const user = await createUser({ name: 'Test' });
  expect(user).toBeDefined();
});

// ✅ Good: Both success and error cases
it('should create user', async () => {
  const user = await createUser({ name: 'Test' });
  expect(user).toBeDefined();
  expect(user.name).toBe('Test');
});

it('should throw error for invalid email', async () => {
  await expect(
    createUser({ name: 'Test', email: 'invalid' })
  ).rejects.toThrow('Invalid email');
});
```

---

## 3. Code Style Guide

### 3.1 Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Variables | camelCase | `userName`, `isActive` |
| Functions | camelCase | `getUserById`, `createResource` |
| Classes | PascalCase | `UserService`, `AuthController` |
| Interfaces | PascalCase | `UserDTO`, `ApiResponse` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_URL` |
| Files | kebab-case | `user-service.ts`, `auth.controller.ts` |
| Directories | kebab-case | `auth/`, `user-management/` |
| Database | snake_case | `user_sessions`, `created_at` |

### 3.2 File Organization

```typescript
// 1. Imports (grouped and sorted)
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';

// 2. Class/Function declaration
@Injectable()
export class UserService {
  // 3. Private members
  private readonly logger = new Logger(UserService.name);

  // 4. Constructor
  constructor(private prisma: PrismaService) {}

  // 5. Public methods
  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  // 6. Private methods
  private validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
```

### 3.3 Formatting

```typescript
// Indentation: 2 spaces
if (condition) {
  doSomething();
}

// Semicolons: Always
const x = 10;

// Quotes: Single quotes
const name = 'John';

// Trailing commas: Yes
const config = {
  host: 'localhost',
  port: 3000,  // <-- trailing comma
};

// Line length: 100 characters max
// Break long lines
const veryLongVariableName = someFunction(
  parameterOne,
  parameterTwo,
  parameterThree
);
```

---

## 4. Review Process

### 4.1 Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated

## Screenshots (if applicable)
[Add screenshots here]
```

### 4.2 Review Steps

1. **Automated Checks**
   - CI/CD pipeline passes
   - No linting errors
   - Tests pass
   - Coverage meets threshold

2. **Code Review**
   - Read the PR description
   - Understand the context
   - Review code changes
   - Check tests
   - Leave comments

3. **Discussion**
   - Address feedback
   - Make requested changes
   - Re-review if needed

4. **Approval**
   - At least 1 approval required
   - All conversations resolved
   - CI/CD passes

### 4.3 Review Comments

**Severity Levels:**

| Level | Icon | Usage |
|-------|------|-------|
| Critical | 🔴 | Must fix before merge |
| Warning | 🟡 | Should fix |
| Suggestion | 🟢 | Consider improving |
| Nitpick | ⚪ | Optional improvement |

**Comment Format:**
```
[Severity] Category: Description

Suggestion: How to fix
Reference: Link to docs/pattern
```

**Examples:**
```
🔴 Security: SQL injection vulnerability
Suggestion: Use parameterized queries
Reference: https://owasp.org/sql-injection

🟡 Performance: N+1 query detected
Suggestion: Use include to fetch related data

🟢 Style: Consider extracting this to a constant
Suggestion: const MAX_RETRIES = 3;

⚪ Nitpick: Missing trailing comma
```

---

## 5. Quality Gates

### 5.1 Automated Gates (Must Pass)

| Gate | Tool | Threshold | Action |
|------|------|-----------|--------|
| Linting | ESLint | 0 errors | Block merge |
| Formatting | Prettier | Formatted | Auto-fix |
| Type Check | TypeScript | 0 errors | Block merge |
| Unit Tests | Jest | > 80% pass | Block merge |
| Integration | Jest | > 70% pass | Block merge |
| Coverage | Istanbul | > 80% | Block merge |

### 5.2 Manual Gates (Reviewer Checks)

| Gate | Check | Requirement |
|------|-------|-------------|
| Code Quality | Readability | Clear and maintainable |
| Architecture | Patterns | Follows established patterns |
| Security | Vulnerabilities | No security issues |
| Performance | Optimization | No performance regressions |
| Documentation | Updates | Relevant docs updated |

### 5.3 Merge Requirements

```
✅ All automated gates pass
✅ At least 1 approval
✅ All conversations resolved
✅ No merge conflicts
✅ Branch is up to date with main
```

---

## 6. Common Issues & Solutions

### 6.1 Backend Issues

| Issue | Example | Solution |
|-------|---------|----------|
| N+1 Queries | Loop with DB calls | Use `include` or batch |
| Missing Error Handling | Unhandled promises | Add try/catch |
| Hardcoded Values | Magic numbers | Extract to constants |
| No Validation | Unvalidated input | Add validation layer |
| Secret in Code | API key in source | Use environment variables |

### 6.2 Frontend Issues

| Issue | Example | Solution |
|-------|---------|----------|
| Prop Drilling | Passing through many levels | Use Context or state management |
| Unnecessary Re-renders | Missing memoization | Use React.memo, useMemo |
| Missing Keys | Lists without keys | Add unique key prop |
| Direct DOM Manipulation | document.getElementById | Use React refs |
| Inline Functions | Functions in JSX | Extract to variables |

### 6.3 TypeScript Issues

| Issue | Example | Solution |
|-------|---------|----------|
| Using `any` | `function(x: any)` | Define proper type |
| Missing Types | Untyped variables | Add type annotations |
| Loose Types | `string \| undefined` | Use strict null checks |
| Wrong Types | Incorrect type usage | Fix type definition |

---

## 7. Review Metrics

### 7.1 Key Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Review Time | < 4 hours | Average time to first review |
| Time to Merge | < 24 hours | PR open to merge |
| Comments per PR | 3-5 | Average feedback |
| Defect Escape Rate | < 5% | Bugs found in production |
| Code Coverage | > 80% | Test coverage |

### 7.2 Tracking

```yaml
# .github/workflows/review-metrics.yml
name: Review Metrics
on:
  pull_request:
    types: [closed]

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - name: Calculate Metrics
        run: |
          echo "PR #${{ github.event.pull_request.number }}"
          echo "Review time: ${{ steps.review_time.outputs.duration }}"
```

---

## 8. Tools & Extensions

### 8.1 Recommended VS Code Extensions

| Extension | Purpose |
|-----------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| GitLens | Git integration |
| SonarLint | Code quality |
| Error Lens | Inline errors |

### 8.2 Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

---

## 9. Review Checklist Template

Copy this for each PR:

```markdown
## Code Review Checklist

### General
- [ ] Code is readable and maintainable
- [ ] No duplicate code
- [ ] Functions are single-purpose
- [ ] Naming is clear and descriptive

### TypeScript
- [ ] No `any` types
- [ ] Interfaces defined for data structures
- [ ] Strict null checks enabled
- [ ] No type assertions unless necessary

### Error Handling
- [ ] Try/catch for async operations
- [ ] Custom error classes used
- [ ] User-friendly error messages
- [ ] Errors are logged

### Security
- [ ] Input validated
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] Authentication checked
- [ ] Authorization verified
- [ ] No secrets in code

### Performance
- [ ] No N+1 queries
- [ ] Caching applied where needed
- [ ] Pagination for lists
- [ ] Database queries indexed

### Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Edge cases tested
- [ ] Error cases tested
- [ ] Coverage > 80%

### Documentation
- [ ] Code comments for complex logic
- [ ] API docs updated
- [ ] README updated if needed
- [ ] Changelog updated if needed
```

---

## 10. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tech Lead | | | |
| Senior Developer | | | |

---

*Document Version: 1.0 | Last Updated: {{DATE}}*

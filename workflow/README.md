# Project Development Workflow

A complete **8-stage software development lifecycle workflow** that generates detailed Markdown documentation from a single project input file. This workflow guides you through every phase of building software — from gathering requirements to shipping a production-ready application.

---

## What This Workflow Does

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PROJECT WORKFLOW PIPELINE                       │
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   INPUT     │───▶│  PROCESS    │───▶│   OUTPUT    │             │
│  │   (JSON)    │    │  (8 Stages) │    │   (9 MDs)   │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                                                     │
│  Stage 0: Project Brief (auto-generated)                           │
│  Stage 1: Requirement Analysis                                     │
│  Stage 2: PRD (Product Requirements Document)                      │
│  Stage 3: High Level Design                                        │
│  Stage 4: Low Level Design                                         │
│  Stage 5: Implementation Plan                                      │
│  Stage 6: Code Implementation Guide                                │
│  Stage 7: Code Review Guide                                        │
│  Stage 8: QA & Testing Guide                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Total Output**: ~130KB of detailed, professional documentation covering the complete SDLC.

---

## Quick Start

### 1. Fill in Project Details

Edit `project-input.json` with your project's basic details:

```json
{
  "projectName": "Your Project Name",
  "projectType": "Web App / Mobile App / API / CLI Tool",
  "description": "What your project does in 1-2 sentences",
  "targetUsers": ["User type 1", "User type 2"],
  "techStack": {
    "frontend": ["React", "TypeScript"],
    "backend": ["Node.js", "Express"],
    "database": ["PostgreSQL"],
    "ai": ["OpenAI"]
  },
  "coreFeatures": [
    "Feature 1: User authentication",
    "Feature 2: Dashboard with analytics",
    "Feature 3: Real-time notifications"
  ],
  "constraints": {
    "timeline": "2 weeks",
    "teamSize": "3 developers",
    "budget": "$5000"
  },
  "nonFunctionalRequirements": {
    "performance": "Page load < 2s",
    "scalability": "100 concurrent users",
    "security": "JWT auth, input validation",
    "availability": "99.9% uptime"
  }
}
```

### 2. Run the Workflow

```bash
# Navigate to workflow directory
cd workflow

# Make run.sh executable (first time only)
chmod +x run.sh

# Generate all stages (interactive - reviews each step)
./run.sh

# Generate a specific stage only
./run.sh stage 3

# Generate stages 2-5 only
./run.sh range 2 5
```

### 3. Review Generated Files

Output is stored in `output/` folder:

```
output/
├── 00-project-brief.md          # Auto-generated project summary
├── 01-requirement-analysis.md   # Functional & non-functional requirements
├── 02-prd.md                    # Product Requirements Document
├── 03-high-level-design.md      # Architecture & system design
├── 04-low-level-design.md       # API specs, DB schema, components
├── 05-implementation-plan.md    # Sprint plan & milestones
├── 06-code-implementation.md    # Code structure & patterns
├── 07-code-review.md            # Review checklist & standards
└── 08-qa-testing.md             # Test plan & test cases
```

---

## Interactive Mode (Default)

When you run `./run.sh`, the workflow runs **interactively**:

```
╔══════════════════════════════════════════════════════════════╗
║              PROJECT WORKFLOW ORCHESTRATOR                    ║
╚══════════════════════════════════════════════════════════════╝

✓ Input file validated
ℹ Project: MoneyLogix
ℹ Type: Full-Stack Web Application
ℹ Timeline: 48 hours (hackathon)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stage 0: Project Brief
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Generated: 00-project-brief.md

──────────────────────────────────────────────────────────────
📄 Please review: output/00-project-brief.md
   Open in your editor or run: cat output/00-project-brief.md
──────────────────────────────────────────────────────────────
Press [Enter] to continue to next stage, [q] to quit...
```

**Key Features:**
- Pauses after each stage for you to review the generated file
- Press **Enter** to continue to the next stage
- Press **q** to quit and review later
- Shows file path so you can open it in your editor

---

## Workflow Stages (Detailed)

### Stage 0: Project Brief
**File**: `00-project-brief.md` | **Generated**: Automatically

Auto-generated from `project-input.json`. Provides a quick overview of the entire project including tech stack, features, constraints, and non-functional requirements.

---

### Stage 1: Requirement Analysis
**File**: `01-requirement-analysis.md` | **Estimated Review**: 10 minutes

| Section | What It Covers |
|---------|---------------|
| Executive Summary | Project overview and objectives |
| User Personas | Who will use the system |
| Functional Requirements | What the system must do (FR-001, FR-002, etc.) |
| Non-Functional Requirements | Performance, security, scalability |
| System Requirements | Infrastructure and dependencies |
| Use Cases | Primary interaction flows |
| Constraints & Assumptions | What we're working within |
| Risks & Mitigations | What could go wrong |

**What to Review:**
- [ ] Are all user personas accurate?
- [ ] Are functional requirements complete?
- [ ] Are non-functional requirements realistic?
- [ ] Are all constraints documented?

---

### Stage 2: PRD (Product Requirements Document)
**File**: `02-prd.md` | **Estimated Review**: 15 minutes

| Section | What It Covers |
|---------|---------------|
| Product Vision & Mission | What we're building and why |
| Problem Statement | Current pain points and opportunity |
| Goals & Objectives | Business, product, and technical goals |
| User Stories | As a [user], I want [feature] so that [benefit] |
| Feature Specifications | Detailed feature descriptions with wireframes |
| Feature Prioritization | MoSCoW analysis (Must/Should/Could/Won't) |
| Success Metrics | KPIs and how we measure success |
| Release Plan | When features ship |
| Competitive Analysis | How we compare to competitors |

**What to Review:**
- [ ] Are user stories complete with acceptance criteria?
- [ ] Is feature prioritization correct (MoSCoW)?
- [ ] Are success metrics measurable?
- [ ] Is the release plan realistic?

---

### Stage 3: High Level Design
**File**: `03-high-level-design.md` | **Estimated Review**: 20 minutes

| Section | What It Covers |
|---------|---------------|
| Architecture Overview | Design principles and style |
| System Architecture | Component diagram with all layers |
| Technology Stack | Frontend, backend, database, DevOps choices |
| Data Flow | Request flow, real-time updates, auth flow |
| Integration Points | External services and APIs |
| Security Architecture | Auth, data protection, compliance |
| Deployment Architecture | Cloud setup, environments, CI/CD |
| Scalability & Performance | Scaling strategy and caching |
| Disaster Recovery | Backup and recovery procedures |
| Monitoring & Observability | Tools and alerting rules |

**What to Review:**
- [ ] Is the architecture appropriate for the project?
- [ ] Are all technology choices justified?
- [ ] Are security concerns addressed?
- [ ] Is the deployment strategy clear?

---

### Stage 4: Low Level Design
**File**: `04-low-level-design.md` | **Estimated Review**: 25 minutes

| Section | What It Covers |
|---------|---------------|
| API Specification | All endpoints with request/response schemas |
| Database Schema | Tables, relationships, indexes, constraints |
| Component Architecture | Frontend component tree |
| Error Handling | Custom errors, error codes, response format |
| State Management | Frontend state structure and actions |
| Configuration | Environment variables and config files |
| Testing Strategy | Test types, coverage targets, test data |
| Code Standards | Naming conventions and file structure |

**What to Review:**
- [ ] Are all API endpoints documented?
- [ ] Is the database schema complete?
- [ ] Are error handling patterns clear?
- [ ] Are code standards defined?

---

### Stage 5: Implementation Plan
**File**: `05-implementation-plan.md` | **Estimated Review**: 15 minutes

| Section | What It Covers |
|---------|---------------|
| Sprint Breakdown | Week-by-week task assignments |
| Task Dependencies | What blocks what |
| Milestone Timeline | Key delivery dates |
| Resource Allocation | Who works on what |
| Dependencies & Blockers | External dependencies and known blockers |
| Risk Management | Risk register and contingency plans |
| Quality Gates | Sprint exit criteria and release criteria |
| Communication Plan | Meeting schedule and reporting |

**What to Review:**
- [ ] Are sprint estimates realistic?
- [ ] Are task dependencies correct?
- [ ] Are risks identified with mitigations?
- [ ] Are quality gates achievable?

---

### Stage 6: Code Implementation Guide
**File**: `06-code-implementation.md` | **Estimated Review**: 20 minutes

| Section | What It Covers |
|---------|---------------|
| Project Structure | Directory layout and key files |
| Setup Instructions | Prerequisites, installation, commands |
| Backend Implementation | Entry point, services, controllers, middleware |
| Frontend Implementation | App structure, state management, API service, hooks |
| Database Implementation | Schema, migrations, seeders |
| Testing Implementation | Unit, integration, E2E test examples |
| Configuration | Environment variables, TypeScript config |
| Code Examples | Complete feature implementation walkthrough |
| Development Workflow | Git workflow, commit conventions |

**What to Review:**
- [ ] Is the project structure clear?
- [ ] Are setup instructions complete?
- [ ] Are code patterns appropriate?
- [ ] Are examples relevant to your project?

---

### Stage 7: Code Review Guide
**File**: `07-code-review.md` | **Estimated Review**: 15 minutes

| Section | What It Covers |
|---------|---------------|
| Code Review Philosophy | Goals and principles |
| Review Checklist | General, TypeScript, security, performance, testing |
| Code Style Guide | Naming, formatting, file organization |
| Review Process | PR template, review steps, comment format |
| Quality Gates | Automated and manual gates |
| Common Issues | Backend, frontend, TypeScript issues & solutions |
| Review Metrics | Key metrics and tracking |
| Tools & Extensions | Recommended VS Code extensions, pre-commit hooks |

**What to Review:**
- [ ] Is the checklist comprehensive?
- [ ] Are code standards clearly defined?
- [ ] Are quality gates appropriate?
- [ ] Are tools recommended?

---

### Stage 8: QA & Testing Guide
**File**: `08-qa-testing.md` | **Estimated Review**: 20 minutes

| Section | What It Covers |
|---------|---------------|
| Test Strategy | Testing pyramid and objectives |
| Unit Testing | Framework setup, service/controller/utility tests |
| Integration Testing | API endpoint tests, database tests |
| E2E Testing | Playwright setup, auth/CRUD flow tests |
| Performance Testing | Load testing with k6, API benchmarks |
| Security Testing | SQL injection, XSS, CSRF, rate limiting tests |
| Test Data Management | Fixtures, helpers, cleanup |
| Bug Reporting | Bug report template, severity levels |
| Test Coverage | Coverage configuration and reports |
| Release Checklist | Pre-release, testing, deployment checklists |

**What to Review:**
- [ ] Is the test strategy appropriate?
- [ ] Are test cases comprehensive?
- [ ] Are security tests included?
- [ ] Is the release checklist complete?

---

## Command Reference

```bash
# Generate all stages (interactive mode)
./run.sh

# Generate all stages (non-interactive, no pause)
./run.sh --non-interactive

# Generate specific stage only
./run.sh stage <number>

# Generate range of stages
./run.sh range <min> <max>

# List all available stages
./run.sh list

# Clean output directory
./run.sh clean

# Show help
./run.sh help
```

---

## Customization

### Adding New Stages

1. Create `stages/XX-stage-name.md` template
2. Add generation function to `run.sh`
3. Update the stage table in this README

### Modifying Templates

Each stage file in `stages/` is a Markdown template with placeholders:

| Placeholder | Description | Source |
|-------------|-------------|--------|
| `{{PROJECT_NAME}}` | Project name | `project-input.json` |
| `{{PROJECT_TYPE}}` | Project type | `project-input.json` |
| `{{DESCRIPTION}}` | Project description | `project-input.json` |
| `{{DATE}}` | Current date | Auto-generated |
| `{{AUTHOR}}` | Author name | `project-input.json` |
| `{{TIMELINE}}` | Project timeline | `project-input.json` |
| `{{TEAM_SIZE}}` | Team size | `project-input.json` |
| `{{TARGET_USERS}}` | Target users | `project-input.json` |

### Integration with AI

The workflow is designed to work with AI assistants. Each stage generates a template that can be:
1. **Auto-filled** by AI based on project context
2. **Reviewed and refined** by humans
3. **Used as input** for the next stage

---

## Output File Sizes (Typical)

| File | Size | Sections |
|------|------|----------|
| 00-project-brief.md | ~2 KB | 5 sections |
| 01-requirement-analysis.md | ~10 KB | 10 sections |
| 02-prd.md | ~9 KB | 11 sections |
| 03-high-level-design.md | ~22 KB | 13 sections |
| 04-low-level-design.md | ~17 KB | 9 sections |
| 05-implementation-plan.md | ~13 KB | 10 sections |
| 06-code-implementation.md | ~21 KB | 10 sections |
| 07-code-review.md | ~13 KB | 10 sections |
| 08-qa-testing.md | ~22 KB | 11 sections |
| **Total** | **~130 KB** | **89 sections** |

---

## Tips for Best Results

1. **Be Specific in Input**: The more detail in `project-input.json`, the better the output
2. **Review Each Stage**: Don't skip the review step — each stage builds on the previous
3. **Customize Templates**: Modify stage templates to match your team's conventions
4. **Use with AI**: Feed generated docs to an AI assistant to fill in project-specific details
5. **Version Control**: Commit generated docs to track project evolution

---

## Requirements

- **bash** (4.0+)
- **jq** (JSON processor) — install with `brew install jq`
- **sed** (stream editor) — included on macOS/Linux

---

## License

MIT

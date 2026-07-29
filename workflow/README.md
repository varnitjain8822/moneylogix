# Agentic SDLC Project Development Workflow v3

A **multi-agent SDLC orchestration system** that takes project descriptions (JSON, PDF, or plain text), **decomposes them into logical components**, and generates complete **PRD, HLD, LLD, and 5 other stage documents** using an autonomous agentic loop per component. It features iterative refinement, QA gates, dependency validation, memory inheritance, and checkpointing.

---

## What This Workflow Does

Instead of a simple linear document generator, this workflow uses a sophisticated agentic loop:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        AGENTIC WORKFLOW PIPELINE                        │
│                                                                         │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────────────────┐         │
│  │  INPUT   │──▶│  DECOMPOSE   │──▶│  PER-COMPONENT STAGES   │         │
│  │ JSON/PDF │   │  (AI/Heuristic) │  ┌─────────────────────┐│         │
│  │ TXT      │   │  → Component A │  │  Load Context       ││         │
│  └──────────┘   │  → Component B │  │        ↓            ││         │
│                 │                │  │  Generate Draft     ││         │
│                 └──────────────┘   │        ↓            ││         │
│                                    │  AI Critic Review    ││         │
│                                    │        ↓            ││         │
│                                    │  Quality Score      ││         │
│                                    │        ↓            ││         │
│                                    │  Validate & Save     ││         │
│                                    │        ↓            ││         │
│                                    │  Human Approval      ││         │
│                                    │        ↓            ││         │
│                                    │  Next Stage          ││         │
│                                    └─────────────────────┘│         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Features

- **Agentic Generation Loop**: Assigns specialized roles (Planner, Architect, Tech Writer) to generate each stage.
- **AI Critic & Quality Gates**: Every stage receives a Quality Score (Completeness, Consistency, Tech Depth).
- **Memory Inheritance**: Tracks decisions from previous stages in a knowledge base to ensure consistency.
- **Rich Human-in-the-Loop Menu**: Options to Continue, Regenerate, Edit Prompt, Compare, Go Back, Skip, or Exit.
- **Checkpointing**: Exit anytime and resume your workflow exactly where you left off.

**Total Output**: ~1.2MB across 73+ files (9 documents × 8+ components + INDEX).

---

## Quick Start

### 1. Provide Project Input

**Option A: JSON (existing format)**
```bash
# Edit project-input.json with your project details
./run.sh                           # Auto-detect components from JSON
```

**Option B: PDF file**
```bash
./run.sh --input specification.pdf  # Extract text → detect components
```

**Option C: Plain text file**
```bash
./run.sh --input requirements.txt   # Convert to structured JSON → detect components
```

### 2. Run the Workflow

```bash
# Full pipeline: detect components, generate all docs
./run.sh

# Non-interactive mode (no review pauses)
./run.sh --non-interactive

# Generate single stage only (main project)
./run.sh stage 3

# Generate range of stages
./run.sh range 2 5
```

### 3. Review Generated Files

```text
output/
├── 00-project-brief.md          # System overview (aggregated)
├── INDEX.md                     # Cross-component index
├── components/
│   ├── auth-and-user-management/       # Complete SDLC docs for Auth
│   │   ├── 00-project-brief.md
│   │   ├── 01-requirement-analysis.md
│   │   ├── 02-prd.md
│   │   ├── 03-high-level-design.md
│   │   ├── 04-low-level-design.md
│   │   ├── 05-implementation-plan.md
│   │   ├── 06-code-implementation.md
│   │   ├── 07-code-review.md
│   │   └── 08-qa-testing.md
│   ├── ai-ml-module/                   # SDLC docs for AI/ML
│   ├── market-data-module/             # SDLC docs for Market Data
│   ├── paper-trading-engine/           # SDLC docs for Paper Trading
│   ├── portfolio-and-wallet/           # SDLC docs for Portfolio
│   ├── real-time-services/             # SDLC docs for Real-time
│   └── strategy-and-backtesting/       # SDLC docs for Strategy
```

---

## How Component Decomposition Works

### For JSON Input
The workflow uses **AI-powered pattern matching** (via Python) to scan the project description, feature list, and raw content for component indicators:

- Keywords like `backend`, `frontend`, `database`, `auth`, `AI`, `analytics`
- Section headers in markdown content
- Feature groupings by domain

If auto-detection fails, the script falls back to **interactive manual definition** where you specify component names.

### For PDF / Text Input
1. **PDF**: Extracted via `pdftotext` (poppler) or Python (PyMuPDF/pdfminer)
2. **Text**: Converted to structured JSON via heuristics
3. Same AI decomposition pipeline then identifies components

### Supported Output Formats per Component
Each component gets **9 files** covering the full SDLC:

| # | Document | Purpose |
|---|----------|---------|
| 0 | Project Brief | Component overview, features, constraints |
| 1 | Requirement Analysis | FR/NFR, personas, use cases, risks |
| 2 | PRD | Vision, user stories, feature specs, KPIs |
| 3 | High Level Design | Architecture, tech stack, data flow, security |
| 4 | Low Level Design | API specs, DB schema, component tree, state mgmt |
| 5 | Implementation Plan | Sprints, milestones, tasks, resource allocation |
| 6 | Code Implementation | Structure, setup, patterns, examples |
| 7 | Code Review | Checklist, standards, quality gates |
| 8 | QA & Testing | Strategy, test cases, performance, coverage |

---

## Command Reference

```bash
# Full workflow (auto-detect components, generate all stages)
./run.sh

# With custom input
./run.sh --input project.pdf
./run.sh --input spec.txt
./run.sh --input project.json

# Non-interactive (no review pauses)
./run.sh --non-interactive

# Single stage for main project
./run.sh stage <0-8>

# Range of stages
./run.sh range <min> <max>

# List stages
./run.sh list

# Clean output
./run.sh clean

# Help
./run.sh help
```

---

## Requirements

- **bash** (4.0+)
- **jq** (JSON processor) — `brew install jq`
- **python3** — for AI component decomposition
- **Optional**: `pdftotext` (poppler) for PDF support — `brew install poppler`
- **Optional**: `PyMuPDF` / `pdfminer` for Python-based PDF extraction — `pip install PyMuPDF`

---

## Customization

### Adding New Stage Templates
1. Create `stages/XX-stage-name.md` with `{{PLACEHOLDER}}` variables
2. The existing pipeline automatically picks up new templates

### Modifying Component Detection
Edit the `component_patterns` array in the Python `decompose_components()` function inside `run.sh` to add or change detection patterns.

### Input Schema (`project-input.json`)
```json
{
  "projectName": "MyApp",
  "projectType": "Web Application",
  "description": "Full project description",
  "targetUsers": ["User type 1"],
  "techStack": { "frontend": ["React"] },
  "coreFeatures": ["Feature 1", "Feature 2"],
  "constraints": { "timeline": "4 weeks" },
  "nonFunctionalRequirements": { "performance": "< 2s load" }
}
```

---

## License

MIT

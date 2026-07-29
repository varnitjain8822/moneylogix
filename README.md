# MoneyLogix - Smart Trading Platform

A comprehensive trading platform with AI-powered features for the Indian stock market.

## Features

### 1. Real-time Watchlist & Price Alerts
- WebSocket-based live price streaming
- Multiple watchlists with custom symbols
- Configurable price/percentage alerts

### 2. Portfolio Analytics Dashboard
- Holdings with P&L attribution
- Sector/asset-class allocation charts
- Performance metrics (XIRR, CAGR)

### 3. Position Doctor
- Live position health monitoring
- Prescriptive action cards
- Health score visualization

### 4. Trade Analyzer
- Window-based trading stats
- Behavior detection (overtrading, etc.)
- Performance comparison

### 5. Strategy Builder
- Risk-appetite recommendations
- Strategy creation and management
- Payoff visualization

### 6. AI Investment Advisor
- Empathetic conversational AI
- Risk profiling through dialogue
- Personalized suggestions

### 7. AI Research Assistant
- RAG-powered stock Q&A
- Fundamentals and news grounding
- Source citations

### 8. News & Sentiment Aggregator
- Multi-source news ingestion
- Sentiment scoring
- Per-stock news feeds

### 9. Paper Trading
- Virtual wallet with ₹10,00,000
- Real-time price simulation
- Order execution

### 10. Backtesting Sandbox
- Strategy performance testing
- Historical data simulation
- Equity curve visualization

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Real-time**: Socket.IO
- **AI**: OpenAI GPT-4

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd moneylogix
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp packages/backend/.env.example packages/backend/.env
# Edit .env with your database credentials
```

4. Set up the database:
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Demo Account
- Email: demo@moneylogix.com
- Password: password123

## Project Structure

```
moneylogix/
├── packages/
│   ├── backend/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       ├── config/
│   │       ├── middleware/
│   │       ├── routes/
│   │       ├── services/
│   │       ├── websocket/
│   │       └── index.ts
│   └── frontend/
│       └── src/
│           ├── components/
│           ├── pages/
│           ├── services/
│           ├── stores/
│           └── types/
└── package.json
```

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login

### Watchlists
- GET /api/watchlists
- POST /api/watchlists
- POST /api/watchlists/:id/symbols
- DELETE /api/watchlists/:id/symbols/:symbol

### Portfolio
- GET /api/portfolios
- POST /api/portfolios
- GET /api/portfolios/analytics

### Trades
- POST /api/trades/execute
- GET /api/trades/history
- GET /api/trades/analytics

### Position Doctor
- GET /api/position-doctor/positions
- GET /api/position-doctor/summary

### Strategies
- GET /api/strategies
- POST /api/strategies
- GET /api/strategies/recommendations

### AI Advisor
- POST /api/ai/sessions
- POST /api/ai/sessions/:sessionId/messages

### News
- GET /api/news
- GET /api/news/sentiment

### Backtesting
- POST /api/backtest/run
- GET /api/backtest/strategy/:strategyId

## Design System (Web-Design Skill)

This project uses the **web-design skill** for consistent, premium UI/UX design.

### Skill Location
```
skills/web-design/
├── SKILL.md              # Skill instructions
├── references/           # Design systems, style seeds, motion library
│   ├── design-md-template.md
│   ├── interaction-patterns.md
│   ├── motion-library.md
│   ├── quality-checklist.md
│   ├── scene-defaults.md
│   ├── scroll-story-patterns.md
│   ├── style-seeds.md
│   ├── text-decoration-rules.md
│   └── design-systems/   # 58 brand design systems
└── scripts/              # Playwright crawler, token extractor
```

### DESIGN.md
The project's design specification is at `/DESIGN.md`. It defines:
- **Visual Theme**: Dark Tech / Fintech Glassmorphism
- **Color Palette**: Deep space backgrounds with electric cyan + violet accents
- **Typography**: Space Grotesk (headings), Inter (body), JetBrains Mono (data)
- **Components**: Buttons, cards, navigation, badges with all states
- **Motion**: L2 interaction tier with scroll reveals and hover effects
- **Responsive**: Desktop (1400px), tablet (768px), mobile (480px)

### Style Seed
Based on **Style Seed #2: Dark Tech** — deep, neon, futuristic, data-driven, precise.

### Usage
1. All colors use CSS variables defined in `DESIGN.md`
2. Components follow the styling patterns in Section 4
3. Animations use the L2 interaction tier from Section 7
4. Responsive breakpoints follow Section 9

### Quality Checklist
Before any UI change, verify against `skills/web-design/references/quality-checklist.md`:
- [ ] Colors via CSS variables, no hardcoded hex
- [ ] Fonts match DESIGN.md
- [ ] All interactive elements have hover + focus states
- [ ] Entrance animations implemented
- [ ] Responsive at mobile + desktop
- [ ] `prefers-reduced-motion` fallback included

## Workflow Documentation

The `workflow/` folder contains a complete SDLC documentation generator:

```bash
cd workflow
./run.sh              # Interactive mode (reviews each stage)
./run.sh --non-interactive  # Auto-generate all
```

Generates 9 documents (~130KB) covering requirements, PRD, architecture, implementation, code review, and QA.

## License

MIT

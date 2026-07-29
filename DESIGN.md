# DESIGN.md

## 1. Visual Theme & Atmosphere
**Design Philosophy:** Radical Minimalism & High Data Density (Zerodha Kite Standard).
**Atmosphere Keywords:** Crisp, flat, utilitarian, calm, hyper-functional.
**Pitch:** A professional, ultra-fast paper trading terminal devoid of any visual noise.

## 2. Color Palette & Roles

### Base & Backgrounds (Dark Mode Preferred, or Stark Light)
- `--bg-primary`: `#0a0a0a` (Deep black for dark mode) or `#ffffff` (Crisp white for light mode)
- `--bg-secondary`: `#141414` (Slightly elevated) or `#f9f9f9`
- `--bg-hover`: `#1e1e1e` or `#f0f0f0` (Very subtle row hover)
- `--border-light`: `#262626` or `#e0e0e0` (Hairline data borders)

### Text & Typography
- `--text-primary`: `#e5e5e5` or `#333333`
- `--text-secondary`: `#a3a3a3` or `#737373`
- `--text-muted`: `#737373` or `#a3a3a3`

### Functional Trading Colors
- `--color-buy`: `#3b82f6` (Action Blue)
- `--color-profit`: `#10b981` (Clear Green)
- `--color-loss`: `#ef4444` (Stark Red)
- `--color-sell`: `#ef4444` (Stark Red)

## 3. Typography Rules
- **Font Family:** `Inter`, system-ui, -apple-system, sans-serif.
- **Weights:** 
  - `400`: Standard body text, labels, secondary info.
  - `500/600`: Tickers, numerical values, headers, P&L numbers.
- **Sizes:**
  - Standard text: `14px`
  - Small data/Meta: `12px`
  - Tickers/Large values: `16px - 24px`
- **Prohibited:** No cursive, no serifs, no decorative fonts.

## 4. Component Stylings
- **Buttons:** Flat rectangles. Solid background for primary actions (Blue/Red/Green) with white text. No gradients. No rounded pills (use `border-radius: 4px`).
- **Cards/Containers:** Flat panels. 1px solid hairline border (`--border-light`). Zero drop shadows. **Strictly NO glassmorphism or background blur.**
- **Tables/Grids:** Strict vertical alignment for decimals. 1px solid bottom border per row. Hover state applies `--bg-hover` instantly.
- **Inputs:** Flat borders, square corners (`border-radius: 4px`), solid background. Focus state: 1px solid `--color-buy`.

## 5. Layout Principles
- **Density:** Tight padding (`4px` to `12px` max for data rows). Minimal whitespace between related financial metrics.
- **Grid:** Use CSS Grid for strict tabular alignment. Tickers align left, numbers/prices align right.
- **Containers:** 100% width fluid layouts or max-width `1440px` for ultra-wide screens.

## 6. Depth & Elevation
- **Elevation System:** FLAT. 
- **Z-Index/Overlays:** Modals and dropdowns use a flat solid background (`--bg-secondary`) with a single 1px solid border. NO heavy drop shadows (max `box-shadow: 0 4px 12px rgba(0,0,0,0.1)` for essential popups).

## 7. Animation & Interaction
- **Level:** L1 (Functional & Instant).
- **Speed:** Instant feedback. Hover states and color changes on numbers must happen without delay. 
- **Prohibited:** No bouncy transitions, no parallax, no scroll-jacking, no staggered reveals. Only simple, fast CSS transitions (e.g., `transition: background 0.1s ease`).

## 8. Do's and Don'ts
- **DO:** Use tabular nums (`font-variant-numeric: tabular-nums`) for all prices and quantities.
- **DO:** Align numbers to the right and text to the left.
- **DO:** Keep borders to a 1px solid hairline.
- **DO:** Use stark red and green for P&L and ticks.
- **DON'T:** Use glassmorphism or `backdrop-filter`.
- **DON'T:** Use background gradients.
- **DON'T:** Use heavy drop shadows or bubbles.
- **DON'T:** Use rounded corners larger than `4px` or `6px`.
- **DON'T:** Create layout shifts when prices update.

## 9. Responsive Behavior
- **Desktop:** Multi-pane layouts (e.g., Watchlist on left sidebar, chart/order ticket on right).
- **Mobile:** Stacked views. Watchlist rows compress but maintain strict numerical alignment. Touch targets min `44x44px` for buttons.
- **Breakpoints:** `md: 768px`, `lg: 1024px`, `xl: 1280px`.

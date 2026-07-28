# DESIGN.md — MoneyLogix

> "Deep space control console — information glows in the dark, data dances at your fingertips."

---

## 1. Visual Theme & Atmosphere

**Style**: Dark Tech / Fintech Glassmorphism
**Keywords**: deep, neon, futuristic, data-driven, precise, premium, glass, glow
**Tone**: Sophisticated fintech terminal — NOT playful, NOT sterile corporate
**Feel**: Like a Bloomberg terminal redesigned by a luxury car brand — dark surfaces with precise neon accents

**Interaction Tier**: L2 (Fluid Interaction)
**Dependencies**: CSS + IntersectionObserver + lightweight JS animations

**Design Philosophy**: Every element serves data comprehension. Dark backgrounds reduce eye strain during extended trading sessions. Neon accents highlight actionable items and critical data. Glassmorphism adds depth without distraction.

---

## 2. Color Palette & Roles

```css
:root {
  /* Backgrounds */
  --bg: #0B0D11;                          /* Main background — deep space */
  --bg-gradient: linear-gradient(135deg, #0B0D11 0%, #0F1218 50%, #0B0D11 100%);
  --surface: rgba(255, 255, 255, 0.03);   /* Card/panel surface */
  --surface-solid: #12151C;               /* Solid surface for readability */
  --surface-hover: rgba(255, 255, 255, 0.06);
  --surface-alt: rgba(255, 255, 255, 0.02); /* Alternating sections */

  /* Borders */
  --border: rgba(255, 255, 255, 0.08);    /* Default borders */
  --border-hover: rgba(255, 255, 255, 0.15);
  --border-accent: rgba(0, 212, 255, 0.3); /* Accent borders */

  /* Text */
  --text: #F0F2F5;                        /* Primary text — headings, important */
  --text-secondary: #8B92A5;              /* Body, descriptions */
  --text-tertiary: #5A6178;               /* Labels, helper text */
  --text-inverse: #0B0D11;               /* Text on light surfaces */

  /* Accent — Electric Cyan */
  --accent: #00D4FF;                      /* Primary CTA, links, active states */
  --accent-hover: #00B8E6;
  --accent-glow: rgba(0, 212, 255, 0.4);
  --accent-subtle: rgba(0, 212, 255, 0.1);

  /* Secondary Accent — Violet */
  --accent-secondary: #8B5CF6;            /* Secondary actions, badges */
  --accent-secondary-hover: #7C3AED;
  --accent-secondary-glow: rgba(139, 92, 246, 0.4);

  /* Semantic — Trading Colors */
  --profit: #00E676;                      /* Gains, positive */
  --profit-bg: rgba(0, 230, 118, 0.1);
  --loss: #FF5252;                        /* Losses, negative */
  --loss-bg: rgba(255, 82, 82, 0.1);
  --warning: #FFB300;                     /* Alerts, caution */
  --warning-bg: rgba(255, 179, 0, 0.1);
  --info: #448AFF;                        /* Informational */
  --info-bg: rgba(68, 138, 255, 0.1);

  /* RGB variants for rgba() */
  --bg-rgb: 11, 13, 17;
  --surface-rgb: 255, 255, 255;
  --accent-rgb: 0, 212, 255;
  --accent-secondary-rgb: 139, 92, 246;

  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #00D4FF 0%, #8B5CF6 100%);
  --gradient-surface: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
  --gradient-glow: radial-gradient(600px circle at var(--mx, 50%) var(--my, 50%), rgba(0,212,255,0.06), transparent 40%);
}
```

**Color Rules:**
- All colors via CSS variables — zero hardcoded hex in components
- Profit/loss colors are universal signals — never swap their meaning
- Accent color used sparingly — max 2-3 accent elements per viewport
- Glassmorphism surfaces use rgba with backdrop-filter for depth

---

## 3. Typography Rules

**Font Stack:**
```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Dashboard Title | Space Grotesk | 2rem | 700 | 1.2 | -0.02em |
| Section H2 | Space Grotesk | 1.5rem | 600 | 1.3 | -0.01em |
| H3 / Card Title | Space Grotesk | 1.125rem | 600 | 1.4 | — |
| Body | Inter | 0.9375rem | 400 | 1.6 | — |
| Label / Stat | Inter | 0.75rem | 600 | 1.4 | 0.05em |
| Mono / Data | JetBrains Mono | 0.875rem | 400 | 1.5 | — |
| Number Display | JetBrains Mono | 1.25rem | 500 | 1.2 | — |

**Typography Rules:**
- Headings use Space Grotesk — geometric, modern, fintech-appropriate
- Body text uses Inter — excellent readability at small sizes
- All numerical data uses JetBrains Mono — aligned, monospaced
- **NEVER use**: Arial, Helvetica (too generic), Times New Roman, Comic Sans
- Uppercase only for labels and badges with 0.05em letter-spacing

**Text Decoration:**
- Hero title: Gradient text (accent → secondary accent) for brand moments
- Section headings: No gradient, no shadow — clean and readable
- Data numbers: No decoration, rely on color for meaning (profit green, loss red)

---

## 4. Component Stylings

### Buttons
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid transparent;
}

/* Primary */
.btn-primary {
  background: var(--gradient-primary);
  color: #0B0D11;
  box-shadow: 0 0 20px var(--accent-glow);
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 30px var(--accent-glow), 0 4px 20px rgba(0,0,0,0.3);
}
.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 0 15px var(--accent-glow);
}
.btn-primary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Secondary */
.btn-secondary {
  background: var(--surface);
  color: var(--text);
  border-color: var(--border);
  backdrop-filter: blur(12px);
}
.btn-secondary:hover {
  background: var(--surface-hover);
  border-color: var(--border-hover);
}

/* Ghost */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}
.btn-ghost:hover {
  color: var(--text);
  background: var(--surface);
}
```

### Cards
```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(12px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}
.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--gradient-glow);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}
.card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.card:hover::before {
  opacity: 1;
}
.card:focus-within {
  border-color: var(--accent);
  outline: none;
}
```

### Navigation
```css
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(11, 13, 17, 0.8);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  transition: all 0.3s ease;
}
.nav.scrolled {
  background: rgba(11, 13, 17, 0.95);
  box-shadow: 0 4px 30px rgba(0,0,0,0.3);
}
.nav-link {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}
.nav-link:hover, .nav-link.active {
  color: var(--text);
  background: var(--surface);
}
.nav-link.active {
  color: var(--accent);
}
```

### Links
```css
a {
  color: var(--accent);
  text-decoration: none;
  transition: color 0.2s ease, opacity 0.2s ease;
}
a:hover {
  color: var(--accent-hover);
  opacity: 0.9;
}
a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}
```

### Tags / Badges
```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.03em;
}
.badge-profit {
  background: var(--profit-bg);
  color: var(--profit);
}
.badge-loss {
  background: var(--loss-bg);
  color: var(--loss);
}
.badge-warning {
  background: var(--warning-bg);
  color: var(--warning);
}
.badge-neutral {
  background: var(--surface);
  color: var(--text-secondary);
}
```

---

## 5. Layout Principles

**Container:**
- Max width: 1400px (dashboard), 1200px (content pages)
- Padding: 2rem desktop, 1rem mobile
- Narrow variant (forms, auth): 480px

**Spacing Scale:**
- Section padding: 4rem 0
- Component gap: 1rem
- Card internal padding: 1.5rem
- Inline gap: 0.5rem

**Grid:**
```css
.dashboard-grid {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
```

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | No shadow, solid surface | Background sections |
| Subtle | 0 4px 12px rgba(0,0,0,0.2) | Cards at rest |
| Elevated | 0 8px 32px rgba(0,0,0,0.3) | Cards on hover, modals |
| Glowing | 0 0 20px var(--accent-glow) | Active elements, CTAs |
| Deep | 0 16px 48px rgba(0,0,0,0.4) | Dropdown menus, popovers |

---

## 7. Animation & Interaction

**Motion Philosophy**: "Data should feel alive — subtle glows, smooth transitions, nothing jarring."
**Tier**: L2 (Fluid Interaction)

### Entrance Animation
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal.in-view {
  opacity: 1;
  transform: translateY(0);
}

.reveal-delay-1 { transition-delay: 0.1s; }
.reveal-delay-2 { transition-delay: 0.2s; }
.reveal-delay-3 { transition-delay: 0.3s; }
```

### Scroll Behavior
```js
// IntersectionObserver for scroll reveals
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
```

### Hover & Focus States
```css
/* Magnetic button effect */
.btn-magnetic {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-magnetic:hover {
  transform: scale(1.02);
}

/* Glow on hover */
.glow-hover {
  position: relative;
}
.glow-hover::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: var(--gradient-primary);
  opacity: 0;
  z-index: -1;
  transition: opacity 0.3s ease;
  filter: blur(8px);
}
.glow-hover:hover::after {
  opacity: 0.5;
}
```

### Special Effects
- **Mouse spotlight**: Cards with `--mx/--my` CSS vars following cursor
- **Number ticker**: Smooth count-up animation for statistics
- **Gradient flow**: Subtle background-position animation on hero elements
- **Glass shimmer**: Subtle light sweep across glass surfaces on hover

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .reveal {
    opacity: 1;
    transform: none;
  }
}
```

---

## 8. Do's and Don'ts

### Do
- ✅ Use CSS variables for ALL colors — zero hardcoded hex
- ✅ Keep data numbers in JetBrains Mono for alignment
- ✅ Use profit green (#00E676) and loss red (#FF5252) consistently
- ✅ Add subtle glow effects to primary CTAs
- ✅ Use glassmorphism (backdrop-filter) for overlays
- ✅ Ensure all interactive elements have hover + focus states
- ✅ Use skeleton loaders for data-heavy sections
- ✅ Animate number changes with smooth count-up
- ✅ Use Space Grotesk for headings, Inter for body

### Don't
- ❌ Never use bright white backgrounds — stay in dark spectrum
- ❌ Never use red/green for anything other than loss/profit
- ❌ Never stack multiple backdrop-filter layers (performance kill)
- ❌ Never animate more than 3 elements simultaneously
- ❌ Never use `filter: blur()` on moving elements
- ❌ Never use Comic Sans, Papyrus, or overly decorative fonts
- ❌ Never hardcode pixel values for responsive spacing
- ❌ Never use pure black (#000000) — use #0B0D11 minimum
- ❌ Never disable `prefers-reduced-motion` without providing fallback

---

## 9. Responsive Behavior

**Breakpoints:**
| Name | Width | Key Changes |
|------|-------|-------------|
| Desktop | > 1200px | Full dashboard layout, sidebar visible |
| Tablet | 768px - 1200px | Collapsible sidebar, 2-column grids |
| Mobile | < 768px | Single column, bottom navigation, stacked cards |

**Touch Targets:** minimum 44x44px
**Collapsing Strategy:** Sidebar → hamburger menu; Cards → full-width stacked

```css
@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: fixed;
    left: -280px;
    z-index: 200;
    transition: left 0.3s ease;
  }
  .sidebar.open {
    left: 0;
  }
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .card {
    padding: 1rem;
    border-radius: 12px;
  }
  .nav {
    padding: 0.75rem 1rem;
  }
}

@media (max-width: 480px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }
}
```

---

*Generated using web-design skill — Style Seed: Dark Tech (#2)*

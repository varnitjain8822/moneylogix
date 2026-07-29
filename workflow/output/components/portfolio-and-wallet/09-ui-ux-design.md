# MoneyLogix - Portfolio {{PROJECT_NAME}} Wallet - UI/UX Design Specification

> {{DESIGN_PHILOSOPHY}}

---

## 1. Visual Theme & Atmosphere

**Style**: System Component Theme
**Keywords**: Dark, Professional, Data-driven, Modern, Clean
**Tone**: Professional fintech
**Feel**: Like a premium financial dashboard

**Interaction Tier**: L2
**Dependencies**: CSS + IntersectionObserver

---

## 2. Color Palette & Roles

```css
:root {
  /* Backgrounds */
  --bg: #0B0D11;
  --bg-gradient: {{BG_GRADIENT}};
  --surface: {{SURFACE_COLOR}};
  --surface-solid: {{SURFACE_SOLID}};
  --surface-hover: {{SURFACE_HOVER}};
  --surface-alt: {{SURFACE_ALT}};

  /* Borders */
  --border: {{BORDER_COLOR}};
  --border-hover: {{BORDER_HOVER}};
  --border-accent: {{BORDER_ACCENT}};

  /* Text */
  --text: {{TEXT_PRIMARY}};
  --text-secondary: {{TEXT_SECONDARY}};
  --text-tertiary: {{TEXT_TERTIARY}};
  --text-inverse: {{TEXT_INVERSE}};

  /* Accent */
  --accent: #00D4FF;
  --accent-hover: {{ACCENT_HOVER}};
  --accent-glow: {{ACCENT_GLOW}};
  --accent-subtle: {{ACCENT_SUBTLE}};

  /* Secondary Accent */
  --accent-secondary: {{ACCENT_SECONDARY}};
  --accent-secondary-hover: {{ACCENT_SECONDARY_HOVER}};

  /* Semantic */
  --profit: #00E676;
  --profit-bg: {{PROFIT_BG}};
  --loss: #FF5252;
  --loss-bg: {{LOSS_BG}};
  --warning: {{WARNING_COLOR}};
  --warning-bg: {{WARNING_BG}};
  --info: {{INFO_COLOR}};
  --info-bg: {{INFO_BG}};

  /* RGB variants */
  --bg-rgb: {{BG_RGB}};
  --surface-rgb: {{SURFACE_RGB}};
  --accent-rgb: {{ACCENT_RGB}};
  --accent-secondary-rgb: {{ACCENT_SECONDARY_RGB}};

  /* Gradients */
  --gradient-primary: {{GRADIENT_PRIMARY}};
  --gradient-surface: {{GRADIENT_SURFACE}};
  --gradient-glow: {{GRADIENT_GLOW}};
}
```

**Color Rules:**
- {{COLOR_RULE_1}}
- {{COLOR_RULE_2}}
- {{COLOR_RULE_3}}

---

## 3. Typography Rules

**Font Stack:**
```css
@import url('{{FONT_URL}}');
```

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| {{ROLE_1}} | {{FONT_1}} | {{SIZE_1}} | {{WEIGHT_1}} | {{LH_1}} | {{LS_1}} |
| {{ROLE_2}} | {{FONT_2}} | {{SIZE_2}} | {{WEIGHT_2}} | {{LH_2}} | {{LS_2}} |
| {{ROLE_3}} | {{FONT_3}} | {{SIZE_3}} | {{WEIGHT_3}} | {{LH_3}} | {{LS_3}} |
| {{ROLE_4}} | {{FONT_4}} | {{SIZE_4}} | {{WEIGHT_4}} | {{LH_4}} | — |
| {{ROLE_5}} | {{FONT_5}} | {{SIZE_5}} | {{WEIGHT_5}} | {{LH_5}} | {{LS_5}} |
| {{ROLE_6}} | {{FONT_6}} | {{SIZE_6}} | {{WEIGHT_6}} | {{LH_6}} | — |

**Typography Rules:**
- {{TYPOGRAPHY_RULE_1}}
- {{TYPOGRAPHY_RULE_2}}
- **NEVER use**: {{BANNED_FONTS}}

**Text Decoration:**
- {{TEXT_DECORATION}}

---

## 4. Component Stylings

### Buttons
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: {{BTN_PADDING}};
  border-radius: {{BTN_RADIUS}};
  font-family: '{{BTN_FONT}}', sans-serif;
  font-size: {{BTN_SIZE}};
  font-weight: {{BTN_WEIGHT}};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid transparent;
}

.btn-primary {
  background: var(--gradient-primary);
  color: {{BTN_PRIMARY_TEXT}};
  box-shadow: {{BTN_PRIMARY_SHADOW}};
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: {{BTN_PRIMARY_HOVER_SHADOW}};
}
.btn-primary:active { transform: translateY(0); }
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
  border-radius: {{CARD_RADIUS}};
  padding: {{CARD_PADDING}};
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
  box-shadow: {{CARD_HOVER_SHADOW}};
}
.card:hover::before { opacity: 1; }
.card:focus-within {
  border-color: var(--accent);
  outline: none;
}
```

### Navigation
```css
.nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  padding: {{NAV_PADDING}};
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: {{NAV_BG}};
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  transition: all 0.3s ease;
}
.nav.scrolled {
  background: {{NAV_SCROLLED_BG}};
  box-shadow: {{NAV_SCROLLED_SHADOW}};
}
.nav-link {
  color: var(--text-secondary);
  font-size: {{NAV_LINK_SIZE}};
  font-weight: 500;
  text-decoration: none;
  padding: {{NAV_LINK_PADDING}};
  border-radius: 8px;
  transition: all 0.2s ease;
}
.nav-link:hover, .nav-link.active {
  color: var(--text);
  background: var(--surface);
}
.nav-link.active { color: var(--accent); }
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
  font-size: {{BADGE_SIZE}};
  font-weight: 600;
  letter-spacing: 0.03em;
}
.badge-profit { background: var(--profit-bg); color: var(--profit); }
.badge-loss { background: var(--loss-bg); color: var(--loss); }
.badge-warning { background: var(--warning-bg); color: var(--warning); }
.badge-neutral { background: var(--surface); color: var(--text-secondary); }
```

### {{ADDITIONAL_COMPONENT_1}}
```css
{{ADDITIONAL_COMPONENT_CSS_1}}
```

### {{ADDITIONAL_COMPONENT_2}}
```css
{{ADDITIONAL_COMPONENT_CSS_2}}
```

---

## 5. Layout Principles

**Container:**
- Max width: {{CONTAINER_WIDTH}}
- Padding: {{CONTAINER_PADDING}}
- Narrow variant (forms, auth): {{NARROW_WIDTH}}

**Spacing Scale:**
- Section padding: {{SECTION_PADDING}}
- Component gap: {{COMPONENT_GAP}}
- Card internal padding: {{CARD_INTERNAL_PADDING}}
- Inline gap: {{INLINE_GAP}}

**Grid:**
```css
.{{GRID_CLASS_1}} {
  display: grid;
  grid-template-columns: {{GRID_TEMPLATE_1}};
  gap: {{GRID_GAP_1}};
}
.{{GRID_CLASS_2}} {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax({{GRID_MIN}}, 1fr));
  gap: {{GRID_GAP_2}};
}
```

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | {{FLAT_SHADOW}} | {{FLAT_USE}} |
| Subtle | {{SUBTLE_SHADOW}} | {{SUBTLE_USE}} |
| Elevated | {{ELEVATED_SHADOW}} | {{ELEVATED_USE}} |
| Glowing | {{GLOWING_SHADOW}} | {{GLOWING_USE}} |
| Deep | {{DEEP_SHADOW}} | {{DEEP_USE}} |

---

## 7. Animation & Interaction

**Motion Philosophy**: "{{MOTION_PHILOSOPHY}}"
**Tier**: L2

### Entrance Animation
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal.in-view { opacity: 1; transform: translateY(0); }

.reveal-delay-1 { transition-delay: 0.1s; }
.reveal-delay-2 { transition-delay: 0.2s; }
.reveal-delay-3 { transition-delay: 0.3s; }
```

### Scroll Behavior
```js
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
.btn-magnetic { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.btn-magnetic:hover { transform: scale(1.02); }

/* Glow on hover */
.glow-hover { position: relative; }
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
.glow-hover:hover::after { opacity: 0.5; }
```

### Special Effects
- {{SPECIAL_EFFECT_1}}
- {{SPECIAL_EFFECT_2}}
- {{SPECIAL_EFFECT_3}}

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .reveal { opacity: 1; transform: none; }
}
```

---

## 8. Do's and Don'ts

### Do
- {{DO_1}}
- {{DO_2}}
- {{DO_3}}
- {{DO_4}}
- {{DO_5}}
- {{DO_6}}

### Don't
- {{DONT_1}}
- {{DONT_2}}
- {{DONT_3}}
- {{DONT_4}}
- {{DONT_5}}
- {{DONT_6}}
- {{DONT_7}}
- {{DONT_8}}

---

## 9. Responsive Behavior

**Breakpoints:**
| Name | Width | Key Changes |
|------|-------|-------------|
| Desktop | > {{BP_DESKTOP}} | {{DESKTOP_LAYOUT}} |
| Tablet | {{BP_TABLET_MIN}} - {{BP_TABLET_MAX}} | {{TABLET_LAYOUT}} |
| Mobile | < {{BP_MOBILE}} | {{MOBILE_LAYOUT}} |

**Touch Targets:** minimum {{TOUCH_TARGET}}
**Collapsing Strategy:** {{COLLAPSE_STRATEGY}}

```css
@media (max-width: {{BP_TABLET_MAX}}) {
  .{{GRID_CLASS_1}} {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: fixed;
    left: -280px;
    z-index: 200;
    transition: left 0.3s ease;
  }
  .sidebar.open { left: 0; }
}

@media (max-width: {{BP_MOBILE}}) {
  .content-grid { grid-template-columns: 1fr; }
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .card { padding: 1rem; border-radius: 12px; }
  .nav { padding: 0.75rem 1rem; }
}

@media (max-width: 480px) {
  .stat-grid { grid-template-columns: 1fr; }
}
```

---

*Design generated following the [web-design SKILL](../../skills/web-design/SKILL.md) methodology — two-phase workflow: design spec first, then code generation.*

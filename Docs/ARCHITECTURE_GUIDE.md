# CSS Architecture Quick Reference

## 📁 File Structure

```
css/
├── main.css                 # Main entry point (imports all modules)
├── base/
│   ├── variables.css       # Design tokens (colors, spacing, transitions)
│   └── reset.css          # Global resets and base styles
├── layouts/
│   └── layouts.css        # Header, footer, grids, sections
├── components/
│   ├── buttons.css        # Button variants and states
│   ├── cards.css          # Card components (product, team, etc.)
│   ├── forms.css          # Form inputs, search, validation
│   └── navigation.css     # Nav, mobile menu, mega menu
├── pages/
│   ├── 404.css           # 404 error page
│   ├── about.css         # About page specifics
│   ├── cart.css          # Shopping cart page
│   ├── contact.css       # Contact page
│   └── product-detail.css # Product detail page
└── utilities/
    └── utilities.css      # Helper classes, animations, widgets
```

## 🎨 CSS Custom Properties (Quick Access)

### Colors
```css
--primary-color: #6366f1
--primary-dark: #4f46e5
--text-category: #3730a3    /* High contrast for WCAG */
--primary-color-rgb: 99 102 241  /* For modern rgb() syntax */
```

### Spacing
```css
--spacing-xs: 0.25rem   /* 4px */
--spacing-sm: 0.5rem    /* 8px */
--spacing-md: 1rem      /* 16px */
--spacing-lg: 1.5rem    /* 24px */
--spacing-xl: 2rem      /* 32px */
--spacing-2xl: 3rem     /* 48px */
--spacing-3xl: 4rem     /* 64px */
```

### Transitions
```css
--transition-fast: 150ms ease
--transition-base: 250ms ease
--transition-slow: 350ms ease
--transition-button: /* Combined button transitions */
--transition-colors: /* Combined color transitions */
```

### Z-Index Scale
```css
--z-base: 1000
--z-dropdown: 1100
--z-sticky: 1200
--z-overlay: 1300
--z-modal: 1400
--z-toast: 1500
--z-skip-link: 1600  /* Highest for accessibility */
```

### Badge Properties
```css
--badge-offset: -6px
--badge-border-width: 2px
```

## 🛠️ Common Patterns

### Modern Color Syntax
```css
/* ❌ Old */
background: rgba(99, 102, 241, 0.08);

/* ✅ New */
background: rgb(99 102 241 / 0.08);
```

### Fluid Responsive Sizing
```css
/* Use clamp() instead of media queries */
width: clamp(100px, 15vw, 190px);
font-size: clamp(1rem, 0.96rem + 0.2vw, 1.125rem);
padding: clamp(var(--spacing-sm), 1.5vw, var(--spacing-md));
```

### Performance-Optimized Animations
```css
/* ❌ Bad (triggers layout) */
@keyframes shimmer {
    100% { left: 100%; }
}

/* ✅ Good (GPU-accelerated) */
@keyframes shimmer {
    100% { transform: translateX(200%); }
}
```

### Aspect Ratios (CLS Prevention)
```css
.image {
    aspect-ratio: 16 / 9;  /* Prevents layout shift */
    object-fit: cover;
}
```

## 🎯 Utility Classes

### Grid Utilities
```css
.grid-auto-fit-250  /* minmax(250px, 1fr) */
.grid-auto-fit-280  /* minmax(280px, 1fr) */
.grid-auto-fit-300  /* minmax(300px, 1fr) */
```

### Aspect Ratio Utilities
```css
.aspect-video   /* 16:9 */
.aspect-square  /* 1:1 */
.aspect-hero    /* 21:9 */
.aspect-card    /* 4:3 */
```

### Visibility
```css
.hidden           /* display: none */
.visually-hidden  /* SR-only, hidden visually */
.sr-only          /* Alias for visually-hidden */
```

### Container Queries
```css
.container-query  /* Enable container queries */
```

## ♿ Accessibility

### Focus States
```css
/* Global focus-visible style applied automatically */
:focus-visible {
    outline: 3px solid rgba(99, 102, 241, .45);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
}

/* Component-specific adjustments */
.btn:focus-visible {
    outline-offset: 3px;  /* Only override what's different */
}
```

### ARIA-Friendly Styles
```css
/* Mobile category toggle with aria-expanded feedback */
.mobile-category-toggle[aria-expanded="true"] {
    background: var(--gray-100);
    font-weight: 600;
}
.mobile-category-toggle[aria-expanded="true"]::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--primary-color);
}
```

## 📐 Responsive Breakpoints

```css
--breakpoint-sm: 640px
--breakpoint-md: 768px
--breakpoint-lg: 1024px
--breakpoint-xl: 1280px
```

### Usage Pattern
```css
/* Mobile first approach */
.element {
    /* Base mobile styles */
}

@media (min-width: 768px) {
    /* Tablet and above */
}

@media (min-width: 1024px) {
    /* Desktop and above */
}
```

## 🚀 Performance Tips

1. **Use transforms for animations** - GPU-accelerated
2. **Leverage CSS variables** - Easier theming and maintenance
3. **Use clamp() for fluid sizing** - Fewer media queries
4. **Add aspect-ratio** - Prevents CLS (Cumulative Layout Shift)
5. **Avoid !important** - Use specificity instead
6. **Use logical properties** - Better i18n support (future)

## 🎨 BEM Naming Convention

```css
/* Block */
.product-card { }

/* Block__Element */
.product-card__title { }
.product-card__image { }

/* Block--Modifier */
.product-card--featured { }

/* Block__Element--Modifier */
.product-card__button--primary { }
```

## 📝 Code Comments Standards

```css
/* ============================================= */
/* SECTION: Component Name                      */
/* Description of section purpose               */
/* ============================================= */

/* Subsection Title */

/* Standard inline comment */

/* IMPORTANT: Critical note that affects functionality */

/* A11Y: Accessibility-specific note */

/* PERF: Performance-specific note */

/* CLS: Cumulative Layout Shift prevention */
```

## 🔍 Where to Add New Styles

| Type | Location | Example |
|------|----------|---------|
| Design token | `base/variables.css` | Colors, spacing, transitions |
| Global style | `base/reset.css` | Element defaults, skip link |
| Layout | `layouts/layouts.css` | Header, footer, grids |
| Component | `components/*.css` | Buttons, cards, forms |
| Page-specific | `pages/*.css` | Product detail, cart, about |
| Utility | `utilities/utilities.css` | Helper classes, animations |

## 🧪 Testing Checklist

- [ ] Visual regression on all breakpoints
- [ ] Keyboard navigation (Tab, Enter, Esc)
- [ ] Screen reader testing
- [ ] Color contrast validation (WCAG AA)
- [ ] Performance (Lighthouse)
- [ ] Cross-browser (Chrome, Firefox, Safari, Edge)

---

**Last Updated:** October 8, 2025
**Maintainer:** Development Team

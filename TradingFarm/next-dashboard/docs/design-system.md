# Trading Farm Design System

## Overview

This document formalizes the design system for the Trading Farm Dashboard, providing guidelines for consistent UI implementation across the application. It includes color schemes, spacing, typography, and component variations.

## Design Tokens

### Colors

```css
/* Primary Colors */
--primary: #0ea5e9;         /* Sky blue - primary brand color */
--primary-foreground: #ffffff;

/* Secondary Colors */
--secondary: #6366f1;       /* Indigo - secondary actions */
--secondary-foreground: #ffffff;

/* Neutral Colors */
--background: #ffffff;      /* Light mode background */
--foreground: #0f172a;      /* Light mode text */
--muted: #f1f5f9;           /* Light mode muted background */
--muted-foreground: #64748b; /* Light mode muted text */

/* Accent Colors */
--accent: #f0f9ff;          /* Light blue accent */
--accent-foreground: #0c4a6e;

/* Functional Colors */
--destructive: #ef4444;     /* Red - dangerous actions */
--destructive-foreground: #ffffff;
--success: #22c55e;         /* Green - successful actions */
--success-foreground: #ffffff;
--warning: #f59e0b;         /* Amber - warning actions */
--warning-foreground: #ffffff;

/* Dark Mode Variants */
--dark-background: #0f172a;   /* Dark mode background */
--dark-foreground: #f8fafc;   /* Dark mode text */
--dark-muted: #1e293b;        /* Dark mode muted background */
--dark-muted-foreground: #94a3b8; /* Dark mode muted text */
```

### Typography

```css
/* Font Families */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
--font-mono: 'JetBrains Mono', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;

/* Font Sizes */
--font-size-xs: 0.75rem;   /* 12px */
--font-size-sm: 0.875rem;  /* 14px */
--font-size-base: 1rem;    /* 16px */
--font-size-lg: 1.125rem;  /* 18px */
--font-size-xl: 1.25rem;   /* 20px */
--font-size-2xl: 1.5rem;   /* 24px */
--font-size-3xl: 1.875rem; /* 30px */
--font-size-4xl: 2.25rem;  /* 36px */

/* Font Weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Line Heights */
--line-height-tight: 1.25;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

### Spacing

```css
/* Spacing Scale */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
--space-20: 5rem;    /* 80px */
--space-24: 6rem;    /* 96px */
```

### Borders & Radius

```css
/* Border Radius */
--radius-sm: 0.125rem; /* 2px */
--radius-md: 0.375rem; /* 6px */
--radius-lg: 0.5rem;   /* 8px */
--radius-xl: 0.75rem;  /* 12px */
--radius-2xl: 1rem;    /* 16px */
--radius-full: 9999px; /* Fully rounded */

/* Border Widths */
--border-width-thin: 1px;
--border-width-normal: 2px;
--border-width-thick: 3px;
```

## Components

### Button

#### Variants

1. **Default** - Primary action buttons
2. **Secondary** - Secondary actions
3. **Outline** - Less prominent actions
4. **Ghost** - Minimal visual impact
5. **Link** - Appears as a text link
6. **Destructive** - Dangerous operations

#### Sizes

1. **Small** - Compact UI elements (`size="sm"`)
2. **Default** - Standard size
3. **Large** - Prominent actions (`size="lg"`)

#### Usage Guidelines

- Use **Primary** for the main action on a page or in a form
- Use **Secondary** for alternative but still important actions
- Use **Outline** or **Ghost** for less important actions
- Use **Destructive** for irreversible actions like deletion
- Maintain consistent button hierarchy across similar UI patterns

### Dialog/Modal

#### Variants

1. **Default** - Standard modal dialog
2. **Alert** - For important notifications or confirmations
3. **Sheet** - Side-drawer style modal (left/right/top/bottom)

#### Usage Guidelines

- Limit one modal at a time
- Clear dismissal options (close button, escape key, click outside)
- Consistent header/footer patterns
- Focus management for accessibility

### Card

#### Variants

1. **Default** - Standard card with padding
2. **Compact** - Reduced padding for denser UIs
3. **Interactive** - Hoverable/clickable card
4. **Bordered** - With visible border
5. **Shadowed** - With drop shadow

#### Usage Guidelines

- Use consistent spacing within cards
- Maintain consistent header/content/footer structure
- Group related information within a single card
- Use dividers for clear section separation

### Form Components

#### Input

1. **Text** - Standard text input
2. **Number** - Numeric input with controls
3. **Password** - Masked input with visibility toggle
4. **Search** - With search icon and clear button

#### Select

1. **Single** - Standard dropdown selection
2. **Multiple** - Multi-select dropdown
3. **Combobox** - Dropdown with search functionality

#### Usage Guidelines

- Always include visible labels
- Provide helpful placeholder text
- Show validation errors inline
- Group related form controls logically

### Data Display

#### Table

1. **Default** - Standard data table
2. **Compact** - Reduced row height
3. **Bordered** - With cell borders
4. **Striped** - Alternating row background colors

#### Chart

1. **Line** - For time series data
2. **Bar** - For comparing values across categories
3. **Pie/Donut** - For part-to-whole relationships
4. **Candlestick** - For financial price data

#### Usage Guidelines

- Include proper loading and empty states
- Provide clear headings and legends
- Consistent sorting indicators
- Pagination or virtualization for large datasets

## Layout Patterns

### Dashboard Layouts

1. **Grid** - Flexible grid of cards/widgets
2. **Split** - Primary content with sidebar
3. **Full** - Maximized single content area

### Content Containers

1. **Section** - Logical grouping with heading
2. **Divider** - Visual separation between sections
3. **Group** - Tight coupling of related elements

## Accessibility Guidelines

- Color contrast ratio of at least 4.5:1 for text
- Focus indicators on interactive elements
- Semantic HTML structure
- ARIA attributes where appropriate
- Keyboard navigation support
- Screen reader friendly content

## Implementation Standards

- Use Tailwind CSS classes consistently
- Leverage shadcn/ui components when available
- Extend component variants through consistent className patterns
- Document component props with JSDoc comments
- Include accessibility attributes in component implementation

This design system serves as the foundation for all UI development in the Trading Farm Dashboard. It ensures visual consistency, improves development efficiency, and creates a cohesive user experience.

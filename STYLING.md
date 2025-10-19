# Styling Guide - BaB_remix

This document describes the styling approach and best practices for the BaB_remix project.

## Overview

BaB_remix uses a **modern, unified styling system** based on:

- **Tailwind CSS v4** - Utility-first CSS framework
- **CSS Custom Properties** - Theme tokens using HSL color values
- **Class Variance Authority (CVA)** - Type-safe component variants
- **Radix UI** - Accessible, unstyled primitive components

## Architecture

### 1. Theme System

All theme colors are defined as **CSS custom properties** in `src/styles/globals.css` using HSL values.

#### Base Theme Colors

```css
:root {
  /* Base theme colors */
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --primary: 221.2 83.2% 53.3%;
  --destructive: 0 84.2% 60.2%;
  /* ... etc */
}
```

#### Timeline-Specific Colors

```css
:root {
  /* Timeline-specific colors */
  --timeline-visible: 160 84% 39%;
  --timeline-hidden: 217.2 32.6% 17.5%;

  /* Keyframe type colors */
  --keyframe-position-x: 199 89% 48%;
  --keyframe-position-y: 38 92% 50%;
  --keyframe-rotation: 271 81% 56%;
  --keyframe-default: 221.2 83.2% 53.3%;
}
```

#### Using Theme Colors

Colors are exposed through Tailwind's `@theme` directive:

```css
@theme {
  --color-primary: hsl(var(--primary));
  --color-keyframe-position-x: hsl(var(--keyframe-position-x));
  /* ... etc */
}
```

**In Components:**

```tsx
// Use with Tailwind classes
<div className="bg-primary text-primary-foreground" />

// Use with opacity modifiers
<div className="bg-[hsl(var(--primary)/0.5)]" />

// Use theme variables directly
<div className="bg-[hsl(var(--keyframe-position-x))]" />
```

### 2. Component Styling Layers

There are **three distinct styling layers** in this project:

#### Layer 1: CSS Variables (Theme Tokens)
- **Location**: `src/styles/globals.css` → `@layer base`
- **Purpose**: Define all color and spacing tokens
- **Usage**: Foundation for all other layers

#### Layer 2: Tailwind Utilities
- **Purpose**: Layout, spacing, typography, and common styles
- **Usage**: Inline classes in components
- **Example**:
  ```tsx
  <div className="flex items-center gap-2 rounded border px-4 py-2" />
  ```

#### Layer 3: Component Classes
- **Location**: `src/styles/globals.css` → `@layer components`
- **Purpose**: Complex, reusable component patterns (e.g., `.timeline-*`)
- **Usage**: Pre-defined classes for timeline and other complex components
- **Example**:
  ```tsx
  <div className="timeline-track">
    <div className="timeline-track-label" />
    <div className="timeline-track-content" />
  </div>
  ```

### 3. Component Variant System (CVA)

For components with multiple variants, use **Class Variance Authority**:

**Example: Button Component**

```tsx
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-transparent hover:bg-muted",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-sm",
        lg: "h-12 px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export function Button({ variant, size, className, ...props }) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

## Best Practices

### ✅ DO: Use the `cn()` Utility for Conditional Classes

The `cn()` utility (from `src/lib/utils.ts`) merges class names safely and handles Tailwind conflicts:

```tsx
import { cn } from "@/lib/utils";

// ✅ GOOD: Use cn() with conditionals
<div className={cn(
  "flex items-center border rounded px-2 py-1",
  selected && "border-primary bg-primary/10",
  !selected && "border-border bg-muted/40"
)} />

// ✅ GOOD: Use cn() with variant functions
<Button className={cn(buttonVariants({ variant, size }), className)} />
```

### ❌ DON'T: Use Template Strings for Conditional Classes

```tsx
// ❌ BAD: Template strings don't handle Tailwind conflicts
<div className={`flex items-center ${selected ? "border-primary" : "border-border"}`} />

// ❌ BAD: String concatenation is error-prone
let className = "flex";
if (selected) className += " border-primary";
```

### ✅ DO: Use Theme Variables for All Colors

```tsx
// ✅ GOOD: Use theme variables
<div className="bg-[hsl(var(--keyframe-position-x))]" />

// ❌ BAD: Hardcoded Tailwind colors
<div className="bg-sky-400" />
```

### ✅ DO: Use Inline Styles Only for Dynamic Values

```tsx
// ✅ GOOD: Inline styles for computed positions
<div style={{ left: frame * pixelsPerFrame }} />

// ❌ BAD: Inline styles for static design tokens
<div style={{ backgroundColor: "#3b82f6" }} />
```

### ✅ DO: Use Component Layer Classes for Complex Patterns

```tsx
// ✅ GOOD: Use predefined component classes
<div className="timeline-track">
  <div className="timeline-track-label" />
</div>

// ❌ BAD: Repeating long Tailwind classes everywhere
<div className="flex border-b border-[hsl(var(--border)/0.3)]">
  <div className="flex-shrink-0 px-3 py-1.5 bg-[hsl(var(--background)/0.92)]" />
</div>
```

## File Organization

```
src/
├── styles/
│   └── globals.css          # Theme tokens + component layer classes
├── components/
│   ├── ui/                  # Reusable UI components (Button, Input, etc.)
│   │   ├── button.tsx       # Uses CVA for variants
│   │   └── input.tsx
│   ├── timeline/            # Timeline feature components
│   └── inspector/           # Inspector feature components
└── lib/
    └── utils.ts             # cn() utility function
```

## Color System Reference

### Base Colors
- `--background` / `--foreground` - Main app background and text
- `--card` / `--card-foreground` - Card containers
- `--muted` / `--muted-foreground` - Muted/disabled elements
- `--primary` / `--primary-foreground` - Primary brand color
- `--secondary` / `--secondary-foreground` - Secondary actions
- `--accent` / `--accent-foreground` - Accent highlights
- `--destructive` / `--destructive-foreground` - Warnings/errors
- `--border` - Border color
- `--input` - Input field backgrounds
- `--ring` - Focus ring color

### Timeline Colors
- `--timeline-visible` - Visible track segments (emerald green)
- `--timeline-hidden` - Hidden track segments (muted gray)

### Keyframe Colors
- `--keyframe-position-x` - X-axis position keyframes (sky blue)
- `--keyframe-position-y` - Y-axis position keyframes (amber yellow)
- `--keyframe-rotation` - Rotation keyframes (purple)
- `--keyframe-default` - Default keyframe color (primary blue)

## Radix UI Integration

Radix UI provides the **foundation** for accessible components. The app wraps all content in a Radix Theme provider:

```tsx
// App.tsx
<Theme appearance="dark" accentColor="red" grayColor="sage">
  {/* Your app */}
</Theme>
```

**When to use Radix:**
- For complex interactive components (dropdowns, tooltips, dialogs)
- When accessibility is critical
- When you need unstyled primitives to customize

**Examples:**
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-tooltip`
- `@radix-ui/react-switch`

## Responsive Design

Custom breakpoints are defined in the component layer:

```css
@media (max-width: 960px) {
  .timeline {
    --timeline-panel-width: clamp(9rem, 28vw, 11rem);
  }
}

@media (max-width: 720px) {
  .timeline-body {
    @apply flex-col;
  }
}
```

**Tailwind default breakpoints:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## Adding New Colors

To add a new theme color:

1. **Add the HSL value to `:root`**:
   ```css
   /* src/styles/globals.css */
   :root {
     --my-new-color: 180 50% 60%;
   }
   ```

2. **Expose it in `@theme`**:
   ```css
   @theme {
     --color-my-new-color: hsl(var(--my-new-color));
   }
   ```

3. **Use it in components**:
   ```tsx
   <div className="bg-[hsl(var(--my-new-color))]" />
   ```

## Typography

**Font Stack:**
```css
font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

**Font Utilities:**
- Use Tailwind's typography utilities: `text-xs`, `text-sm`, `text-base`, `text-lg`, etc.
- Use `font-medium`, `font-semibold`, `font-bold` for weight
- Use `tracking-*` for letter spacing
- Use `uppercase` for labels

## Border Radius

Radius tokens use the `--radius` base value:

```css
--radius: 0.75rem;
--radius-lg: var(--radius);
--radius-md: calc(var(--radius) - 2px);
--radius-sm: calc(var(--radius) - 4px);
```

**In Tailwind:**
- `rounded` → `--radius-md`
- `rounded-lg` → `--radius-lg`
- `rounded-sm` → `--radius-sm`

## Performance Considerations

1. **Avoid inline styles** when possible - they prevent efficient re-renders
2. **Use component classes** for repeated patterns
3. **Leverage Tailwind's JIT** - all utilities are generated on-demand
4. **Keep className computation minimal** - extract to variables if complex

## Dark Mode

Currently, the app only supports **dark mode**. The theme is set in `App.tsx`:

```tsx
<Theme appearance="dark">
```

To add light mode support in the future:
1. Add light mode color definitions in globals.css
2. Use Tailwind's `dark:` prefix for conditional styles
3. Add a theme switcher component

## Summary

**Three-Layer System:**
1. **CSS Variables** → Theme tokens
2. **Tailwind Utilities** → Layout and common styles
3. **Component Classes** → Complex reusable patterns

**Key Tools:**
- `cn()` for class composition
- CVA for component variants
- Theme variables for all colors
- Inline styles only for dynamic values

**Consistency Rules:**
- Always use `cn()` for conditional classes
- Never hardcode colors - use theme variables
- Use component classes for complex patterns
- Document any new theme tokens

---

**Questions?** Check the source:
- Theme tokens: `src/styles/globals.css`
- Component examples: `src/components/ui/`
- Utility functions: `src/lib/utils.ts`

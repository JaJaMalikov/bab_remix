# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BaB_remix** is an articulated puppet animation tool built as a Tauri v2 desktop application. It allows users to create frame-by-frame animations with SVG-based articulated puppets, manage scenes with multiple assets, and export animations. The application uses a keyframe-based timeline with interpolation for smooth animations.

**Tech Stack:**
- Frontend: React 19, TypeScript, Vite
- Desktop: Tauri v2 (Rust backend)
- State Management: Zustand (UI state), React Context (Animation state)
- UI Components: Radix UI, Tailwind CSS v4
- Testing: Vitest, Testing Library

## Development Commands

### Core Development
```bash
# Development server (auto-runs asset generation)
pnpm dev                    # Starts Vite dev server on port 8080

# Build for production
pnpm build                  # Runs TypeScript compilation + Vite build

# Type checking only
pnpm tsc                    # Check TypeScript errors without building
```

### Testing
```bash
# Run tests
pnpm test                   # Run tests in watch mode
pnpm test:ui                # Run tests with Vitest UI
pnpm coverage               # Generate coverage report

# Run a single test file
pnpm test src/utils/svgTransform.test.ts
```

### Asset Management
```bash
# Generate asset manifest (auto-runs before dev/build)
node scripts/json_assets_gen.js

# This scans public/assets/ and creates:
# - assets-manifest.json (list of all assets)
# - puppet metadata JSON files for SVG puppets
```

### Tauri Commands
```bash
# Run Tauri development mode
pnpm tauri dev

# Build Tauri application
pnpm tauri build

# Target: Linux .deb package (configured in tauri.conf.json)
```

## Architecture

### State Management Strategy

The application uses a **dual-context architecture** to separate concerns:

1. **UiContext (Zustand)** - UI state only
   - Location: `src/context/UiContext.tsx`
   - Manages: scene items, selection, layers, layout preferences
   - Persistence: localStorage (via Zustand persist middleware)
   - Pattern: Zustand store with `partialize` to selectively persist layout

2. **AnimationContext (React Context)** - Animation state
   - Location: `src/context/AnimationContext.tsx`
   - Manages: keyframes, tracks, playback state, frame interpolation
   - Event-driven: Listens for `project:load` and `animation:refresh` events
   - Complex logic: Snapshot management, keyframe interpolation, playback loop

**Key Design Decision:** UI state (what's selected, panel sizes) is separate from animation data (keyframes, tracks). This allows independent serialization and prevents UI preferences from polluting project files.

### Data Flow

```
User Action → Context Provider → Custom Hooks → Components
                                       ↓
                              SVG DOM Manipulation
```

**Animation Application Flow:**
1. `AnimationContext` stores keyframe tracks
2. `useAnimationPlayback` hook watches currentFrame changes
3. On frame change, hook interpolates values between keyframes
4. DOM elements are directly updated via refs (transforms, visibility, variants)

### Component Organization

```
src/
├── components/
│   ├── features/           # Feature panels (library-panel.tsx)
│   ├── inspector/          # Inspector panel components (properties, transforms, variants)
│   ├── layout/            # Layout components (app-layout, side-panel, sidebar)
│   └── ui/                # Reusable Radix UI wrappers (button, slider, etc.)
├── context/               # State management (UiContext, AnimationContext)
├── hooks/                 # Custom React hooks (18 files)
│   ├── useAnimationPlayback.ts    # Applies animation to DOM
│   ├── useScenePanZoom.ts         # Pan/zoom coordinate transforms
│   ├── useLimbRotator.ts          # Puppet limb rotation interaction
│   ├── useTimelineData.ts         # Timeline data transformation
│   └── ...
├── utils/                 # Pure functions
│   ├── svgTransform.ts           # Parse/apply SVG transforms
│   ├── svgVariants.ts            # Puppet variant switching
│   ├── projectSerializer.ts      # Save/load project files
│   ├── attachment.ts             # Attachment calculations
│   ├── lruCache.ts              # LRU cache utility
│   └── numbers.ts               # Numeric utilities
└── styles/                # Global CSS
```

### Key Components

- **SvgScene.tsx** (285 lines) - Main canvas, handles rendering, pan/zoom, asset dropping, click handling
- **Timeline.tsx** - Keyframe timeline with tracks, ruler, playback controls
- **Inspector.tsx** (555 lines) - Property editor panel for selected items
- **SvgPuppet.tsx** - Renders articulated puppets with variant support and caching

**Component Design Patterns:**
- Most components use `React.memo` for performance
- Heavy use of custom hooks to extract logic from components
- Refs are used extensively for direct DOM manipulation (required for SVG transforms)

### SVG Manipulation

**Transform Handling:**
- Transforms are applied via `element.style.transform` (not attributes)
- Transform-origin is pre-defined in SVG source as style attribute
- Parse existing transforms with `svgTransform.ts` utilities
- All transforms use CSS transform syntax: `translate()`, `rotate()`, `scale()`

**Puppet Structure:**
- Puppets are SVG files with nested `<g>` elements representing limbs
- Metadata files (auto-generated) map element IDs to limb names
- Variants are handled via visibility toggling of variant groups
- Attachments use coordinate calculations to position items relative to limbs

**Caching:**
- `SvgPuppet.tsx` uses LRU caches (20 puppets, 32 metadata files)
- Prevents unbounded memory growth
- Cache keys are asset URLs

### Animation System

**Keyframe Interpolation:**
- Linear interpolation between keyframes for numeric values
- Step interpolation for strings/booleans (value holds until next keyframe)
- Implemented in `AnimationContext.getValueAtFrame()`

**Track Structure:**
```typescript
interface AnimationTrack {
  id: string;
  targetId: string;        // Scene item ID
  targetMemberId: string | null;  // Limb ID (null = whole item)
  property: AnimationProperty;     // 'rotation' | 'x' | 'y' | 'scaleX' | 'scaleY' | 'activeVariant' | 'visible' | 'attachment'
  keyframes: Keyframe[];
}
```

**Playback:**
- Managed by `AnimationContext` with `requestAnimationFrame` loop
- `useAnimationPlayback` hook applies interpolated values to DOM each frame
- Handles: transforms, visibility, variants, attachments

### Project Serialization

**File Format:** JSON
- Location: `src/utils/projectSerializer.ts`
- Includes: scene items, animation tracks, duration, fps
- Save: Serializes DOM state + animation data
- Load: Reconstructs scene items and keyframes, fires `project:load` event

**Asset Manifest:**
- Generated by `scripts/json_assets_gen.js` before dev/build
- Scans `public/assets/` directory structure
- Creates category-based asset list for library panel
- Generates puppet metadata by parsing SVG structure

## Important Patterns & Conventions

### Event System

Custom DOM events are used for cross-component communication:
```typescript
window.dispatchEvent(new CustomEvent('project:load'));
window.dispatchEvent(new CustomEvent('animation:refresh'));
```

Components listen with `useEffect` + `addEventListener`.

### Direct DOM Manipulation

Many operations bypass React's virtual DOM for performance:
- SVG transforms are applied directly via refs
- Required because React doesn't efficiently handle complex SVG animations
- Pattern: Get element via ref, mutate attributes/styles directly

### Immutability Requirements

**CRITICAL:** All React state updates must be immutable. The codebase has a history of mutation bugs (see CODE_REVIEW.md lines 73-111). When updating arrays/objects in state:

```typescript
// ❌ WRONG - Direct mutation
track.keyframes = track.keyframes.filter(...);

// ✅ CORRECT - Immutable update
const updatedTrack = {
  ...track,
  keyframes: track.keyframes.filter(...)
};
```

### TypeScript Strictness

- `strict: true` is enabled in tsconfig.json
- Avoid `any` types - prefer proper interfaces
- Union types for keyframe values (`number | string | boolean`) require runtime checks

## Testing Strategy

**Current Coverage:** ~15% (needs improvement - target is 70%+)

**Test Organization:**
```
tests/
├── components/       # Component smoke tests
├── context/          # Context provider tests
├── hooks/            # Custom hook tests
└── utils/            # Utility function tests (highest priority)
```

**Priority for New Tests:**
1. Pure utility functions (svgTransform.ts, projectSerializer.ts) - aim for 90%+
2. Custom hooks - aim for 80%+
3. Components - aim for 60%+

**Running Tests:**
- Use `pnpm test` for watch mode during development
- Use `pnpm coverage` to check coverage before commits
- Tests use Vitest + Testing Library + jsdom

## Common Gotchas

1. **Asset Generation:** Always run `node scripts/json_assets_gen.js` after adding new assets to `public/assets/`
2. **Transform Origin:** SVG transform-origin is defined in source SVG files as style, don't try to set it dynamically
3. **Cache Limits:** Puppet and metadata caches are LRU-limited (20/32 items) - don't assume infinite caching
4. **State Mutations:** Never mutate state directly - always use immutable updates
5. **TypeScript Paths:** Use absolute imports from `src/` root (enabled in tsconfig.json)
6. **Tauri Port:** Dev server runs on port 8080 (configured in vite.config.ts and tauri.conf.json)

## Code Review Findings

A comprehensive code review was conducted on 2025-10-18. Key findings:

**Strengths:**
- Well-structured component architecture
- Effective use of custom hooks
- Clean state management separation
- Strong TypeScript usage

**Known Issues:**
- Insufficient test coverage (only 10 test files for 61 source files)
- Some large components need refactoring (SvgScene: 285 lines, Inspector: 555 lines)
- Error handling needs improvement (silent failures in several places)
- Performance optimization opportunities in animation loops

**See CODE_REVIEW.md for detailed analysis and recommendations.**

## Performance Considerations

- **React.memo** is used on expensive components (Timeline tracks, Scene items)
- **useMemo** is used for derived data calculations
- **LRU caches** prevent memory leaks in puppet/metadata loading
- **Direct DOM updates** bypass React re-renders for animations
- **Future optimization:** Consider virtualizing timeline for projects with 1000+ frames

## Contributing Guidelines

When making changes:

1. **Type Safety:** Maintain strict TypeScript - no `any` types
2. **Immutability:** Always use immutable state updates
3. **Testing:** Add tests for new utilities and hooks (aim for 80%+ coverage)
4. **Performance:** Use React.memo and useMemo for expensive operations
5. **Documentation:** Add JSDoc comments for public APIs and complex logic
6. **Error Handling:** Use toast notifications (Radix UI Toast) for user-facing errors
7. **Code Style:** Follow existing patterns (see eslint.config.mjs)

## Project Structure Notes

- `src-tauri/` contains Rust backend code (minimal logic, mostly window management)
- `public/assets/` contains all SVG puppets, images, and backgrounds
- `dist/` is the Vite build output (used by Tauri)
- `.node/` contains local Node.js installation (not committed)
- Asset manifest and puppet metadata are auto-generated, don't edit manually

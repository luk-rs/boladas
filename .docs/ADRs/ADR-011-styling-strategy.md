# ADR-011: Styling Strategy & Guidelines

**Status**: Active  
**Date**: 2026-01-23 (Updated 2026-09-01)  
**Decision Makers**: Project team

## Context

The application needs a consistent, modern, and high-performance styling strategy with dark/light mode support, while maintaining a "Material UI aspect" and enforcing a mobile-only experience.

## Decision

We use **Tailwind CSS v3.4+** (with PostCSS and Autoprefixer) as the primary styling engine. To maintain the **Material UI aspect** and target mobile devices specifically, we adopt the following guidelines:

### 1. Color Palette

- Refined palette inspired by Material Design 3 (M3).
- Primary colors use the `primary` scale (Sky/Blue) defined in `tailwind.config.js`.
- Semantic surface colors:
  - Light: Background `#f5f5f5`, Surface `#ffffff`, Text `#111827`
  - Dark: Background `#0f172a`, Surface `#1e293b`, Text `#f9fafb`

### 2. Typography

- Maintain clear typographic hierarchy with utility classes (`.ui-eyebrow`, `.ui-muted`, `.ui-caption`, `.ui-section-title`).

### 3. Surface & Elevation

- Use Tailwind's shadow utilities (`shadow-lg`, `shadow-mui`) to simulate elevation.
- Containers have rounded corners (`rounded-xl` / `rounded-2xl`).

### 4. Components

- Reusable building blocks live under `src/shared/ui/` and `src/shared/layout/`.
- Presentational components encapsulate Tailwind utility composition.

### 5. Dark Mode

- Class-based dark mode (`.dark` class on the `<html>` element).
- Persistent preference saved in `localStorage` (`theme` key).

### 6. Mobile-Only Constraints

- App is strictly middle-aligned with a max width of `430px` on desktop viewports.
- Implemented in `AppShell.tsx` and `styles.css` using `.app-shell`.
- Touch-optimized scrolling and layouts.

## Implementation Details

- **Tailwind Strategy**: Tailwind CSS v3.4+ configured via `tailwind.config.js`, `postcss.config.js`, and standard `@tailwind` directives in `src/styles.css`.
- **Theming**: CSS custom properties for surfaces (`--bg-app`, `--bg-surface`, `--text-primary`, `--text-secondary`, `--border-color`) defined in `@layer base`.
- **Preference Hook**: `usePreferences` manages theme and menu position state and triggers custom `theme-change` events.

## Consequences

- **Pros**: Fast development iteration, zero runtime style overhead, seamless dark/light transitions, consistent mobile look-and-feel.
- **Cons**: Requires keeping UI primitives cleanly modularized in `src/shared/ui/` to prevent markup clutter.

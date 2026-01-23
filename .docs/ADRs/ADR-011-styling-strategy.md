# ADR-011: Styling Strategy & Guidelines

## Context

The application needs a consistent, modern, and high-performance styling strategy. The user requested Tailwind 4 (CSS-first) for flexibility and dark/light mode support, while maintaining a "Material UI aspect" and enforcing a mobile-only experience.

## Decision

We will use **Tailwind CSS v4** as the primary styling engine. To maintain the **Material UI aspect** and target mobile devices specifically, we will adopt the following guidelines:

### 1. Color Palette

- Use a refined color palette that mimics Material Design 3 (M3).
- Primary colors should be vibrant but professional (e.g., deep blues/purples).
- Semantic colors (success, error, warning) must follow standard Material conventions.

### 2. Typography

- Use `Inter` or `Roboto` as the primary font families.
- Maintain a clear typographic hierarchy (Heading 1, Heading 2, Body, Caption).

### 3. Surface & Elevation

- Use Tailwind's shadow utilities to simulate elevation.
- Backgrounds should use subtle grays (`#f9fafb` for light, `#0f172a` or `#111827` for dark) and not pure black/white to reduce eye strain.
- Containers should have rounded corners (typically `12px` to `16px`).

### 4. Components

- **Buttons**: Rounded corners, consistent padding, and clear hover/active states.
- **Cards**: Subtle borders and soft shadows.
- **Radial Menu**: Maintains its unique design but uses Tailwind for positioning and theme-aware colors.

### 5. Dark Mode

- Use Tailwind 4's CSS-first theming.
- The theme toggle will add/remove the `.dark` class on the `<html>` element.

### 6. Mobile-Only Constraints

- The app must be centered on the screen with a fixed maximum width (e.g., `450px`) matching a typical mobile device.
- Add a subtle background or border on desktop to emphasize the "contained" mobile experience.
- All layouts must be optimized for touch and narrow viewports.

## Implementation Details

- **Tailwind Strategy**: Tailwind 4 (CSS-first configuration).
- **Theming**: Handled via CSS variables and the `@theme` block in `styles.css`.
- **Theme Manager**: A utility to toggle the `.dark` class on the `<html>` element.
- **Mobile Container**: Implemented in the `AppShell` layout via a wrapper div with `max-w-[450px] mx-auto shadow-2xl min-h-screen relative overflow-hidden`.

## Consequences

- **Pros**: Fast development, consistent styling, built-in dark mode, excellent performance (utility CSS).
- **Cons**: Learning curve for Tailwind classes; requires discipline to avoid "class soup" by using components.

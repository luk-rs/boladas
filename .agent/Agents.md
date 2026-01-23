# Boladas Agent Instructions

This document outlines the core styling and layout rules for the Boladas application. All code generation must adhere to these guidelines.

## 1. Styling Engine

- **Tailwind CSS (v3.4+)**: Use Tailwind utility classes for all styling. Avoid custom CSS in `styles.css` unless absolutely necessary for low-level base styles.
- **Material UI Aspect**: Aim for a refined, modern look inspired by Material Design 3.
  - **Rounded Corners**: Use `rounded-xl` (12px) or `rounded-2xl` (16px) for containers and buttons.
  - **Elevation**: Use `shadow-mui` (defined in tailwind config) or `shadow-lg` for surfaces.
  - **Typography**: Clear hierarchy using standard Tailwind font sizes and weights.

## 2. Layout: Mobile-Only

- **Mobile Centering**: The application is strictly middle-aligned and constrained to a maximum width of `450px` on desktop.
- **Shell**: Use the `.mobile-shell` utility class in the root layout (`AppShell.tsx`).
- **Responsive**: All components must be designed for touch interaction and narrow viewports first.

## 3. Theming: Dark & Light Modes

- **Strategy**: Class-based dark mode (`.dark` on `html`).
- **Surface Colors**:
  - **Light**: Background `#f5f5f5`, Surface `#ffffff`, Text `#111827`.
  - **Dark**: Background `#0f172a`, Surface `#1e293b`, Text `#f9fafb`.
- **Primary Color**: Use the `primary` color scale (Sky/Blue) defined in `tailwind.config.js`.

## 4. Navigation

- **Radial Menu**: Use the `RadialMenu` component for main navigation. It is fixed to the bottom and can be positioned on the left or search right corner.
- **Top Bar**: Use the `TopBar` for the current view title and global actions.

## 5. Persistence

- **LocalStorage**: User preferences like `menu-position` and `theme` must be persisted in `localStorage`.
- **Events**: Use `menu-position-change` and `theme-change` custom events to synchronize state across the app.

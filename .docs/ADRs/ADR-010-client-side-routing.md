# ADR-010: Client-Side Routing Strategy

## Status

Accepted

## Date

2026-01-23

## Context

The application initially relied on conditional rendering within a single `App` component to switch between views (e.g., Login vs. Dashboard). As the application grows to include distinct features like System Administration, User Dashboards, and Public Landing pages, this approach is limiting. It fails to support:

- Deep linking to specific views.
- Native browser navigation (Forward/Back history).
- Clean separation of Page-level logic vs. Component-level logic.

## Decision

We will implement a standard **Single Page Application (SPA) Client-Side Routing** strategy using `react-router-dom`.

### 1. Library Selection

We will use `react-router-dom` (v6 or later) guidelines.

### 2. Route Organization

- **Centralized Definition**: Routes are defined in `src/AppRoutes.tsx`.
- **Layout Routes for Security**: We will use the Layout Route pattern to enforce access control.
  - `ProtectedRoute`: Wraps private routes (Dashboard, Admin) and redirects unauthenticated users to Login.
  - `PublicRoute`: Wraps public routes (Login) and redirects authenticated users to the Dashboard.

### 3. Vertical Slice Integration

To maintain our Vertical Slice Architecture (ADR-008):

- **Page Components**: Screen-level components (e.g., `LoginPage`, `DashboardPage`) will reside within their respective feature directories (e.g., `src/features/auth/pages/`).
- **Feature Encapsulation**: The Router simply imports these pages; it does not contain feature logic itself.

### 4. Component Hierarchy

- `App.tsx` becomes the **Composition Root**. It initializes the `BrowserRouter`, Global Providers (if any), and renders `AppRoutes`.
- `AppRoutes` handles the mapping of URL paths to Page Components.

### 5. Default Authenticated Entry

- The primary authenticated landing view is the **Profile** screen, which embeds the Teams dashboard content.
- The `/home` route is removed to avoid duplicating dashboard logic.

## Consequences

### Positive

- **Enhanced UX**: Users can use browser navigation buttons and bookmark specific pages.
- **Scalability**: Adding new pages is straightforward and doesn't clutter the main App component.
- **Security**: Access control is enforced declaratively at the route level via wrappers.
- **Maintainability**: Clear distinction between a "Page" (route target, data fetcher) and a "Component" (UI element).

### Negative

- **Bundle Size**: Adds `react-router-dom` dependency to the bundle.
- **Complexity**: Requires understanding of client-side routing concepts (nested routes, outlets).

## Compliance

This ADR formalizes the adoption of a standard routing architecture for the frontend.

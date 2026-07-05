# frontend/

TypeScript, Vite, MUI v6 (Material 3 styling), TanStack Query v5, React Router v6.
A PWA — installable, works offline for previously-viewed data. Talks to `../backend`
(FastAPI) — see that directory's README for the API and auth setup.

## Running

From the **repo root** (not this directory):

```bash
npm install
npm start   # Vite dev server on :3000, proxies /api to :8000
```

The backend must also be running.

## Testing

```bash
npm test               # Vitest + React Testing Library, single run
npm run test:watch     # watch mode
npm run test:coverage  # with coverage report
```

Not blanket coverage of every file — `hooks/__tests__/` and `components/__tests__/` cover
hooks with timer-based or network-dependent logic and components with real conditional
rendering worth protecting. Tests run in jsdom.

## Layout

- `api/` — typed fetch functions per resource (`cars.ts`, `auth.ts`, ...), plus
  `client.ts` (shared axios instance: attaches the access token, on 401 transparently
  refreshes and retries once, then redirects to `/login`) and `types.ts` (response/request
  shapes matching the backend's Pydantic schemas).
- `hooks/` — TanStack Query hooks wrapping `api/*`. Components call these, never `api/*` directly.
- `components/` — shared and page-level components, plus `__tests__/`.
- `pages/` — routed page components (`DashboardPage`, `ManagePage`, `LoginPage`, ...).
- `navigation/` — the three responsive nav patterns: `BottomNavBar` (mobile), `NavRail`
  (tablet), `NavDrawer` (desktop). All read from one shared `destinations.tsx` so they
  can't drift apart.
- `offline/` — TanStack Query cache persistence: IndexedDB via `idb-keyval`, 7-day TTL,
  store name `diecastcollectiontracker-offline`.
- `router.tsx` — the `createBrowserRouter` tree.
- `AppShell.tsx` — top-level layout: `AppBar`, the right nav variant, `Outlet`, and the
  `BottomNavBar` on mobile.
- `index.tsx` — entry point; wraps the app in `PersistQueryClientProvider` and sets the
  initial online/offline state from `navigator.onLine`.

## Auth

Tokens live in `localStorage` (`api/tokenStorage.ts`), not an httpOnly cookie — consistent
with the backend returning tokens in the JSON response body. Refresh tokens rotate on every
use; the response interceptor in `api/client.ts` queues concurrent requests during a refresh.

## Offline

This is a PWA: installable, with a Workbox service worker caching the app shell and car
photos (`/uploads/*`, CacheFirst, 500 entries, 30 days). Separately, the entire TanStack
Query cache persists to IndexedDB, so previously-viewed collection data is browsable offline
from a cold start.

Mutations made while offline queue automatically and flush on reconnect. `OfflineStatusIndicator`
surfaces this with a warning toast on the offline transition and a live pending-change count.

`useRestoreBackup` and file-upload mutations opt out of offline queuing via
`networkMode: "always"` — a `File` object can't survive the offline persister's JSON
serialization.

## Destructive actions

Deletions use `useUndoableAction` — a deferred-commit hook paired with an undo toast —
instead of a confirm dialog. The car is hidden immediately (optimistic update) and only
actually deleted after a 5-second grace window, unless the user clicks Undo first.

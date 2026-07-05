---
name: verify
description: Build, run, and drive the seal-web frontend to verify UI changes end-to-end against the local backend.
---

# Verify seal-web changes

## Run

- Frontend: `npm run dev` in `front-end/src/seal-web` → http://localhost:5173 (Vite, hot-reloads edits).
- Backend: Spring Boot on http://localhost:8080 with the seed DB (`back-end/database scripts/seal_seed.sql`). Check both first: they are often already running.
- Seed logins: coordinator `coordinator@fpt.edu.vn` / `Test@1234` (see the seed script for other roles).

## Drive (Playwright)

- `npx playwright --version` works globally and browsers are cached, but scripts need the package locally: `npm init -y && npm i playwright` in a scratch dir, then `node script.mjs` with `import { chromium } from "playwright"`.
- Login flow: fill `input[type="email"]` + `input[type="password"]` on `/login`, click `button:has-text("LOGIN")`, wait for `/dashboard`.
- Coordinator routes: `/coordinator/events|accounts|teams|judges|scoring|prizes`.
- **Gotcha — event selectors**: scoring/prizes/judges pages default to the "active" event which may have no rounds/tracks. Select the seeded event (e.g. "SEAL Summer 2026") in the page's `<select>` first or buttons stay disabled.
- **Gotcha — PixelMenu closes on any scroll** (by design). Wait ~500ms after page load settles before opening menus; async team/round loads resize the page and fire scroll events that close a just-opened menu. Retry the trigger click once.
- ConfirmDialog: `[role="dialog"]`, typed-confirm input is `input[aria-label="Confirmation text"]`, Escape dismisses. Never click the confirm button on destructive paths (cancel event / publish / announce / delete) against the shared dev DB.

## Typecheck baseline

`npx tsc --noEmit` fails on TS 6's `baseUrl` deprecation (TS5101) from `tsconfig.json`; work around with a scratch tsconfig extending `tsconfig.app.json` plus `"ignoreDeprecations": "6.0"`. There are ~11 pre-existing errors in `DashboardLayout.tsx`, `ProfilePage.tsx`, `InvitationsDrawer.tsx`, and `.at()` uses (lib ES2020) — compare against that baseline, don't chase them.

Unit tests: `npm test` (Vitest + RTL) — must be run from `front-end/src/seal-web`, not the repo root.

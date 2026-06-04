Update the following UI issues only. Do not change any business logic,
routing, or component behavior outside what is described below.

====================================================================
1. FOOTER — FULL WIDTH, BELOW ALL CONTENT ON EVERY PAGE
====================================================================

The footer must span the full width of the viewport and sit at the
very bottom of every page, below both the sidebar and the main content.

CORRECT layout structure for authenticated pages:

  ┌─────────────────────────────────────────────┐
  │         TOP NAVBAR (full width)              │
  ├───────────────┬─────────────────────────────┤
  │               │                             │
  │   SIDEBAR     │      MAIN CONTENT           │
  │               │                             │
  │               │                             │
  └───────────────┴─────────────────────────────┘
  ┌─────────────────────────────────────────────┐
  │         FOOTER (full width)                  │
  └─────────────────────────────────────────────┘

The footer is OUTSIDE and BELOW the sidebar + content flex row.
It is NOT inside the sidebar column. It is NOT beside the sidebar.
It must always stretch 100% of the screen width.

Implementation: in DashboardLayout, wrap sidebar + content in a flex
row div, then place the Footer component AFTER that div, not inside it.

  <div style="display:flex; flex-direction:column; min-height:100vh">
    <TopNavbar />
    <div style="display:flex; flex:1">
      <Sidebar />
      <main style="flex:1"> {children} </main>
    </div>
    <Footer />   ← here, outside the inner flex row
  </div>

Use the exact same Footer component from LandingPage.
Apply this layout to ALL authenticated routes.
Also keep the footer on public pages: /, /login, /register,
/pending-approval.

====================================================================
2. NAVBAR DESIGN — PER ROLE SPECIFICATION
====================================================================

There are two navbar variants: Public and Authenticated.

────────────────────────────────────────
PUBLIC NAVBAR  (pages: /, /login, /register, /pending-approval)
────────────────────────────────────────

Full-width top bar with 3 zones:

LEFT:
  [SEAL Logo image]  SEAL Hackathon
  (logo sized at 40px height, vertically centered)

CENTER:
  Nav links (horizontal):  Home · Events · About · FAQ
  Each link scrolls to the corresponding section on the landing page
  or navigates to that route. Active link has a green underline accent.

RIGHT:
  [Login]    → /login    (ghost/outline button style)
  [Register] → /register (primary green button style)

If user is already logged in (isAuthenticated = true), replace
Login + Register with:
  [Go to Dashboard] → /dashboard  (primary green button)

────────────────────────────────────────
AUTHENTICATED TOP NAVBAR  (all dashboard pages)
────────────────────────────────────────

Full-width top bar fixed at the top, same height across all roles.
3 zones:

LEFT:
  [Hamburger icon] — toggles sidebar collapse/expand
  [SEAL Logo image, 36px height]  SEAL Hackathon
  Separator  |
  [Current page title]  — e.g. "Dashboard", "My Team", "Score Submissions"

CENTER (only for Coordinator, Mentor, Judge — event switcher):
  PARTICIPANT: show event name as static text (no dropdown)
    e.g.  🏆 SEAL Spring 2026
  COORDINATOR / MENTOR / JUDGE: show event switcher dropdown
    e.g.  🏆 SEAL Spring 2026  ▾

RIGHT:
  [🔔 Bell icon]  notification count badge (mock: 3)
  [Avatar circle with initials]  Full Name  [Role Badge]  [▾]
    Dropdown menu on click:
      • Profile  → /profile
      • ─────────
      • Logout   → clears auth, redirect to /

Role badge colors (keep existing color system):
  PARTICIPANT  → green badge   "PARTICIPANT"
  MENTOR       → cyan badge    "MENTOR"
  JUDGE        → blue badge    "JUDGE"
  COORDINATOR  → amber badge   "COORDINATOR"

────────────────────────────────────────
SIDEBAR  (authenticated pages only)
────────────────────────────────────────

Vertical left panel, collapsible via hamburger in top navbar.

TOP SECTION — Event context block (below logo area):
  PARTICIPANT (has team):
    ┌──────────────────────────┐
    │ 🏆 SEAL Spring 2026      │
    │    Web Application       │
    │    Round 2 · ACTIVE  🟢  │
    └──────────────────────────┘

  COORDINATOR / MENTOR / JUDGE:
    ┌──────────────────────────┐
    │ 🏆 SEAL Spring 2026  ▾   │  ← dropdown
    └──────────────────────────┘

NAVIGATION ITEMS (below event context block):

  PARTICIPANT — is_leader = TRUE:
    🏠 Home               → /
    📊 Dashboard          → /dashboard
    👥 My Team            → /team/view
    📤 Submit Project     → /team/submit
    🏆 Leaderboard        → /leaderboard
    👤 Profile            → /profile

  PARTICIPANT — is_leader = FALSE:
    🏠 Home               → /
    📊 Dashboard          → /dashboard
    👥 My Team            → /team/view   (read-only)
    🏆 Leaderboard        → /leaderboard
    👤 Profile            → /profile

  MENTOR:
    🏠 Home               → /
    📊 Dashboard          → /dashboard
    📋 My Tracks          → /mentor/tracks
    🏆 Leaderboard        → /leaderboard
    👤 Profile            → /profile

  JUDGE:
    🏠 Home               → /
    📊 Dashboard          → /dashboard
    ✏️  Score Submissions  → /judge/score
    📜 Scoring History    → /judge/history
    👤 Profile            → /profile

  COORDINATOR:
    🏠 Home               → /
    📊 Dashboard          → /coordinator/dashboard
    📅 Events             → /coordinator/events
    ✅ Account Approvals  → /coordinator/accounts  [badge: pending count]
    👥 Teams              → /coordinator/teams
    ⚖️  Judges & Mentors   → /coordinator/judges
    📊 Scoring & Results  → /coordinator/scoring
    🏅 Prizes             → /coordinator/prizes
    📋 Audit Log          → /coordinator/audit
    👤 Profile            → /profile

BOTTOM SECTION of sidebar:
  Logout button (full width, danger/red style)
  Small text: logged in as [full_name]

COLLAPSED state (hamburger toggled):
  Show only icons, no text labels. Tooltip on hover shows the label.
  Event context block hides completely when collapsed.

====================================================================
3. HOME LINK — NO PAGE RELOAD
====================================================================

The 🏠 Home item in the sidebar navigates to / using React Router
<Link to="/">, NOT window.location.href.
No full page reload. The landing page renders instantly in the SPA.
Home item is never highlighted as "active" when on dashboard routes.
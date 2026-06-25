Rebuild the SEAL Hackathon Management System frontend.
Keep the existing pixel-art cyberpunk design system (colors, PixelComponents,
fonts, visual style) exactly as-is. Only fix the business logic, page flows,
role behaviors, and routing described below.

====================================================================
DATA MODEL OVERVIEW
====================================================================

HackathonEvent
  └─ Track  (competition category, e.g. "Web Application", "AI Solution")
  └─ Round  (e.g. Preliminary → Qualifier → Final, ordered by round_order)
       └─ RoundCriteria  (which ScoringCriteria apply, with optional weight_override)
       └─ JudgeAssignment  (which Judges are assigned to this round)

Team → registered to one Track inside one HackathonEvent
  └─ TeamMember  (3–5 members; one has is_leader = TRUE)
       NOTE: "Team Leader" is NOT a system Role.
             is_leader is just a boolean flag inside TeamMember.
             Whoever creates the team gets is_leader = TRUE.
             Invited members get is_leader = FALSE.

Submission  (one per Team per Round)
  └─ Score  (one row per Judge × Criteria × Submission)

Ranking  (computed: position, total_score, is_advanced per Team × Round)

AccountApproval  (PENDING → APPROVED / REJECTED by Coordinator)

AuditLog  (every important action is recorded with timestamp + actor)

====================================================================
ROLES — 4 ROLES ONLY, NO ADMIN
====================================================================

ROLE 1: PARTICIPANT
  - Any registered and approved student (FPT or External university)
  - Can view their team dashboard, submission status, leaderboard, profile
  - If is_leader = TRUE in their team:
      • Can create a team
      • Can invite / remove members
      • Can submit the team's project for an active round
      • Can update submission before deadline
  - If is_leader = FALSE:
      • Read-only: can view team info, submission status, leaderboard

ROLE 2: MENTOR
  - Account created by Coordinator (cannot self-register)
  - Can only see teams in tracks they are assigned to (MentorAssignment)
  - Can view team submission links (repo, demo, slides) — read-only
  - Cannot score submissions

ROLE 3: JUDGE
  - Account created by Coordinator (cannot self-register)
  - Can only see submissions for rounds they are assigned to (JudgeAssignment)
  - Can score submissions criterion by criterion
  - Can save draft scores (is_draft = TRUE) and submit final scores (is_draft = FALSE)
  - Cannot see scores given by other judges

ROLE 4: COORDINATOR
  - Full management access over everything
  - Creates and manages Events, Tracks, Rounds, Criteria
  - Reviews and approves/rejects AccountApproval requests
  - Approves or rejects Teams
  - Creates Mentor and Judge accounts directly (auto-approved, no queue)
  - Assigns Mentors to Tracks, assigns Judges to Rounds
  - Monitors submissions, triggers ranking calculation, advances top N teams
  - Disqualifies teams (with reason → AuditLog)
  - Manages Prizes, publishes results, exports CSV
  - Views full AuditLog

====================================================================
BUSINESS FLOWS
====================================================================

FLOW A — Account Registration & Approval
  1. New user opens /register
  2. Form: Full Name, Email, Password, Confirm Password,
     Student Type (FPT Student → FPT Student ID field)
                  (External Student → Student ID + University Name fields)
     NO role selection — everyone who self-registers is a PARTICIPANT
  3. Submit → redirect to /pending-approval
     User CANNOT log in until approved
  4. Coordinator logs in → /coordinator/accounts → sees PENDING list
     → Approves or Rejects each account
  5. Only APPROVED accounts can log in

FLOW B — Event Setup (Coordinator)
  1. Create HackathonEvent (name, season, start_date, end_date) → status DRAFT
  2. Add Tracks to event (track_name, description, max_teams)
  3. Add Rounds to event (round_name, round_order, submission_deadline, top_n_advance)
  4. Create / select ScoringCriteria (name, description, max_score, weight)
  5. Assign criteria to each Round (RoundCriteria, optional weight_override)
  6. Assign Mentors to Tracks
  7. Assign Judges to Rounds (INTERNAL or GUEST type)
  8. Open event (status → OPEN)

FLOW C — Team Registration (Participant with is_leader)
  1. Approved Participant logs in → dashboard shows "Create Team" if not in any team
  2. Create Team: team_name → select open Event → select Track → submit
  3. Team status = PENDING, creator gets is_leader = TRUE in TeamMember
  4. Leader invites 2–4 more members (search by email or student ID)
  5. Invited users accept → is_leader = FALSE for them
  6. Coordinator approves team → status = APPROVED
  7. Team can now submit in active rounds

FLOW D — Submission (Participant with is_leader, per Round)
  1. When Round is ACTIVE and team is APPROVED → leader sees "Submit Project"
  2. Form: repo_url, demo_url, slide_url
  3. Can update before submission_deadline
  4. After deadline OR round status = CLOSED → form is locked (read-only)

FLOW E — Scoring (Judge)
  1. Judge logs in → sees only rounds assigned to them
  2. For each round → list of team submissions
  3. Open a submission → score each criterion (0 to max_score) + optional comment
  4. "Save Draft" (is_draft = TRUE, editable) or "Submit Final" (is_draft = FALSE, locked)

FLOW F — Ranking & Advancement (Coordinator)
  1. After round closes → Coordinator goes to /coordinator/scoring
  2. "Calculate Rankings" button
     total_score = average across judges of Σ(score_value × weight per criterion)
  3. Rankings table: position, team name, total_score, is_advanced
  4. "Advance Top N" → top_n_advance teams marked is_advanced = TRUE
  5. "Publish Results" → rankings visible to all roles

FLOW G — Awards (Coordinator)
  1. After final round published
  2. Create Prizes (prize_name, description, rank_position)
  3. Award prizes to teams → teams see prizes on dashboard and profile

====================================================================
PAGES
====================================================================

PUBLIC
  /                  Landing page — list OPEN events, Login / Register CTAs
  /login             Email + Password only. No role selector. No demo buttons.
  /register          See Flow A above. No role selection.
  /pending-approval  "Your account is under review." screen

PARTICIPANT (all approved participants)
  /dashboard
    - If is_leader = TRUE: show team name, track, active round, submission status,
      upcoming deadline, rank (if published), buttons: "Manage Team", "Submit Project"
    - If is_leader = FALSE: same but NO manage/submit buttons (read-only)
  /team/create       Only if participant has no team yet
    - Form: team_name → select Event → select Track → submit (status = PENDING)
  /team/manage       Only for is_leader = TRUE
    - Team info, member list with is_leader badge
    - "Invite Member" (search by email/student ID)
    - "Remove Member" (non-leader members only)
    - Member count: "3/5 members" indicator
    - PENDING banner if team not yet approved
  /team/submit       Only for is_leader = TRUE and team APPROVED
    - Active round name + deadline countdown
    - Form: repo_url, demo_url, slide_url
    - Locked (read-only) if past deadline
    - Submission history tab
  /leaderboard       Requires Round filter + Track filter
    - Table: rank, team name, total_score, status (Advanced / Active / Eliminated)
    - Highlight current user's team
  /profile           Name, email, student type, student ID, team info, prizes

MENTOR
  /dashboard         Assigned tracks count, teams count summary
  /mentor/tracks     Tabs per assigned track → teams list → click team:
                     member names + submission links (view only)

JUDGE
  /dashboard         List of assigned rounds with scoring progress (X/Y scored)
  /judge/score
    - Left: submission list for selected round, filter: Not Scored / Draft / Final
    - Right: submission detail + scoring form (criteria list, score input, comment)
      weighted preview updates in real time
      Buttons: "Save Draft" | "Submit Final"
  /judge/history     Table of all scored submissions

COORDINATOR
  /coordinator/dashboard
    - Active events, pending approvals count (badge), team approvals pending
    - Quick nav cards
  /coordinator/events
    - Event list with status badges (DRAFT / OPEN / CLOSED)
    - Create Event button
    - Event detail page with 3 tabs:
        Tracks tab: list tracks, Add Track, assign Mentor per track
        Rounds tab: list rounds, Add Round, set status per round
        Criteria tab: assign ScoringCriteria to rounds with weight_override
  /coordinator/accounts
    - Tabs: PENDING | APPROVED | REJECTED
    - Table: full name, email, student type, student ID, university, date
    - Approve / Reject buttons (Reject requires reason modal)
  /coordinator/teams
    - Filter by event, track, status
    - Approve / Reject PENDING teams
    - Disqualify APPROVED teams (reason required → AuditLog)
    - Click team → member list + submission history
  /coordinator/judges
    - Per round: list of assigned judges with judge_type badge
    - "Assign Judge" → search existing user → select round → INTERNAL or GUEST
    - "Create Judge Account" → form (name, email, password, INTERNAL/GUEST)
      auto-approved, no AccountApproval queue
    - "Create Mentor Account" → form (name, email, password)
      auto-approved, then assign to track immediately
  /coordinator/scoring
    - Select event → select round
    - Submissions table: team, judges scored, status
    - "Calculate Rankings" (enabled only when round CLOSED)
    - Rankings table: position, team, total_score, is_advanced
    - "Advance Top N" button
    - "Publish Results" button
    - "Export CSV" button
  /coordinator/prizes
    - Prize list per event
    - Add Prize (prize_name, description, rank_position)
    - Award prize to team → PrizeAward record
  /coordinator/audit
    - Table: timestamp, actor, action_type, entity_type, entity_id, details
    - Filter by date range, action_type, user
    - Paginated, newest first

====================================================================
ROUTING
====================================================================

Use React Router v7. Define all routes in a central router config file.

Route structure:
  /                          → LandingPage (public)
  /login                     → LoginPage (public)
  /register                  → RegisterPage (public)
  /pending-approval          → PendingApprovalPage (public)

  Protected routes (redirect to /login if not authenticated):
  /dashboard                 → ParticipantDashboard | MentorDashboard |
                               JudgeDashboard | CoordinatorDashboard
                               (render based on currentUser.role)
  /team/create               → TeamCreatePage
  /team/manage               → TeamManagePage
  /team/submit               → TeamSubmitPage
  /leaderboard               → LeaderboardPage
  /profile                   → ProfilePage
  /mentor/tracks             → MentorTracksPage
  /judge/score               → JudgeScorePage
  /judge/history             → JudgeHistoryPage
  /coordinator/dashboard     → CoordDashboard
  /coordinator/events        → CoordEventsPage
  /coordinator/accounts      → CoordAccountsPage
  /coordinator/teams         → CoordTeamsPage
  /coordinator/judges        → CoordJudgesPage
  /coordinator/scoring       → CoordScoringPage
  /coordinator/prizes        → CoordPrizesPage
  /coordinator/audit         → CoordAuditPage

Role guard: if user navigates to a route not belonging to their role →
redirect to /dashboard.

====================================================================
AUTH CONTEXT
====================================================================

Create AuthContext with:
  currentUser: {
    user_id, full_name, email,
    role: 'PARTICIPANT' | 'MENTOR' | 'JUDGE' | 'COORDINATOR',
    student_type: 'FPT' | 'EXTERNAL' | null,
    is_leader: boolean,   ← derived from TeamMember.is_leader
    team_id: number | null
  }
  isAuthenticated: boolean
  login(email, password) → sets currentUser
  logout() → clears state, redirect to /

====================================================================
SIDEBAR NAVIGATION (per role)
====================================================================

PARTICIPANT (is_leader = TRUE):
  Dashboard | My Team | Submit Project | Leaderboard | Profile

PARTICIPANT (is_leader = FALSE):
  Dashboard | Leaderboard | Profile

MENTOR:
  Dashboard | My Tracks | Leaderboard | Profile

JUDGE:
  Dashboard | Score Submissions | Scoring History | Profile

COORDINATOR:
  Dashboard | Events | Account Approvals [badge] | Teams |
  Judges & Mentors | Scoring & Results | Prizes | Audit Log

====================================================================
DEMO TOOLBAR (for viewing screens during development)
====================================================================

Add a floating Dev Toolbar fixed at bottom-right corner of the screen.
Only visible in demo/dev mode (always show for now).

Toolbar contains:
  Label: "DEMO" (small badge)
  A dropdown "Switch Role" with options:
    • Participant (Leader)   → mock user: leader@seal.edu
    • Participant (Member)   → mock user: member@seal.edu
    • Mentor                 → mock user: mentor@seal.edu
    • Judge                  → mock user: judge@seal.edu
    • Coordinator            → mock user: coordinator@seal.edu

Selecting a role instantly switches to that mock user and
navigates to their /dashboard.

Style: compact dark panel, role badge color matches sidebar color,
z-index highest so always on top.

====================================================================
MOCK DATA (mockData.ts)
====================================================================

Event: "SEAL Spring 2026", SPRING, OPEN, 2026-03-01 to 2026-05-31

Tracks:
  Web Application (max 20), AI Solution (max 15),
  Education Tech (max 15), Social Impact (max 10)

Rounds:
  Round 1 Preliminary  order=1  deadline=2026-04-15  top_n=5  CLOSED
  Round 2 Qualifier    order=2  deadline=2026-05-10  top_n=3  ACTIVE
  Round 3 Final        order=3  deadline=2026-05-30  top_n=null UPCOMING

Criteria:
  Innovation (weight 1.5, max 10)
  Technical Implementation (weight 2.0, max 10)
  UI/UX Design (weight 1.0, max 10)
  Completeness (weight 1.5, max 10)
  Presentation (weight 1.0, max 10)

Teams:
  "StackTrace"    Web Application  APPROVED  4 members  leader=leader@seal.edu
  "ByteBuilders"  AI Solution      APPROVED  4 members
  "CodeCraft"     Education Tech   APPROVED  3 members
  "NullPointers"  Web Application  PENDING   3 members

Users:
  coordinator@seal.edu  COORDINATOR  "Nguyen HP"
  leader@seal.edu       PARTICIPANT  "Nguyen DT"  FPT  is_leader=TRUE  team=StackTrace
  member@seal.edu       PARTICIPANT  "Tran TH"    FPT  is_leader=FALSE team=StackTrace
  mentor@seal.edu       MENTOR       "Phan TL"    assigned to Web Application track
  judge@seal.edu        JUDGE        "Dr. Le TVA" assigned to Round 1 + Round 2

AccountApprovals pending (for demo):
  "Hoang VM"  pending@seal.edu  FPT student  requested PARTICIPANT
  "Guest Judge Smith"  (created by coordinator, auto-approved, GUEST judge type)

====================================================================
REMOVE THE FOLLOWING FROM CURRENT BUILD
====================================================================

1. Admin role and all Admin pages — DELETED entirely
2. Quick Demo buttons on login page — DELETED
3. Role selector on register page — DELETED
4. Global leaderboard without round/track filter — REPLACED
5. Any page that lets a non-leader participant submit or manage team — BLOCKED
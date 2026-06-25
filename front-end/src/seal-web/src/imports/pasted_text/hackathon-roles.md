You are rebuilding the SEAL Hackathon Management System frontend.
Keep the existing pixel-art cyberpunk design system (colors, PixelComponents, fonts)
exactly as-is. Only fix the business logic, page flows, and role behaviors described
below. Do not redesign the visual style.

====================================================================
SYSTEM OVERVIEW
====================================================================

This is a hackathon management web app for SEAL (Software Engineering Agile League).
The core data model is:

  HackathonEvent
    └─ Track (competition category, e.g. Web App, AI Solution)
    └─ Round (e.g. Preliminary → Qualifier → Final, ordered by round_order)
         └─ RoundCriteria (which ScoringCriteria apply to this round, with weights)
         └─ JudgeAssignment (which Judges are assigned to this round)

  Team → registered to one Track inside one HackathonEvent
    └─ TeamMember (3–5 members; one is the Team Leader)

  Submission (one per Team per Round)
    └─ Score (one row per Judge × Criteria × Submission)

  Ranking (computed: one row per Team × Round, total_score + position + is_advanced)

  AccountApproval (pending → approved/rejected by Event Coordinator)

  AuditLog (every important action is recorded)

====================================================================
ROLES AND WHAT EACH ROLE CAN DO
====================================================================

There are 5 roles. Enforce these strictly — a user only sees pages and
actions belonging to their own role.

──────────────────────────────────────
ROLE 1: Team Member
──────────────────────────────────────
Can:
  • View their team's dashboard (team name, track, current round, rank)
  • View submission status for the current round (read-only)
  • View leaderboard (by round, by track, overall)
  • View their own profile and achievements
  • View event schedule / timeline

Cannot:
  • Create a team
  • Submit/edit a submission
  • Invite members
  • Access any coordinator or admin page

──────────────────────────────────────
ROLE 2: Team Leader
──────────────────────────────────────
Can do everything Team Member can, PLUS:
  • Create a new team (team name, then select track + event to register in)
  • Invite members by student ID or email (team must stay 3–5 members)
  • Remove a member from the team
  • Submit the team's project for the current open round
    (fields: repo URL, demo URL, slide URL; system checks deadline)
  • Update a submission before the deadline
  • View submission status and judge score breakdown after scoring is published

Cannot:
  • Access any coordinator or admin page

──────────────────────────────────────
ROLE 3: Mentor
──────────────────────────────────────
Can:
  • View dashboard showing only the Tracks they are assigned to
  • View the list of Teams in their assigned Tracks
  • View each team's submission links (repo, demo, slides) for monitoring
  • View the leaderboard (read-only)
  • View their own profile

Cannot:
  • Score submissions
  • Manage events, rounds, or users
  • See teams outside their assigned tracks

──────────────────────────────────────
ROLE 4: Judge
──────────────────────────────────────
Can:
  • View dashboard listing all rounds they are assigned to
  • For each assigned round, see the list of submissions to score
  • Open a submission and score it criterion by criterion
    (each criterion: numeric input 0–10, optional comment)
  • Save scores as draft (can edit later)
  • Submit final scores (locked; further edits require coordinator override)
  • View history of their own submitted scores

Cannot:
  • See submissions for rounds they are NOT assigned to
  • See scores given by other judges
  • Access coordinator or admin pages

──────────────────────────────────────
ROLE 5: Event Coordinator
──────────────────────────────────────
Full management access:
  • Manage HackathonEvents: create, edit, change status (DRAFT → OPEN → CLOSED)
  • Manage Tracks per event: create, edit, set max_teams, assign Mentors
  • Manage Rounds per event: create, set round_order, set submission_deadline,
    set top_n_advance (how many teams advance), change round status
    (UPCOMING → ACTIVE → CLOSED)
  • Manage ScoringCriteria: create/edit criteria templates (name, max_score, weight)
  • Assign criteria to rounds (RoundCriteria) with optional weight_override
  • Review pending AccountApprovals: approve or reject user registrations
  • Assign Judges to Rounds (JudgeAssignment: INTERNAL or GUEST type)
  • Monitor all team submissions per round
  • Trigger ranking calculation for a closed round
  • Mark top N teams as advanced to next round
  • Disqualify a team or a submission (must enter a reason, which is logged)
  • Manage Prizes: create prizes per event, award prizes to teams
  • Publish results (make rankings visible to all)
  • Export data: rankings and scores as CSV
  • View the full AuditLog

NOTE: There is NO separate "Admin" role in this project scope. Remove it.
The Event Coordinator is the highest-privilege role.

====================================================================
CORRECT BUSINESS FLOWS (in sequence)
====================================================================

──────────────────────────────────────
FLOW A: Account Registration & Approval
──────────────────────────────────────
1. New user opens landing page → clicks "Register"
2. Registration form collects:
   - Full name
   - Email
   - Password
   - Student type: "FPT Student" (provide FPT student ID)
                   or "External Student" (provide student ID + university name)
   - Desired role: Team Leader, Team Member, Mentor, Judge
     (Guest Judge accounts are created by Event Coordinator, not self-registered)
3. After submit → user sees "Account pending approval" screen
   They CANNOT log in yet.
4. Event Coordinator logs in → opens "Account Approvals" page →
   sees table of PENDING accounts with user info → approves or rejects each
5. Only after APPROVED can the user log in and access the system

──────────────────────────────────────
FLOW B: Event Setup (Event Coordinator)
──────────────────────────────────────
1. Coordinator creates a HackathonEvent (name, season SPRING/SUMMER/FALL,
   start_date, end_date) → saved as DRAFT
2. Coordinator creates Tracks inside the event
   (track_name, description, max_teams)
3. Coordinator creates Rounds inside the event
   (round_name, round_order, submission_deadline, top_n_advance)
4. Coordinator creates/selects ScoringCriteria
   (criteria_name, description, max_score, weight)
5. Coordinator assigns criteria to each round (RoundCriteria)
6. Coordinator assigns Mentors to Tracks (MentorAssignment)
7. Coordinator assigns Judges to Rounds (JudgeAssignment: INTERNAL or GUEST)
8. Coordinator opens the event (status → OPEN) → teams can now register

──────────────────────────────────────
FLOW C: Team Registration (Team Leader)
──────────────────────────────────────
1. Team Leader logs in → dashboard shows option to create a team or
   join one (if invited)
2. Create Team: enter team_name → select the open HackathonEvent →
   select a Track within that event → submit
3. Team status = PENDING → Coordinator must approve
4. Meanwhile, Team Leader can invite 2–4 more members (team must have 3–5 total)
   by searching by email or student ID
5. Invited users see a notification → accept or decline
6. Coordinator approves the team → status = APPROVED
7. Team can now participate in rounds

──────────────────────────────────────
FLOW D: Submission (Team Leader, per Round)
──────────────────────────────────────
1. When a Round is ACTIVE and the team is APPROVED, Team Leader sees
   "Submit Project" for that round on their dashboard
2. Submission form: repo_url, demo_url, slide_url
3. Team can update the submission any time before submission_deadline
4. After deadline, the submission is locked
5. Team Leader and Team Members can view submission status (Submitted / Not Submitted)

──────────────────────────────────────
FLOW E: Scoring (Judge)
──────────────────────────────────────
1. Judge logs in → dashboard shows list of Rounds they are assigned to
2. For each round, Judge sees a list of submissions (one per team)
3. Judge opens a submission → sees repo_url, demo_url, slide_url links
4. Scoring form shows each criterion assigned to this round:
   - Criterion name, description, max_score
   - Input: numeric score 0 to max_score
   - Optional comment per criterion
5. Judge can "Save Draft" (is_draft = TRUE, can re-edit)
6. Judge clicks "Submit Final" → scores locked (is_draft = FALSE)
7. Judge can view their own scoring history

──────────────────────────────────────
FLOW F: Ranking & Advancement (Event Coordinator)
──────────────────────────────────────
1. After round closes, Coordinator goes to Results page
2. Coordinator clicks "Calculate Rankings" for the round
3. System computes for each team:
   total_score = average across judges of (sum of score_value × weight for each criterion)
   Teams ranked by total_score descending
4. Rankings table shows: position, team name, total_score, judge count, is_advanced
5. Coordinator clicks "Advance Top N" → top_n_advance teams get is_advanced = TRUE
   and automatically appear in the next round's team list
6. Coordinator can also manually disqualify a team (enter reason → AuditLog entry)
7. Coordinator clicks "Publish Results" → rankings become visible to all roles

──────────────────────────────────────
FLOW G: Awards (Event Coordinator)
──────────────────────────────────────
1. After final round rankings are published
2. Coordinator creates Prizes (prize_name, description, rank_position)
3. Coordinator awards prizes to teams (PrizeAward)
4. Teams and Members see their prizes on their dashboard / profile

====================================================================
PAGE-BY-PAGE SPECIFICATION
====================================================================

──────────────────────────────────────
PUBLIC PAGES (no login required)
──────────────────────────────────────

/landing
  - Landing page explaining SEAL Hackathon
  - List of currently OPEN events (event_name, season, start_date, end_date, track count)
  - Links to Register and Login
  - Keep existing design

/auth (login)
  - Email + Password fields
  - No role selector on login (role is determined by the account)
  - "Forgot password" link (placeholder)
  - Link to Register page

/register
  - Full name, Email, Password, Confirm Password
  - Student type radio: "FPT Student" | "External Student"
    - FPT: show FPT Student ID field
    - External: show Student ID + University Name fields
  - Role selection: "Team Leader" | "Team Member" | "Mentor" | "Judge"
  - Submit → show "Pending Approval" confirmation screen
  - DO NOT show "Quick Demo" role buttons (remove those)

/pending-approval
  - Screen shown after registration
  - Message: "Your account is under review. You will be notified by email once approved."
  - Back to landing link

──────────────────────────────────────
TEAM MEMBER PAGES (read-only participant)
──────────────────────────────────────

/dashboard (Team Member)
  - Shows: team name, track name, event name, current round
  - Current round submission status (Submitted / Not Submitted)
  - Current rank in the track leaderboard (if published)
  - Upcoming deadlines
  - Recent activity feed

/leaderboard
  - Filter by: Round (dropdown), Track (dropdown)
  - Table: rank, team name, total_score, status (Advanced / In Progress / Eliminated)
  - Highlight the current user's team

/profile
  - Full name, email, student type, student ID
  - Team membership info
  - Achievements / prizes won

──────────────────────────────────────
TEAM LEADER PAGES (extends Team Member)
──────────────────────────────────────

/team/create
  - Only shown if Team Leader has no team yet
  - Form: Team Name → Select Event (OPEN events list) → Select Track within event
  - Submit → team status = PENDING, waiting for coordinator approval

/team/manage
  - Team info: name, track, event, status badge (PENDING / APPROVED / ELIMINATED)
  - Member list: full name, email, student type, role badge (Leader / Member)
  - "Invite Member" button → search by email or student ID → send invite
  - "Remove Member" button (only for non-leader members)
  - Member count indicator: "3/5 members" (must be 3–5 to compete)
  - If team status is PENDING: show "Awaiting coordinator approval" banner

/team/submit
  - Only accessible when team is APPROVED and a Round is ACTIVE
  - Shows current active round name and submission deadline (countdown timer)
  - Form: Repository URL, Demo URL, Slide/Report URL
  - "Save Draft" and "Submit Final" buttons
  - If past deadline: form is locked, show "Deadline passed"
  - Submission history tab: list of past round submissions with status

──────────────────────────────────────
MENTOR PAGES
──────────────────────────────────────

/mentor/dashboard
  - Summary: number of assigned tracks, total teams across those tracks
  - List of assigned tracks with team count per track

/mentor/tracks
  - Tabs: one tab per assigned track
  - Each tab shows: list of teams in that track, team status, member count
  - Click a team → team detail view:
    - Team name, members (name, student type)
    - Latest submission links (repo, demo, slides) — view only, no scoring

──────────────────────────────────────
JUDGE PAGES
──────────────────────────────────────

/judge/dashboard
  - List of assigned rounds (round_name, event_name, submission_deadline, status)
  - For each round: how many submissions assigned, how many scored (X/Y)
  - Overall scoring progress bar

/judge/score
  - Left panel: list of submissions for the selected round
    - Each row: team name, submission status (Not Scored / Draft / Scored)
    - Filter by: Not Scored / Draft / Scored
  - Right panel (when a submission is selected):
    - Submission info: team name, round name, submitted_at
    - Links: [Open Repo] [Open Demo] [Open Slides] (open in new tab)
    - Scoring form: for each criterion in this round:
        - Criterion name + description
        - Score input: 0 to max_score (numeric, validated)
        - Comment textarea (optional)
    - Weighted preview: shows calculated weighted score in real time
    - Buttons: "Save Draft" | "Submit Final"
    - If already submitted final: show read-only scores with "Scores Submitted" badge

/judge/history
  - Table of all submissions the judge has scored
  - Columns: team name, round, event, total score given, date submitted, status (Draft/Final)

──────────────────────────────────────
EVENT COORDINATOR PAGES
──────────────────────────────────────

/coordinator/dashboard
  - Active events overview: name, status, rounds, teams registered, submissions in
  - Pending items count: account approvals, team approvals, rounds ready to close
  - Quick navigation cards to each management section

/coordinator/events
  - List of all events with status badges (DRAFT / OPEN / CLOSED)
  - "Create Event" button → modal/form: event_name, season, start_date, end_date
  - Click an event → Event Detail Page:
    - Event info + status controls (Open / Close event)
    - Tracks tab: list tracks, "Add Track" button
      - Each track: track_name, max_teams, assigned mentors, team count
      - "Assign Mentor" button → search and assign a Mentor user
    - Rounds tab: list rounds in round_order, "Add Round" button
      - Each round: round_name, round_order, submission_deadline, top_n_advance, status
      - Round status controls: Upcoming → Active → Closed
    - Criteria tab: manage criteria sets for this event
      - Assign criteria to each round with optional weight_override

/coordinator/accounts
  - Table of all PENDING account approval requests
  - Columns: full name, email, role requested, student type, student ID, university, date
  - Per row: "Approve" | "Reject" buttons
  - "Reject" opens a reason modal (note saved to AccountApproval)
  - Tabs: Pending | Approved | Rejected

/coordinator/teams
  - List of all teams across all events/tracks
  - Filter by: event, track, status (PENDING / APPROVED / ELIMINATED)
  - Per team: team_name, track, event, leader, member count, status
  - "Approve" / "Reject" buttons for PENDING teams
  - "Disqualify" button (enter reason → logged to AuditLog, team status → ELIMINATED)
  - Click team → Team Detail: members list, submission history

/coordinator/judges
  - Per event: list of rounds
  - Per round: list of assigned judges with judge_type (INTERNAL / GUEST)
  - "Assign Judge" button → search user by name/email → select round → select type
  - "Remove" assignment button
  - "Create Guest Account" button → form to create a temporary Judge user
    (name, email, temporary password; account is auto-approved)

/coordinator/scoring
  - Select event → select round
  - Table of submissions: team name, judge count, scores received vs expected
  - "Calculate Rankings" button (only enabled when round is CLOSED)
  - After calculation: rankings table appears with position, team, total_score, is_advanced
  - "Advance Top N" button → sets is_advanced = TRUE for top N teams
  - "Publish Results" button → results visible to all
  - "Export CSV" button → download ranking + scores as CSV

/coordinator/prizes
  - Per event: list of prizes
  - "Add Prize" button → form: prize_name, description, rank_position
  - Award prize to a team: select prize → select team → confirm
  - List of awarded prizes: prize name, team, awarded_at

/coordinator/audit
  - Table: timestamp, performed_by (user name), action_type, entity_type, entity_id, details
  - Filter by: date range, action_type, user
  - Paginated, newest first

====================================================================
NAVIGATION & ROUTING
====================================================================

Replace the current custom useState-based routing with React Router v7.
Define routes in a central router configuration file.

Route structure:
  /                       → LandingPage (public)
  /login                  → AuthPage (login only)
  /register               → RegisterPage
  /pending-approval       → PendingApprovalPage

  Protected routes (redirect to /login if not authenticated):
  /dashboard              → role-based: renders TeamMemberDashboard, MentorDashboard,
                            JudgeDashboard, or CoordinatorDashboard based on logged-in role
  /leaderboard            → LeaderboardPage (team, mentor, judge, coordinator)
  /profile                → ProfilePage (all roles)

  /team/create            → TeamCreatePage (Team Leader only, if no team)
  /team/manage            → TeamManagePage (Team Leader)
  /team/submit            → TeamSubmitPage (Team Leader)

  /mentor/tracks          → MentorTracksPage (Mentor)

  /judge/score            → JudgeScoringPage (Judge)
  /judge/history          → JudgeHistoryPage (Judge)

  /coordinator/events     → CoordEventsPage (Coordinator)
  /coordinator/accounts   → CoordAccountsPage (Coordinator)
  /coordinator/teams      → CoordTeamsPage (Coordinator)
  /coordinator/judges     → CoordJudgesPage (Coordinator)
  /coordinator/scoring    → CoordScoringPage (Coordinator)
  /coordinator/prizes     → CoordPrizesPage (Coordinator)
  /coordinator/audit      → CoordAuditPage (Coordinator)

Role-based route guard: if a user navigates to a route not belonging to their
role, redirect to their /dashboard.

====================================================================
AUTHENTICATION STATE
====================================================================

Create a React Context (AuthContext) that stores:
  - currentUser: { user_id, full_name, email, role, student_type, team_id | null }
  - isAuthenticated: boolean
  - login(email, password) → sets currentUser (use mock data for now)
  - logout() → clears state, redirects to /

On login, the role field on the user object determines which dashboard and
sidebar links are shown.

For demo/testing, pre-seed these mock users:
  - coordinator@seal.edu / password → Event Coordinator, already approved
  - leader@seal.edu / password → Team Leader, approved, team = "StackTrace"
  - member@seal.edu / password → Team Member, approved, team = "StackTrace"
  - mentor@seal.edu / password → Mentor, approved, assigned to "Web Application" track
  - judge@seal.edu / password → Judge, approved, assigned to Round 1

====================================================================
SIDEBAR NAVIGATION (per role)
====================================================================

Team Member sidebar:
  - Dashboard
  - Leaderboard
  - Profile

Team Leader sidebar:
  - Dashboard
  - My Team (→ /team/manage)
  - Submit Project (→ /team/submit)
  - Leaderboard
  - Profile

Mentor sidebar:
  - Dashboard
  - My Tracks (→ /mentor/tracks)
  - Leaderboard
  - Profile

Judge sidebar:
  - Dashboard
  - Score Submissions (→ /judge/score)
  - Scoring History (→ /judge/history)
  - Profile

Event Coordinator sidebar:
  - Dashboard
  - Events (→ /coordinator/events)
  - Account Approvals (→ /coordinator/accounts) [badge with pending count]
  - Teams (→ /coordinator/teams)
  - Judges (→ /coordinator/judges)
  - Scoring & Results (→ /coordinator/scoring)
  - Prizes (→ /coordinator/prizes)
  - Audit Log (→ /coordinator/audit)

====================================================================
DATA TYPES (TypeScript interfaces to use)
====================================================================

interface User {
  user_id: number;
  role: 'TEAM_LEADER' | 'TEAM_MEMBER' | 'MENTOR' | 'JUDGE' | 'COORDINATOR';
  email: string;
  full_name: string;
  student_type: 'FPT' | 'EXTERNAL' | null;
  student_id: string | null;
  university_name: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

interface AccountApproval {
  approval_id: number;
  user: User;
  reviewed_by: number | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  note: string | null;
  created_at: string;
}

interface HackathonEvent {
  event_id: number;
  event_name: string;
  season: 'SPRING' | 'SUMMER' | 'FALL';
  start_date: string;
  end_date: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
}

interface Track {
  track_id: number;
  event_id: number;
  track_name: string;
  description: string;
  max_teams: number;
}

interface Round {
  round_id: number;
  event_id: number;
  round_name: string;
  round_order: number;
  submission_deadline: string;
  top_n_advance: number | null;
  status: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
}

interface Team {
  team_id: number;
  track_id: number;
  leader_id: number;
  team_name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ELIMINATED';
  created_at: string;
}

interface TeamMember {
  team_id: number;
  user_id: number;
  joined_at: string;
  is_leader: boolean;
}

interface Submission {
  submission_id: number;
  team_id: number;
  round_id: number;
  repo_url: string | null;
  demo_url: string | null;
  slide_url: string | null;
  submitted_at: string;
}

interface ScoringCriteria {
  criteria_id: number;
  criteria_name: string;
  description: string;
  max_score: number;
  weight: number;
}

interface RoundCriteria {
  round_id: number;
  criteria_id: number;
  weight_override: number | null;
}

interface JudgeAssignment {
  assignment_id: number;
  judge_id: number;
  round_id: number;
  judge_type: 'INTERNAL' | 'GUEST';
}

interface Score {
  score_id: number;
  submission_id: number;
  judge_id: number;
  criteria_id: number;
  score_value: number;
  is_draft: boolean;
  scored_at: string;
}

interface Ranking {
  ranking_id: number;
  team_id: number;
  round_id: number;
  total_score: number;
  position: number;
  is_advanced: boolean;
}

interface Prize {
  prize_id: number;
  event_id: number;
  prize_name: string;
  description: string;
  rank_position: number | null;
}

interface AuditLog {
  log_id: number;
  performed_by: number | null;
  action_type: string;
  entity_type: string;
  entity_id: number | null;
  details: string;
  created_at: string;
}

====================================================================
THINGS TO REMOVE OR FIX
====================================================================

1. REMOVE the "Admin" role and all Admin pages (AdminDashboard, AdminUsersPage,
   AdminStatsPage). The Event Coordinator handles all admin functions.

2. REMOVE "Quick Demo Access" role-selector buttons from the login page.
   Login should be email + password only.

3. FIX the register page: add student type selection and remove role selector
   that bypasses approval (the role chosen at registration goes into
   AccountApproval as "requested role", not into User.role until approved).

4. FIX leaderboard: it must show real round-based data, not a generic global
   ranking. Always require a Round filter and Track filter.

5. FIX judge scoring page: judges must only see submissions for rounds they
   are explicitly assigned to (JudgeAssignment). Show an empty state with
   "No rounds assigned to you" if none.

6. FIX mentor tracks page: mentors must only see teams in tracks they are
   assigned to (MentorAssignment). Show "No tracks assigned" if none.

7. FIX team dashboard for Team Member (non-leader): hide "Submit Project"
   and "Manage Team" buttons. Those belong to Team Leader only.

8. FIX submission deadline enforcement: when Round.status = 'CLOSED' or
   current time > submission_deadline, the submit form must be read-only.

9. ADD a "Pending Approval" guard: if a logged-in user's AccountApproval
   status is PENDING, redirect them to /pending-approval regardless of
   which URL they try to access.

10. ADD an Account Approvals page for Event Coordinator (currently missing
    as a proper page).

====================================================================
MOCK DATA TO USE FOR DEMO
====================================================================

Seed the following mock data in a mockData.ts file:

Events:
  - SEAL Spring 2026, season=SPRING, status=OPEN, start=2026-03-01, end=2026-05-31

Tracks (all in SEAL Spring 2026):
  - "Web Application", max_teams=20
  - "AI Solution", max_teams=15
  - "Education Tech", max_teams=15
  - "Social Impact", max_teams=10

Rounds (all in SEAL Spring 2026):
  - Round 1: "Preliminary", round_order=1, deadline=2026-04-15, top_n_advance=5, status=CLOSED
  - Round 2: "Qualifier", round_order=2, deadline=2026-05-10, top_n_advance=3, status=ACTIVE
  - Round 3: "Final", round_order=3, deadline=2026-05-30, top_n_advance=null, status=UPCOMING

Criteria:
  - Innovation (weight 1.5, max 10)
  - Technical Implementation (weight 2.0, max 10)
  - UI/UX Design (weight 1.0, max 10)
  - Completeness (weight 1.5, max 10)
  - Presentation (weight 1.0, max 10)

Teams:
  - "StackTrace" → Web Application track, leader=leader@seal.edu, status=APPROVED,
    members: leader@seal.edu (leader) + member@seal.edu (member) + 2 more mock members
  - "ByteBuilders" → AI Solution track, status=APPROVED, 4 members
  - "CodeCraft" → Education Tech track, status=APPROVED, 3 members
  - "NullPointers" → Web Application track, status=PENDING (awaiting coordinator approval)

Demo users:
  - coordinator@seal.edu, role=COORDINATOR, name="Nguyen HP", approved
  - leader@seal.edu, role=TEAM_LEADER, name="Nguyen DT", approved
  - member@seal.edu, role=TEAM_MEMBER, name="Tran TH", approved
  - mentor@seal.edu, role=MENTOR, name="Phan TL", approved, assigned to "Web Application"
  - judge@seal.edu, role=JUDGE, name="Dr. Le TVA", approved, assigned to Round 1 + Round 2

====================================================================
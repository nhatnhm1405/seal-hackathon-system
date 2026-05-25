-- ============================================================================
-- SEAL HACKATHON MANAGEMENT SYSTEM
-- Production Database DDL Script
-- Target: Microsoft SQL Server 2016+ / SSMS 19
-- Author: Auto-generated from ERD analysis
-- ============================================================================
-- INSTRUCTIONS:
--   1. Open this file in SSMS 19.
--   2. Create a new database first (or uncomment lines below).
--   3. Execute the entire script (F5).
--   4. Then execute 02_seal_hackathon_seed_data.sql for sample data.
-- ============================================================================

-- Uncomment the following to create and use the database:
CREATE DATABASE seal_hackathon;
GO
USE seal_hackathon;
GO

-- ============================================================================
-- SECTION 1: DROP EXISTING OBJECTS (Safe re-run)
-- ============================================================================
-- Drop triggers first
IF OBJECT_ID('trg_scores_UpdateModTime', 'TR') IS NOT NULL DROP TRIGGER trg_scores_UpdateModTime;
GO
IF OBJECT_ID('trg_submissions_UpdateModTime', 'TR') IS NOT NULL DROP TRIGGER trg_submissions_UpdateModTime;
GO
IF OBJECT_ID('trg_rounds_UpdateModTime', 'TR') IS NOT NULL DROP TRIGGER trg_rounds_UpdateModTime;
GO
IF OBJECT_ID('trg_teams_UpdateModTime', 'TR') IS NOT NULL DROP TRIGGER trg_teams_UpdateModTime;
GO
IF OBJECT_ID('trg_event_activities_UpdateModTime', 'TR') IS NOT NULL DROP TRIGGER trg_event_activities_UpdateModTime;
GO
IF OBJECT_ID('trg_events_UpdateModTime', 'TR') IS NOT NULL DROP TRIGGER trg_events_UpdateModTime;
GO
IF OBJECT_ID('trg_user_profiles_UpdateModTime', 'TR') IS NOT NULL DROP TRIGGER trg_user_profiles_UpdateModTime;
GO
IF OBJECT_ID('trg_users_UpdateModTime', 'TR') IS NOT NULL DROP TRIGGER trg_users_UpdateModTime;
GO

-- Drop tables in reverse dependency order
IF OBJECT_ID('dbo.audit_logs', 'U') IS NOT NULL DROP TABLE dbo.audit_logs;
IF OBJECT_ID('dbo.notifications', 'U') IS NOT NULL DROP TABLE dbo.notifications;
IF OBJECT_ID('dbo.prize_awards', 'U') IS NOT NULL DROP TABLE dbo.prize_awards;
IF OBJECT_ID('dbo.prizes', 'U') IS NOT NULL DROP TABLE dbo.prizes;
IF OBJECT_ID('dbo.round_rankings', 'U') IS NOT NULL DROP TABLE dbo.round_rankings;
IF OBJECT_ID('dbo.scores', 'U') IS NOT NULL DROP TABLE dbo.scores;
IF OBJECT_ID('dbo.round_criteria', 'U') IS NOT NULL DROP TABLE dbo.round_criteria;
IF OBJECT_ID('dbo.scoring_criteria', 'U') IS NOT NULL DROP TABLE dbo.scoring_criteria;
IF OBJECT_ID('dbo.criteria_sets', 'U') IS NOT NULL DROP TABLE dbo.criteria_sets;
IF OBJECT_ID('dbo.submission_assets', 'U') IS NOT NULL DROP TABLE dbo.submission_assets;
IF OBJECT_ID('dbo.submissions', 'U') IS NOT NULL DROP TABLE dbo.submissions;
IF OBJECT_ID('dbo.judge_assignments', 'U') IS NOT NULL DROP TABLE dbo.judge_assignments;
IF OBJECT_ID('dbo.rounds', 'U') IS NOT NULL DROP TABLE dbo.rounds;
IF OBJECT_ID('dbo.mentor_assignments', 'U') IS NOT NULL DROP TABLE dbo.mentor_assignments;
IF OBJECT_ID('dbo.team_invitations', 'U') IS NOT NULL DROP TABLE dbo.team_invitations;
IF OBJECT_ID('dbo.team_members', 'U') IS NOT NULL DROP TABLE dbo.team_members;
IF OBJECT_ID('dbo.teams', 'U') IS NOT NULL DROP TABLE dbo.teams;
IF OBJECT_ID('dbo.tracks', 'U') IS NOT NULL DROP TABLE dbo.tracks;
IF OBJECT_ID('dbo.event_activities', 'U') IS NOT NULL DROP TABLE dbo.event_activities;
IF OBJECT_ID('dbo.event_coordinators', 'U') IS NOT NULL DROP TABLE dbo.event_coordinators;
IF OBJECT_ID('dbo.events', 'U') IS NOT NULL DROP TABLE dbo.events;
IF OBJECT_ID('dbo.account_approvals', 'U') IS NOT NULL DROP TABLE dbo.account_approvals;
IF OBJECT_ID('dbo.user_profiles', 'U') IS NOT NULL DROP TABLE dbo.user_profiles;
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;
IF OBJECT_ID('dbo.role_permissions', 'U') IS NOT NULL DROP TABLE dbo.role_permissions;
IF OBJECT_ID('dbo.permissions', 'U') IS NOT NULL DROP TABLE dbo.permissions;
IF OBJECT_ID('dbo.roles', 'U') IS NOT NULL DROP TABLE dbo.roles;
GO

PRINT '=== All existing objects dropped successfully ===';
GO

-- ============================================================================
-- SECTION 2: SECURITY & AUTHENTICATION TABLES
-- ============================================================================

-- -----------------------------------------------
-- Table: roles
-- Purpose: Global system roles (Admin, Organizer, User)
-- -----------------------------------------------
CREATE TABLE roles (
    role_id     INT IDENTITY(1,1)   PRIMARY KEY,
    role_name   NVARCHAR(50)        NOT NULL UNIQUE,
    description NVARCHAR(255)       NULL
);
GO

-- -----------------------------------------------
-- Table: permissions
-- Purpose: Granular system permission keys for RBAC
-- -----------------------------------------------
CREATE TABLE permissions (
    permission_id   INT IDENTITY(1,1)   PRIMARY KEY,
    permission_key  NVARCHAR(100)       NOT NULL UNIQUE,
    description     NVARCHAR(255)       NULL
);
GO

-- -----------------------------------------------
-- Table: role_permissions
-- Purpose: Junction table linking roles to permissions (M:N)
-- -----------------------------------------------
CREATE TABLE role_permissions (
    role_id         INT NOT NULL,
    permission_id   INT NOT NULL,

    CONSTRAINT PK_role_permissions PRIMARY KEY (role_id, permission_id),
    CONSTRAINT FK_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    CONSTRAINT FK_role_permissions_perm FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
);
GO

-- -----------------------------------------------
-- Table: users
-- Purpose: System credentials and account status
-- Design Notes:
--   - role_id: Global system role (ADMIN, ORGANIZER, USER)
--   - Event-specific roles (judge, mentor, coordinator) are handled
--     via separate assignment tables for flexibility.
--   - NVARCHAR used throughout for Vietnamese Unicode support.
--   - password_hash stores bcrypt/argon2 hashes (60-255 chars).
--   - deleted_at: Nullable timestamp for soft delete pattern.
-- -----------------------------------------------
CREATE TABLE users (
    user_id         INT IDENTITY(1,1)   PRIMARY KEY,
    role_id         INT                 NOT NULL,
    email           NVARCHAR(255)       NOT NULL,
    password_hash   NVARCHAR(255)       NOT NULL,
    status          NVARCHAR(20)        NOT NULL DEFAULT N'PENDING',
    created_at      DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at      DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at      DATETIME2           NULL,

    CONSTRAINT UQ_users_email UNIQUE (email),
    CONSTRAINT FK_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CONSTRAINT CHK_users_status CHECK (status IN (N'PENDING', N'ACTIVE', N'SUSPENDED'))
);
GO

-- -----------------------------------------------
-- Table: user_profiles
-- Purpose: Personal information, decoupled from credentials.
-- Design Notes:
--   - 1:1 with users table (user_id is both PK and FK).
--   - Centralizes profile data (full_name, student_id, university)
--     so that it is NOT duplicated across TeamMember, EventCoordinator, etc.
--   - This resolves the original ERD's 3NF violation where personal
--     data appeared in multiple junction tables.
-- -----------------------------------------------
CREATE TABLE user_profiles (
    user_id         INT                 PRIMARY KEY,
    first_name      NVARCHAR(100)       NOT NULL,
    last_name       NVARCHAR(100)       NOT NULL,
    phone_number    NVARCHAR(20)        NULL,
    student_id      NVARCHAR(50)        NULL,
    student_type    NVARCHAR(20)        NOT NULL DEFAULT N'NONE',
    university_name NVARCHAR(150)       NULL,
    avatar_url      NVARCHAR(512)       NULL,
    updated_at      DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_user_profiles_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT CHK_profiles_student_type CHECK (student_type IN (N'FPT', N'EXTERNAL', N'NONE'))
);
GO

-- -----------------------------------------------
-- Table: account_approvals
-- Purpose: Log of admin approvals for user registrations
-- Design Notes:
--   - user_id -> the applicant
--   - reviewed_by -> the admin who reviewed (nullable until reviewed)
--   - Uses ON DELETE NO ACTION for reviewed_by to avoid cascade cycle
--     (both user_id and reviewed_by point to users table).
-- -----------------------------------------------
CREATE TABLE account_approvals (
    approval_id INT IDENTITY(1,1)   PRIMARY KEY,
    user_id     INT                 NOT NULL,
    reviewed_by INT                 NULL,
    status      NVARCHAR(20)        NOT NULL DEFAULT N'PENDING',
    note        NVARCHAR(MAX)       NULL,
    created_at  DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    reviewed_at DATETIME2           NULL,

    CONSTRAINT FK_account_approvals_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_account_approvals_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE NO ACTION,
    CONSTRAINT CHK_approvals_status CHECK (status IN (N'PENDING', N'APPROVED', N'REJECTED'))
);
GO

PRINT '=== Section 2: Security & Authentication tables created ===';
GO

-- ============================================================================
-- SECTION 3: EVENT MANAGEMENT TABLES
-- ============================================================================

-- -----------------------------------------------
-- Table: events
-- Purpose: Main hackathon events
-- Design Notes:
--   - academic_year added (not in original ERD) to support
--     multi-year event history queries.
--   - CHECK constraint ensures end_date >= start_date.
--   - Status lifecycle: DRAFT -> OPEN -> ACTIVE -> CLOSED
-- -----------------------------------------------
CREATE TABLE events (
    event_id        INT IDENTITY(1,1)   PRIMARY KEY,
    event_name      NVARCHAR(150)       NOT NULL,
    season          NVARCHAR(10)        NOT NULL,
    academic_year   INT                 NOT NULL,
    start_date      DATE                NOT NULL,
    end_date        DATE                NOT NULL,
    status          NVARCHAR(20)        NOT NULL DEFAULT N'DRAFT',
    created_at      DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at      DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at      DATETIME2           NULL,

    CONSTRAINT CHK_events_season CHECK (season IN (N'SPRING', N'SUMMER', N'FALL')),
    CONSTRAINT CHK_events_status CHECK (status IN (N'DRAFT', N'OPEN', N'ACTIVE', N'CLOSED')),
    CONSTRAINT CHK_events_dates CHECK (end_date >= start_date),
    CONSTRAINT CHK_events_year CHECK (academic_year > 2000)
);
GO

-- -----------------------------------------------
-- Table: event_coordinators
-- Purpose: Junction table assigning users as event coordinators (M:N)
-- Design Notes:
--   - Replaces the original EventCoordinator table which violated 3NF
--     by mixing event attributes (event_title, event_type) with
--     coordinator attributes (full_name, student_id).
--   - An event can now have MULTIPLE coordinators.
--   - Uses ON DELETE NO ACTION for user_id to avoid cascade cycle
--     (events -> event_coordinators <- users, both have CASCADE paths).
-- -----------------------------------------------
CREATE TABLE event_coordinators (
    event_id    INT         NOT NULL,
    user_id     INT         NOT NULL,
    assigned_at DATETIME2   NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_event_coordinators PRIMARY KEY (event_id, user_id),
    CONSTRAINT FK_event_coordinators_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    CONSTRAINT FK_event_coordinators_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE NO ACTION
);
GO

-- -----------------------------------------------
-- Table: event_activities
-- Purpose: Sub-events within a hackathon (workshops, webinars, etc.)
-- Design Notes:
--   - This table captures the event_title, event_type, and scheduling
--     data that was incorrectly embedded in the original EventCoordinator table.
--   - organizer_id references the user who created/manages this activity.
-- -----------------------------------------------
CREATE TABLE event_activities (
    activity_id     INT IDENTITY(1,1)   PRIMARY KEY,
    event_id        INT                 NOT NULL,
    organizer_id    INT                 NOT NULL,
    title           NVARCHAR(150)       NOT NULL,
    description     NVARCHAR(MAX)       NULL,
    activity_type   NVARCHAR(20)        NOT NULL,
    scheduled_start DATETIME2           NOT NULL,
    scheduled_end   DATETIME2           NOT NULL,
    location_url    NVARCHAR(512)       NULL,
    created_at      DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at      DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at      DATETIME2           NULL,

    CONSTRAINT FK_event_activities_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    CONSTRAINT FK_event_activities_organizer FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE NO ACTION,
    CONSTRAINT CHK_activities_type CHECK (activity_type IN (N'WORKSHOP', N'WEBINAR', N'MENTORING', N'ANNOUNCEMENT')),
    CONSTRAINT CHK_activities_dates CHECK (scheduled_end >= scheduled_start)
);
GO

-- -----------------------------------------------
-- Table: tracks
-- Purpose: Different divisions/verticals inside a hackathon
--          (e.g., AI, FinTech, IoT, HealthTech)
-- -----------------------------------------------
CREATE TABLE tracks (
    track_id    INT IDENTITY(1,1)   PRIMARY KEY,
    event_id    INT                 NOT NULL,
    track_name  NVARCHAR(100)       NOT NULL,
    description NVARCHAR(MAX)       NULL,
    max_teams   INT                 NOT NULL DEFAULT 50,
    created_at  DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at  DATETIME2           NULL,

    CONSTRAINT FK_tracks_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    CONSTRAINT CHK_tracks_max_teams CHECK (max_teams > 0)
);
GO

PRINT '=== Section 3: Event Management tables created ===';
GO

-- ============================================================================
-- SECTION 4: TEAM MANAGEMENT TABLES
-- ============================================================================

-- -----------------------------------------------
-- Table: teams
-- Purpose: Hackathon participant teams
-- Design Notes:
--   - leader_id: Single source of truth for who owns the team.
--     The original ERD had BOTH leader_id in Team AND is_leader
--     in TeamMember, creating redundant and potentially conflicting state.
--   - UNIQUE(track_id, team_name): No duplicate team names within same track.
--   - Uses ON DELETE NO ACTION for track_id and leader_id to avoid
--     SQL Server cascade cycle errors.
-- -----------------------------------------------
CREATE TABLE teams (
    team_id     INT IDENTITY(1,1)   PRIMARY KEY,
    track_id    INT                 NOT NULL,
    leader_id   INT                 NOT NULL,
    team_name   NVARCHAR(100)       NOT NULL,
    status      NVARCHAR(20)        NOT NULL DEFAULT N'PENDING',
    created_at  DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at  DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at  DATETIME2           NULL,

    CONSTRAINT UQ_track_team_name UNIQUE (track_id, team_name),
    CONSTRAINT FK_teams_track FOREIGN KEY (track_id) REFERENCES tracks(track_id) ON DELETE NO ACTION,
    CONSTRAINT FK_teams_leader FOREIGN KEY (leader_id) REFERENCES users(user_id) ON DELETE NO ACTION,
    CONSTRAINT CHK_teams_status CHECK (status IN (N'PENDING', N'APPROVED', N'REJECTED', N'ELIMINATED'))
);
GO

-- -----------------------------------------------
-- Table: team_members
-- Purpose: Junction table mapping users to teams (M:N)
-- Design Notes:
--   - Composite PK (team_id, user_id) prevents duplicate membership.
--   - role_in_team replaces is_leader boolean for extensibility.
--   - Personal info (full_name, student_id, university_name) that was
--     in the original TeamMember is now in user_profiles (3NF fix).
--   - Uses ON DELETE NO ACTION for user_id to avoid cascade cycle.
-- -----------------------------------------------
CREATE TABLE team_members (
    team_id      INT         NOT NULL,
    user_id      INT         NOT NULL,
    role_in_team NVARCHAR(20) NOT NULL DEFAULT N'MEMBER',
    joined_at    DATETIME2   NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at   DATETIME2   NULL,

    CONSTRAINT PK_team_members PRIMARY KEY (team_id, user_id),
    CONSTRAINT FK_team_members_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    CONSTRAINT FK_team_members_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE NO ACTION,
    CONSTRAINT CHK_team_members_role CHECK (role_in_team IN (N'LEADER', N'MEMBER'))
);
GO

-- -----------------------------------------------
-- Table: team_invitations
-- Purpose: Workflow-controlled team invitation system
-- Design Notes:
--   - New table not in original ERD, added for production readiness.
--   - Tracks invitation lifecycle: PENDING -> ACCEPTED/DECLINED/EXPIRED.
--   - expires_at allows automatic expiration of stale invitations.
-- -----------------------------------------------
CREATE TABLE team_invitations (
    invitation_id INT IDENTITY(1,1)   PRIMARY KEY,
    team_id       INT                 NOT NULL,
    inviter_id    INT                 NOT NULL,
    invitee_email NVARCHAR(255)       NOT NULL,
    status        NVARCHAR(20)        NOT NULL DEFAULT N'PENDING',
    created_at    DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    expires_at    DATETIME2           NOT NULL,

    CONSTRAINT FK_team_invitations_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    CONSTRAINT FK_team_invitations_inviter FOREIGN KEY (inviter_id) REFERENCES users(user_id) ON DELETE NO ACTION,
    CONSTRAINT CHK_invitations_status CHECK (status IN (N'PENDING', N'ACCEPTED', N'DECLINED', N'EXPIRED'))
);
GO

-- -----------------------------------------------
-- Table: mentor_assignments
-- Purpose: Assign mentors (users) to tracks or specific teams
-- Design Notes:
--   - Flexible assignment: can be to a track OR a specific team.
--   - CHECK constraint ensures at least one of track_id/team_id is set.
--   - Uses ON DELETE NO ACTION for track_id and team_id to avoid cycles.
-- -----------------------------------------------
CREATE TABLE mentor_assignments (
    assignment_id INT IDENTITY(1,1)   PRIMARY KEY,
    mentor_id     INT                 NOT NULL,
    track_id      INT                 NULL,
    team_id       INT                 NULL,
    assigned_at   DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_mentor_assignments_mentor FOREIGN KEY (mentor_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_mentor_assignments_track FOREIGN KEY (track_id) REFERENCES tracks(track_id) ON DELETE NO ACTION,
    CONSTRAINT FK_mentor_assignments_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE NO ACTION,
    CONSTRAINT CHK_mentor_scope CHECK (track_id IS NOT NULL OR team_id IS NOT NULL)
);
GO

PRINT '=== Section 4: Team Management tables created ===';
GO

-- ============================================================================
-- SECTION 5: ROUNDS & SUBMISSIONS
-- ============================================================================

-- -----------------------------------------------
-- Table: rounds
-- Purpose: Evaluation rounds within a hackathon event
--          (e.g., Round 1: Idea Pitch, Round 2: Prototype, Round 3: Final)
-- Design Notes:
--   - round_order enforces unique ordering per event.
--   - top_n_advance: Number of teams advancing to next round (nullable for final round).
--   - Status lifecycle: UPCOMING -> ACTIVE -> CLOSED
-- -----------------------------------------------
CREATE TABLE rounds (
    round_id            INT IDENTITY(1,1)   PRIMARY KEY,
    event_id            INT                 NOT NULL,
    round_name          NVARCHAR(100)       NOT NULL,
    round_order         INT                 NOT NULL,
    submission_deadline DATETIME2           NOT NULL,
    top_n_advance       INT                 NULL,
    status              NVARCHAR(20)        NOT NULL DEFAULT N'UPCOMING',
    created_at          DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at          DATETIME2           NULL,

    CONSTRAINT UQ_event_round_order UNIQUE (event_id, round_order),
    CONSTRAINT FK_rounds_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    CONSTRAINT CHK_rounds_order CHECK (round_order > 0),
    CONSTRAINT CHK_rounds_top_n CHECK (top_n_advance IS NULL OR top_n_advance > 0),
    CONSTRAINT CHK_rounds_status CHECK (status IN (N'UPCOMING', N'ACTIVE', N'CLOSED'))
);
GO

-- -----------------------------------------------
-- Table: judge_assignments
-- Purpose: Assign users as judges for specific rounds
-- Design Notes:
--   - UNIQUE(judge_id, round_id) prevents double-assigning a judge.
--   - judge_type distinguishes internal staff from guest judges.
--   - Uses ON DELETE NO ACTION for round_id to avoid cascade cycle.
-- -----------------------------------------------
CREATE TABLE judge_assignments (
    assignment_id INT IDENTITY(1,1)   PRIMARY KEY,
    judge_id      INT                 NOT NULL,
    round_id      INT                 NOT NULL,
    judge_type    NVARCHAR(20)        NOT NULL DEFAULT N'INTERNAL',
    assigned_at   DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT UQ_judge_round UNIQUE (judge_id, round_id),
    CONSTRAINT FK_judge_assignments_judge FOREIGN KEY (judge_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_judge_assignments_round FOREIGN KEY (round_id) REFERENCES rounds(round_id) ON DELETE NO ACTION,
    CONSTRAINT CHK_judge_type CHECK (judge_type IN (N'INTERNAL', N'GUEST'))
);
GO

-- -----------------------------------------------
-- Table: submissions
-- Purpose: Team project submissions per round
-- Design Notes:
--   - UNIQUE(team_id, round_id): One submission per team per round.
--   - project_name and description added (not in original ERD)
--     for richer project metadata.
--   - The original ERD had fixed columns (repo_url, demo_url, slide_url).
--     These are now handled by the submission_assets table below
--     for extensibility (teams can submit any number/type of assets).
--   - Uses ON DELETE NO ACTION for round_id to avoid cascade cycle.
-- -----------------------------------------------
CREATE TABLE submissions (
    submission_id INT IDENTITY(1,1)   PRIMARY KEY,
    team_id       INT                 NOT NULL,
    round_id      INT                 NOT NULL,
    project_name  NVARCHAR(150)       NOT NULL,
    description   NVARCHAR(MAX)       NULL,
    submitted_at  DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at    DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT UQ_team_round UNIQUE (team_id, round_id),
    CONSTRAINT FK_submissions_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    CONSTRAINT FK_submissions_round FOREIGN KEY (round_id) REFERENCES rounds(round_id) ON DELETE NO ACTION
);
GO

-- -----------------------------------------------
-- Table: submission_assets
-- Purpose: Flexible storage for submission deliverables
-- Design Notes:
--   - Replaces the original ERD's hardcoded repo_url/demo_url/slide_url columns.
--   - asset_type examples: 'GITHUB_REPO', 'SLIDE_DECK', 'DEMO_VIDEO',
--     'FIGMA_DESIGN', 'ZIP_FILE', 'DOCUMENT', etc.
--   - Teams can submit any number of assets of any type.
-- -----------------------------------------------
CREATE TABLE submission_assets (
    asset_id      INT IDENTITY(1,1)   PRIMARY KEY,
    submission_id INT                 NOT NULL,
    asset_type    NVARCHAR(30)        NOT NULL,
    asset_url     NVARCHAR(512)       NOT NULL,
    created_at    DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_submission_assets_sub FOREIGN KEY (submission_id) REFERENCES submissions(submission_id) ON DELETE CASCADE
);
GO

PRINT '=== Section 5: Rounds & Submissions tables created ===';
GO

-- ============================================================================
-- SECTION 6: SCORING & RANKINGS
-- ============================================================================

-- -----------------------------------------------
-- Table: criteria_sets
-- Purpose: Reusable groups of scoring criteria per event
-- -----------------------------------------------
CREATE TABLE criteria_sets (
    set_id      INT IDENTITY(1,1)   PRIMARY KEY,
    event_id    INT                 NOT NULL,
    set_name    NVARCHAR(100)       NOT NULL,
    description NVARCHAR(MAX)       NULL,
    created_at  DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_criteria_sets_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);
GO

-- -----------------------------------------------
-- Table: scoring_criteria
-- Purpose: Individual rubric items (e.g., Innovation, Code Quality)
-- Design Notes:
--   - max_score: Maximum points a judge can give (e.g., 10.00).
--   - default_weight: Multiplier for weighted scoring.
-- -----------------------------------------------
CREATE TABLE scoring_criteria (
    criteria_id     INT IDENTITY(1,1)   PRIMARY KEY,
    set_id          INT                 NOT NULL,
    criteria_name   NVARCHAR(100)       NOT NULL,
    description     NVARCHAR(MAX)       NULL,
    max_score       NUMERIC(5,2)        NOT NULL,
    default_weight  NUMERIC(5,2)        NOT NULL DEFAULT 1.00,
    created_at      DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_scoring_criteria_set FOREIGN KEY (set_id) REFERENCES criteria_sets(set_id) ON DELETE CASCADE,
    CONSTRAINT CHK_criteria_max_score CHECK (max_score > 0),
    CONSTRAINT CHK_criteria_weight CHECK (default_weight >= 0)
);
GO

-- -----------------------------------------------
-- Table: round_criteria
-- Purpose: Maps criteria to rounds with optional weight overrides
-- Design Notes:
--   - Composite PK (round_id, criteria_id).
--   - weight_override: If NULL, uses the default_weight from scoring_criteria.
--   - Uses ON DELETE NO ACTION for criteria_id to avoid cascade cycle
--     (events -> criteria_sets -> scoring_criteria -> round_criteria <- rounds <- events).
-- -----------------------------------------------
CREATE TABLE round_criteria (
    round_id        INT             NOT NULL,
    criteria_id     INT             NOT NULL,
    weight_override NUMERIC(5,2)    NULL,

    CONSTRAINT PK_round_criteria PRIMARY KEY (round_id, criteria_id),
    CONSTRAINT FK_round_criteria_round FOREIGN KEY (round_id) REFERENCES rounds(round_id) ON DELETE CASCADE,
    CONSTRAINT FK_round_criteria_criteria FOREIGN KEY (criteria_id) REFERENCES scoring_criteria(criteria_id) ON DELETE NO ACTION,
    CONSTRAINT CHK_round_criteria_weight CHECK (weight_override IS NULL OR weight_override >= 0)
);
GO

-- -----------------------------------------------
-- Table: scores
-- Purpose: Individual judge score entries per submission per criteria
-- Design Notes:
--   - UNIQUE(submission_id, judge_id, criteria_id): Prevents duplicate
--     scoring by the same judge for the same submission+criteria.
--   - is_draft: Allows judges to save work-in-progress scores before
--     finalizing (BIT: 1=draft, 0=finalized).
--   - score_value CHECK ensures non-negative scores.
--   - Uses ON DELETE NO ACTION for judge_id and criteria_id to avoid cycles.
-- -----------------------------------------------
CREATE TABLE scores (
    score_id      INT IDENTITY(1,1)   PRIMARY KEY,
    submission_id INT                 NOT NULL,
    judge_id      INT                 NOT NULL,
    criteria_id   INT                 NOT NULL,
    score_value   NUMERIC(5,2)        NOT NULL,
    is_draft      BIT                 NOT NULL DEFAULT 1,
    scored_at     DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at    DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT UQ_submission_judge_criteria UNIQUE (submission_id, judge_id, criteria_id),
    CONSTRAINT FK_scores_submission FOREIGN KEY (submission_id) REFERENCES submissions(submission_id) ON DELETE CASCADE,
    CONSTRAINT FK_scores_judge FOREIGN KEY (judge_id) REFERENCES users(user_id) ON DELETE NO ACTION,
    CONSTRAINT FK_scores_criteria FOREIGN KEY (criteria_id) REFERENCES scoring_criteria(criteria_id) ON DELETE NO ACTION,
    CONSTRAINT CHK_scores_value CHECK (score_value >= 0)
);
GO

-- -----------------------------------------------
-- Table: round_rankings
-- Purpose: Pre-calculated team rankings per round
-- Design Notes:
--   - Materialized aggregation table for dashboard performance.
--   - is_advanced: Whether the team advances to the next round.
--   - UNIQUE(team_id, round_id): One ranking per team per round.
--   - Uses ON DELETE NO ACTION for round_id to avoid cascade cycle.
-- -----------------------------------------------
CREATE TABLE round_rankings (
    ranking_id      INT IDENTITY(1,1)   PRIMARY KEY,
    team_id         INT                 NOT NULL,
    round_id        INT                 NOT NULL,
    total_score     NUMERIC(6,2)        NOT NULL,
    position        INT                 NOT NULL,
    is_advanced     BIT                 NOT NULL DEFAULT 0,
    calculated_at   DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT UQ_team_round_rank UNIQUE (team_id, round_id),
    CONSTRAINT FK_round_rankings_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    CONSTRAINT FK_round_rankings_round FOREIGN KEY (round_id) REFERENCES rounds(round_id) ON DELETE NO ACTION,
    CONSTRAINT CHK_rankings_score CHECK (total_score >= 0),
    CONSTRAINT CHK_rankings_position CHECK (position > 0)
);
GO

PRINT '=== Section 6: Scoring & Rankings tables created ===';
GO

-- ============================================================================
-- SECTION 7: REWARDS, NOTIFICATIONS, & AUDIT TABLES
-- ============================================================================

-- -----------------------------------------------
-- Table: prizes
-- Purpose: Prize definitions per event
-- Design Notes:
--   - rank_position: Maps to placement (1=First, 2=Second, etc.)
--   - cash_value: Optional monetary value for tracking.
-- -----------------------------------------------
CREATE TABLE prizes (
    prize_id        INT IDENTITY(1,1)   PRIMARY KEY,
    event_id        INT                 NOT NULL,
    prize_name      NVARCHAR(100)       NOT NULL,
    description     NVARCHAR(MAX)       NULL,
    rank_position   INT                 NOT NULL,
    cash_value      NUMERIC(12,2)       NULL,

    CONSTRAINT FK_prizes_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    CONSTRAINT CHK_prizes_rank CHECK (rank_position > 0),
    CONSTRAINT CHK_prizes_cash CHECK (cash_value IS NULL OR cash_value >= 0)
);
GO

-- -----------------------------------------------
-- Table: prize_awards
-- Purpose: Records which team won which prize
-- Design Notes:
--   - UNIQUE on prize_id: Each prize can only be awarded to one team.
--   - Uses ON DELETE NO ACTION for prize_id to avoid cascade cycle.
-- -----------------------------------------------
CREATE TABLE prize_awards (
    award_id    INT IDENTITY(1,1)   PRIMARY KEY,
    team_id     INT                 NOT NULL,
    prize_id    INT                 NOT NULL,
    awarded_at  DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT UQ_prize_awards_prize UNIQUE (prize_id),
    CONSTRAINT FK_prize_awards_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    CONSTRAINT FK_prize_awards_prize FOREIGN KEY (prize_id) REFERENCES prizes(prize_id) ON DELETE NO ACTION
);
GO

-- -----------------------------------------------
-- Table: notifications
-- Purpose: In-app notification system
-- Design Notes:
--   - New table not in original ERD, required for production system.
--   - Supports filtering unread notifications via filtered index.
-- -----------------------------------------------
CREATE TABLE notifications (
    notification_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT                  NOT NULL,
    title           NVARCHAR(150)        NOT NULL,
    message         NVARCHAR(MAX)        NOT NULL,
    is_read         BIT                  NOT NULL DEFAULT 0,
    created_at      DATETIME2            NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_notifications_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
GO

-- -----------------------------------------------
-- Table: audit_logs
-- Purpose: Immutable system activity log for compliance
-- Design Notes:
--   - BIGINT PK for high-volume write scalability.
--   - details column uses NVARCHAR(MAX) with ISJSON check
--     for structured change tracking (e.g., old/new values).
--   - ip_address supports both IPv4 and IPv6 (max 45 chars).
--   - ON DELETE SET NULL for performed_by: Log entries survive
--     even if the user account is hard-deleted.
-- -----------------------------------------------
CREATE TABLE audit_logs (
    log_id          BIGINT IDENTITY(1,1)    PRIMARY KEY,
    performed_by    INT                     NULL,
    action_type     NVARCHAR(50)            NOT NULL,
    entity_type     NVARCHAR(50)            NOT NULL,
    entity_id       INT                     NULL,
    details         NVARCHAR(MAX)           NULL,
    ip_address      NVARCHAR(45)            NULL,
    created_at      DATETIME2               NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_audit_logs_user FOREIGN KEY (performed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT CHK_audit_logs_json CHECK (details IS NULL OR ISJSON(details) = 1)
);
GO

PRINT '=== Section 7: Rewards, Notifications & Audit tables created ===';
GO

-- ============================================================================
-- SECTION 8: INDEX DEFINITIONS
-- ============================================================================
-- Strategy:
--   1. Foreign Key Indexes: SQL Server does NOT auto-index FKs.
--   2. Filtered Indexes: Optimize queries on active (non-deleted) records.
--   3. Covering Indexes: Speed up common dashboard/reporting queries.
-- ============================================================================

-- Security & Profiles
CREATE INDEX IX_users_role ON users(role_id);
CREATE NONCLUSTERED INDEX IX_users_email_active ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IX_user_profiles_name ON user_profiles(last_name, first_name);
CREATE INDEX IX_account_approvals_user ON account_approvals(user_id);
CREATE INDEX IX_account_approvals_status ON account_approvals(status);

-- Event Management
CREATE INDEX IX_event_coordinators_user ON event_coordinators(user_id);
CREATE INDEX IX_event_activities_event ON event_activities(event_id);
CREATE INDEX IX_event_activities_organizer ON event_activities(organizer_id);
CREATE INDEX IX_tracks_event ON tracks(event_id);

-- Team Management
CREATE NONCLUSTERED INDEX IX_teams_track ON teams(track_id) WHERE deleted_at IS NULL;
CREATE INDEX IX_teams_leader ON teams(leader_id);
CREATE NONCLUSTERED INDEX IX_team_members_user ON team_members(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IX_team_invitations_team ON team_invitations(team_id);
CREATE INDEX IX_team_invitations_email ON team_invitations(invitee_email);
CREATE INDEX IX_mentor_assignments_mentor ON mentor_assignments(mentor_id);
CREATE INDEX IX_mentor_assignments_track ON mentor_assignments(track_id);
CREATE INDEX IX_mentor_assignments_team ON mentor_assignments(team_id);

-- Rounds & Submissions
CREATE NONCLUSTERED INDEX IX_rounds_event ON rounds(event_id) WHERE deleted_at IS NULL;
CREATE INDEX IX_judge_assignments_judge ON judge_assignments(judge_id);
CREATE INDEX IX_judge_assignments_round ON judge_assignments(round_id);
CREATE INDEX IX_submissions_team ON submissions(team_id);
CREATE INDEX IX_submissions_round ON submissions(round_id);
CREATE INDEX IX_submission_assets_sub ON submission_assets(submission_id);

-- Scoring & Rankings
CREATE INDEX IX_criteria_sets_event ON criteria_sets(event_id);
CREATE INDEX IX_scoring_criteria_set ON scoring_criteria(set_id);
CREATE INDEX IX_scores_submission ON scores(submission_id);
CREATE INDEX IX_scores_judge ON scores(judge_id);
CREATE INDEX IX_scores_criteria ON scores(criteria_id);
CREATE INDEX IX_round_rankings_team ON round_rankings(team_id);
CREATE INDEX IX_round_rankings_round ON round_rankings(round_id);

-- Rewards & System
CREATE INDEX IX_prizes_event ON prizes(event_id);
CREATE INDEX IX_prize_awards_team ON prize_awards(team_id);
CREATE NONCLUSTERED INDEX IX_notifications_user_unread ON notifications(user_id) WHERE is_read = 0;
CREATE INDEX IX_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX IX_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IX_audit_logs_created ON audit_logs(created_at DESC);
GO

PRINT '=== Section 8: All indexes created ===';
GO

-- ============================================================================
-- SECTION 9: TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================================================
-- SQL Server does not support BEFORE UPDATE triggers or shared trigger
-- functions. Each table with updated_at gets an explicit AFTER UPDATE trigger.
-- ============================================================================

CREATE TRIGGER trg_users_UpdateModTime ON users AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE u SET u.updated_at = SYSUTCDATETIME()
    FROM users u INNER JOIN inserted i ON u.user_id = i.user_id;
END;
GO

CREATE TRIGGER trg_user_profiles_UpdateModTime ON user_profiles AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE up SET up.updated_at = SYSUTCDATETIME()
    FROM user_profiles up INNER JOIN inserted i ON up.user_id = i.user_id;
END;
GO

CREATE TRIGGER trg_events_UpdateModTime ON events AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE e SET e.updated_at = SYSUTCDATETIME()
    FROM events e INNER JOIN inserted i ON e.event_id = i.event_id;
END;
GO

CREATE TRIGGER trg_event_activities_UpdateModTime ON event_activities AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE ea SET ea.updated_at = SYSUTCDATETIME()
    FROM event_activities ea INNER JOIN inserted i ON ea.activity_id = i.activity_id;
END;
GO

CREATE TRIGGER trg_teams_UpdateModTime ON teams AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE t SET t.updated_at = SYSUTCDATETIME()
    FROM teams t INNER JOIN inserted i ON t.team_id = i.team_id;
END;
GO

CREATE TRIGGER trg_rounds_UpdateModTime ON rounds AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE r SET r.updated_at = SYSUTCDATETIME()
    FROM rounds r INNER JOIN inserted i ON r.round_id = i.round_id;
END;
GO

CREATE TRIGGER trg_submissions_UpdateModTime ON submissions AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE s SET s.updated_at = SYSUTCDATETIME()
    FROM submissions s INNER JOIN inserted i ON s.submission_id = i.submission_id;
END;
GO

CREATE TRIGGER trg_scores_UpdateModTime ON scores AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE sc SET sc.updated_at = SYSUTCDATETIME()
    FROM scores sc INNER JOIN inserted i ON sc.score_id = i.score_id;
END;
GO

PRINT '=== Section 9: All triggers created ===';
PRINT '=== DDL Script completed successfully! ===';
GO

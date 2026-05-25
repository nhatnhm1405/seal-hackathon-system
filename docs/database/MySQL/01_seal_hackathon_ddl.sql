-- ============================================================================
-- SEAL HACKATHON MANAGEMENT SYSTEM
-- Production Database DDL Script (MySQL Version)
-- Target: MySQL 8.0+
-- Author: Auto-generated from ERD analysis
-- ============================================================================
-- INSTRUCTIONS:
--   1. Execute this script in your MySQL Client (e.g., MySQL Workbench, DBeaver).
--   2. The database "seal_hackathon" will be created automatically.
--   3. Execute 02_seal_hackathon_seed_data.sql next to insert sample data.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS seal_hackathon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE seal_hackathon;

-- ============================================================================
-- SECTION 1: DROP EXISTING OBJECTS (Safe re-run)
-- ============================================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS prize_awards;
DROP TABLE IF EXISTS prizes;
DROP TABLE IF EXISTS round_rankings;
DROP TABLE IF EXISTS scores;
DROP TABLE IF EXISTS round_criteria;
DROP TABLE IF EXISTS scoring_criteria;
DROP TABLE IF EXISTS criteria_sets;
DROP TABLE IF EXISTS submission_assets;
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS judge_assignments;
DROP TABLE IF EXISTS rounds;
DROP TABLE IF EXISTS mentor_assignments;
DROP TABLE IF EXISTS team_invitations;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS tracks;
DROP TABLE IF EXISTS event_activities;
DROP TABLE IF EXISTS event_coordinators;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS account_approvals;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

SELECT '=== All existing objects dropped successfully ===' AS message;

-- ============================================================================
-- SECTION 2: SECURITY & AUTHENTICATION TABLES
-- ============================================================================

-- -----------------------------------------------
-- Table: roles
-- Purpose: Global system roles (Admin, Organizer, User)
-- -----------------------------------------------
CREATE TABLE roles (
    role_id     INT AUTO_INCREMENT  PRIMARY KEY,
    role_name   VARCHAR(50)         NOT NULL UNIQUE,
    description VARCHAR(255)        NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: permissions
-- Purpose: Granular system permission keys for RBAC
-- -----------------------------------------------
CREATE TABLE permissions (
    permission_id   INT AUTO_INCREMENT  PRIMARY KEY,
    permission_key  VARCHAR(100)        NOT NULL UNIQUE,
    description     VARCHAR(255)        NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: users
-- Purpose: System credentials and account status
-- -----------------------------------------------
CREATE TABLE users (
    user_id         INT AUTO_INCREMENT  PRIMARY KEY,
    role_id         INT                 NOT NULL,
    email           VARCHAR(255)        NOT NULL,
    password_hash   VARCHAR(255)        NOT NULL,
    status          VARCHAR(20)         NOT NULL DEFAULT 'PENDING',
    created_at      DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at      DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at      DATETIME(3)         NULL,
    CONSTRAINT UQ_users_email UNIQUE (email),
    CONSTRAINT FK_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CONSTRAINT CHK_users_status CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: user_profiles
-- Purpose: Personal information, decoupled from credentials.
-- -----------------------------------------------
CREATE TABLE user_profiles (
    user_id         INT                 PRIMARY KEY,
    first_name      VARCHAR(100)        NOT NULL,
    last_name       VARCHAR(100)        NOT NULL,
    phone_number    VARCHAR(20)         NULL,
    student_id      VARCHAR(50)         NULL,
    student_type    VARCHAR(20)         NOT NULL DEFAULT 'NONE',
    university_name VARCHAR(150)        NULL,
    avatar_url      VARCHAR(512)        NULL,
    updated_at      DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT FK_user_profiles_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT CHK_profiles_student_type CHECK (student_type IN ('FPT', 'EXTERNAL', 'NONE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: account_approvals
-- Purpose: Log of admin approvals for user registrations
-- -----------------------------------------------
CREATE TABLE account_approvals (
    approval_id INT AUTO_INCREMENT  PRIMARY KEY,
    user_id     INT                 NOT NULL,
    reviewed_by INT                 NULL,
    status      VARCHAR(20)         NOT NULL DEFAULT 'PENDING',
    note        TEXT                NULL,
    created_at  DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    reviewed_at DATETIME(3)         NULL,
    CONSTRAINT FK_account_approvals_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_account_approvals_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT CHK_approvals_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '=== Section 2: Security & Authentication tables created ===' AS message;

-- ============================================================================
-- SECTION 3: EVENT MANAGEMENT TABLES
-- ============================================================================

-- -----------------------------------------------
-- Table: events
-- Purpose: Main hackathon events
-- -----------------------------------------------
CREATE TABLE events (
    event_id        INT AUTO_INCREMENT  PRIMARY KEY,
    event_name      VARCHAR(150)        NOT NULL,
    season          VARCHAR(10)         NOT NULL,
    academic_year   INT                 NOT NULL,
    start_date      DATE                NOT NULL,
    end_date        DATE                NOT NULL,
    status          VARCHAR(20)         NOT NULL DEFAULT 'DRAFT',
    created_at      DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at      DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at      DATETIME(3)         NULL,
    CONSTRAINT CHK_events_season CHECK (season IN ('SPRING', 'SUMMER', 'FALL')),
    CONSTRAINT CHK_events_status CHECK (status IN ('DRAFT', 'OPEN', 'ACTIVE', 'CLOSED')),
    CONSTRAINT CHK_events_dates CHECK (end_date >= start_date),
    CONSTRAINT CHK_events_year CHECK (academic_year > 2000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: event_coordinators
-- Purpose: Junction table assigning users as event coordinators (M:N)
-- -----------------------------------------------
CREATE TABLE event_coordinators (
    event_id    INT         NOT NULL,
    user_id     INT         NOT NULL,
    assigned_at DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT PK_event_coordinators PRIMARY KEY (event_id, user_id),
    CONSTRAINT FK_event_coordinators_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    CONSTRAINT FK_event_coordinators_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: event_activities
-- Purpose: Sub-events within a hackathon (workshops, webinars, etc.)
-- -----------------------------------------------
CREATE TABLE event_activities (
    activity_id     INT AUTO_INCREMENT  PRIMARY KEY,
    event_id        INT                 NOT NULL,
    organizer_id    INT                 NOT NULL,
    title           VARCHAR(150)        NOT NULL,
    description     TEXT                NULL,
    activity_type   VARCHAR(20)         NOT NULL,
    scheduled_start DATETIME(3)         NOT NULL,
    scheduled_end   DATETIME(3)         NOT NULL,
    location_url    VARCHAR(512)        NULL,
    created_at      DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at      DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at      DATETIME(3)         NULL,
    CONSTRAINT FK_event_activities_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    CONSTRAINT FK_event_activities_organizer FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT CHK_activities_type CHECK (activity_type IN ('WORKSHOP', 'WEBINAR', 'MENTORING', 'ANNOUNCEMENT')),
    CONSTRAINT CHK_activities_dates CHECK (scheduled_end >= scheduled_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: tracks
-- Purpose: Different divisions/verticals inside a hackathon
-- -----------------------------------------------
CREATE TABLE tracks (
    track_id    INT AUTO_INCREMENT  PRIMARY KEY,
    event_id    INT                 NOT NULL,
    track_name  VARCHAR(100)        NOT NULL,
    description TEXT                NULL,
    max_teams   INT                 NOT NULL DEFAULT 50,
    created_at  DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    deleted_at  DATETIME(3)         NULL,
    CONSTRAINT FK_tracks_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    CONSTRAINT CHK_tracks_max_teams CHECK (max_teams > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '=== Section 3: Event Management tables created ===' AS message;

-- ============================================================================
-- SECTION 4: TEAM MANAGEMENT TABLES
-- ============================================================================

-- -----------------------------------------------
-- Table: teams
-- Purpose: Hackathon participant teams
-- -----------------------------------------------
CREATE TABLE teams (
    team_id     INT AUTO_INCREMENT  PRIMARY KEY,
    track_id    INT                 NOT NULL,
    leader_id   INT                 NOT NULL,
    team_name   VARCHAR(100)        NOT NULL,
    status      VARCHAR(20)         NOT NULL DEFAULT 'PENDING',
    created_at  DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at  DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at  DATETIME(3)         NULL,
    CONSTRAINT UQ_track_team_name UNIQUE (track_id, team_name),
    CONSTRAINT FK_teams_track FOREIGN KEY (track_id) REFERENCES tracks(track_id) ON DELETE CASCADE,
    CONSTRAINT FK_teams_leader FOREIGN KEY (leader_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT CHK_teams_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'ELIMINATED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: team_members
-- Purpose: Junction table mapping users to teams (M:N)
-- -----------------------------------------------
CREATE TABLE team_members (
    team_id      INT         NOT NULL,
    user_id      INT         NOT NULL,
    role_in_team VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    joined_at    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    deleted_at   DATETIME(3)   NULL,
    CONSTRAINT PK_team_members PRIMARY KEY (team_id, user_id),
    CONSTRAINT FK_team_members_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    CONSTRAINT FK_team_members_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT CHK_team_members_role CHECK (role_in_team IN ('LEADER', 'MEMBER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: team_invitations
-- Purpose: Workflow-controlled team invitation system
-- -----------------------------------------------
CREATE TABLE team_invitations (
    invitation_id INT AUTO_INCREMENT  PRIMARY KEY,
    team_id       INT                 NOT NULL,
    inviter_id    INT                 NOT NULL,
    invitee_email VARCHAR(255)        NOT NULL,
    status        VARCHAR(20)         NOT NULL DEFAULT 'PENDING',
    created_at    DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expires_at    DATETIME(3)         NOT NULL,
    CONSTRAINT FK_team_invitations_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    CONSTRAINT FK_team_invitations_inviter FOREIGN KEY (inviter_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT CHK_invitations_status CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: mentor_assignments
-- Purpose: Assign mentors (users) to tracks or specific teams
-- -----------------------------------------------
CREATE TABLE mentor_assignments (
    assignment_id INT AUTO_INCREMENT  PRIMARY KEY,
    mentor_id     INT                 NOT NULL,
    track_id      INT                 NULL,
    team_id       INT                 NULL,
    assigned_at   DATETIME(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT FK_mentor_assignments_mentor FOREIGN KEY (mentor_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_mentor_assignments_track FOREIGN KEY (track_id) REFERENCES tracks(track_id) ON DELETE CASCADE,
    CONSTRAINT FK_mentor_assignments_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    CONSTRAINT CHK_mentor_scope CHECK (track_id IS NOT NULL OR team_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '=== Section 4: Team Management tables created ===' AS message;

-- ============================================================================
-- SECTION 5: ROUNDS & SUBMISSIONS
-- ============================================================================

-- -----------------------------------------------
-- Table: rounds
-- Purpose: Evaluation rounds within a hackathon event
-- -----------------------------------------------
CREATE TABLE rounds (
    round_id            INT AUTO_INCREMENT  PRIMARY KEY,
    event_id            INT                 NOT NULL,
    round_name          VARCHAR(100)        NOT NULL,
    round_order         INT                 NOT NULL,
    submission_deadline DATETIME(3)         NOT NULL,
    top_n_advance       INT                 NULL,
    status              VARCHAR(20)         NOT NULL DEFAULT 'UPCOMING',
    created_at          DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at          DATETIME(3)         NULL,
    CONSTRAINT UQ_event_round_order UNIQUE (event_id, round_order),
    CONSTRAINT FK_rounds_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    CONSTRAINT CHK_rounds_order CHECK (round_order > 0),
    CONSTRAINT CHK_rounds_top_n CHECK (top_n_advance IS NULL OR top_n_advance > 0),
    CONSTRAINT CHK_rounds_status CHECK (status IN ('UPCOMING', 'ACTIVE', 'CLOSED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: judge_assignments
-- Purpose: Assign users as judges for specific rounds
-- -----------------------------------------------
CREATE TABLE judge_assignments (
    assignment_id INT AUTO_INCREMENT  PRIMARY KEY,
    judge_id      INT                 NOT NULL,
    round_id      INT                 NOT NULL,
    judge_type    VARCHAR(20)         NOT NULL DEFAULT 'INTERNAL',
    assigned_at   DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT UQ_judge_round UNIQUE (judge_id, round_id),
    CONSTRAINT FK_judge_assignments_judge FOREIGN KEY (judge_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_judge_assignments_round FOREIGN KEY (round_id) REFERENCES rounds(round_id) ON DELETE CASCADE,
    CONSTRAINT CHK_judge_type CHECK (judge_type IN ('INTERNAL', 'GUEST'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: submissions
-- Purpose: Team project submissions per round
-- -----------------------------------------------
CREATE TABLE submissions (
    submission_id INT AUTO_INCREMENT  PRIMARY KEY,
    team_id       INT                 NOT NULL,
    round_id      INT                 NOT NULL,
    project_name  VARCHAR(150)        NOT NULL,
    description   TEXT                NULL,
    submitted_at  DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at    DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT UQ_team_round UNIQUE (team_id, round_id),
    CONSTRAINT FK_submissions_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    CONSTRAINT FK_submissions_round FOREIGN KEY (round_id) REFERENCES rounds(round_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: submission_assets
-- Purpose: Flexible storage for submission deliverables
-- -----------------------------------------------
CREATE TABLE submission_assets (
    asset_id      INT AUTO_INCREMENT  PRIMARY KEY,
    submission_id INT                 NOT NULL,
    asset_type    VARCHAR(30)         NOT NULL,
    asset_url     VARCHAR(512)        NOT NULL,
    created_at    DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT FK_submission_assets_sub FOREIGN KEY (submission_id) REFERENCES submissions(submission_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '=== Section 5: Rounds & Submissions tables created ===' AS message;

-- ============================================================================
-- SECTION 6: SCORING & RANKINGS
-- ============================================================================

-- -----------------------------------------------
-- Table: criteria_sets
-- Purpose: Reusable groups of scoring criteria per event
-- -----------------------------------------------
CREATE TABLE criteria_sets (
    set_id      INT AUTO_INCREMENT  PRIMARY KEY,
    event_id    INT                 NOT NULL,
    set_name    VARCHAR(100)        NOT NULL,
    description TEXT                NULL,
    created_at  DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: scoring_criteria
-- Purpose: Individual rubric items (e.g., Innovation, Code Quality)
-- -----------------------------------------------
CREATE TABLE scoring_criteria (
    criteria_id     INT AUTO_INCREMENT  PRIMARY KEY,
    set_id          INT                 NOT NULL,
    criteria_name   VARCHAR(100)        NOT NULL,
    description     TEXT                NULL,
    max_score       DECIMAL(5,2)        NOT NULL,
    default_weight  DECIMAL(5,2)        NOT NULL DEFAULT 1.00,
    created_at      DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT FK_scoring_criteria_set FOREIGN KEY (set_id) REFERENCES criteria_sets(set_id) ON DELETE CASCADE,
    CONSTRAINT CHK_criteria_max_score CHECK (max_score > 0),
    CONSTRAINT CHK_criteria_weight CHECK (default_weight >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: round_criteria
-- Purpose: Maps criteria to rounds with optional weight overrides
-- -----------------------------------------------
CREATE TABLE round_criteria (
    round_id        INT             NOT NULL,
    criteria_id     INT             NOT NULL,
    weight_override DECIMAL(5,2)    NULL,
    CONSTRAINT PK_round_criteria PRIMARY KEY (round_id, criteria_id),
    CONSTRAINT FK_round_criteria_round FOREIGN KEY (round_id) REFERENCES rounds(round_id) ON DELETE CASCADE,
    CONSTRAINT FK_round_criteria_criteria FOREIGN KEY (criteria_id) REFERENCES scoring_criteria(criteria_id) ON DELETE CASCADE,
    CONSTRAINT CHK_round_criteria_weight CHECK (weight_override IS NULL OR weight_override >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: scores
-- Purpose: Individual judge score entries per submission per criteria
-- -----------------------------------------------
CREATE TABLE scores (
    score_id      INT AUTO_INCREMENT  PRIMARY KEY,
    submission_id INT                 NOT NULL,
    judge_id      INT                 NOT NULL,
    criteria_id   INT                 NOT NULL,
    score_value   DECIMAL(5,2)        NOT NULL,
    is_draft      TINYINT(1)          NOT NULL DEFAULT 1,
    scored_at     DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at    DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT UQ_submission_judge_criteria UNIQUE (submission_id, judge_id, criteria_id),
    CONSTRAINT FK_scores_submission FOREIGN KEY (submission_id) REFERENCES submissions(submission_id) ON DELETE CASCADE,
    CONSTRAINT FK_scores_judge FOREIGN KEY (judge_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_scores_criteria FOREIGN KEY (criteria_id) REFERENCES scoring_criteria(criteria_id) ON DELETE CASCADE,
    CONSTRAINT CHK_scores_value CHECK (score_value >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: round_rankings
-- Purpose: Pre-calculated team rankings per round
-- -----------------------------------------------
CREATE TABLE round_rankings (
    ranking_id      INT AUTO_INCREMENT  PRIMARY KEY,
    team_id         INT                 NOT NULL,
    round_id        INT                 NOT NULL,
    total_score     DECIMAL(6,2)        NOT NULL,
    position        INT                 NOT NULL,
    is_advanced     TINYINT(1)          NOT NULL DEFAULT 0,
    calculated_at   DATETIME(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT UQ_team_round_rank UNIQUE (team_id, round_id),
    CONSTRAINT FK_round_rankings_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    CONSTRAINT FK_round_rankings_round FOREIGN KEY (round_id) REFERENCES rounds(round_id) ON DELETE CASCADE,
    CONSTRAINT CHK_rankings_score CHECK (total_score >= 0),
    CONSTRAINT CHK_rankings_position CHECK (position > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '=== Section 6: Scoring & Rankings tables created ===' AS message;

-- ============================================================================
-- SECTION 7: REWARDS, NOTIFICATIONS, & AUDIT TABLES
-- ============================================================================

-- -----------------------------------------------
-- Table: prizes
-- Purpose: Prize definitions per event
-- -----------------------------------------------
CREATE TABLE prizes (
    prize_id        INT AUTO_INCREMENT  PRIMARY KEY,
    event_id        INT                 NOT NULL,
    prize_name      VARCHAR(100)        NOT NULL,
    description     TEXT                NULL,
    rank_position   INT                 NOT NULL,
    cash_value      DECIMAL(12,2)       NULL,
    CONSTRAINT FK_prizes_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    CONSTRAINT CHK_prizes_rank CHECK (rank_position > 0),
    CONSTRAINT CHK_prizes_cash CHECK (cash_value IS NULL OR cash_value >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: prize_awards
-- Purpose: Records which team won which prize
-- -----------------------------------------------
CREATE TABLE prize_awards (
    award_id    INT AUTO_INCREMENT  PRIMARY KEY,
    team_id     INT                 NOT NULL,
    prize_id    INT                 NOT NULL,
    awarded_at  DATETIME(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT UQ_prize_awards_prize UNIQUE (prize_id),
    CONSTRAINT FK_prize_awards_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    CONSTRAINT FK_prize_awards_prize FOREIGN KEY (prize_id) REFERENCES prizes(prize_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: notifications
-- Purpose: In-app notification system
-- -----------------------------------------------
CREATE TABLE notifications (
    notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT                  NOT NULL,
    title           VARCHAR(150)         NOT NULL,
    message         TEXT                 NOT NULL,
    is_read         TINYINT(1)           NOT NULL DEFAULT 0,
    created_at      DATETIME(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT FK_notifications_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- Table: audit_logs
-- Purpose: Immutable system activity log for compliance
-- -----------------------------------------------
CREATE TABLE audit_logs (
    log_id          BIGINT AUTO_INCREMENT    PRIMARY KEY,
    performed_by    INT                     NULL,
    action_type     VARCHAR(50)             NOT NULL,
    entity_type     VARCHAR(50)             NOT NULL,
    entity_id       INT                     NULL,
    details         JSON                    NULL,
    ip_address      VARCHAR(45)             NULL,
    created_at      DATETIME(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT FK_audit_logs_user FOREIGN KEY (performed_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '=== Section 7: Rewards, Notifications & Audit tables created ===' AS message;

-- ============================================================================
-- SECTION 8: INDEX DEFINITIONS
-- ============================================================================

CREATE INDEX IX_users_role ON users(role_id);
CREATE INDEX IX_users_email ON users(email);
CREATE INDEX IX_user_profiles_name ON user_profiles(last_name, first_name);
CREATE INDEX IX_account_approvals_user ON account_approvals(user_id);
CREATE INDEX IX_account_approvals_status ON account_approvals(status);

CREATE INDEX IX_event_coordinators_user ON event_coordinators(user_id);
CREATE INDEX IX_event_activities_event ON event_activities(event_id);
CREATE INDEX IX_event_activities_organizer ON event_activities(organizer_id);
CREATE INDEX IX_tracks_event ON tracks(event_id);

CREATE INDEX IX_teams_track ON teams(track_id);
CREATE INDEX IX_teams_leader ON teams(leader_id);
CREATE INDEX IX_team_members_user ON team_members(user_id);
CREATE INDEX IX_team_invitations_team ON team_invitations(team_id);
CREATE INDEX IX_team_invitations_email ON team_invitations(invitee_email);
CREATE INDEX IX_mentor_assignments_mentor ON mentor_assignments(mentor_id);
CREATE INDEX IX_mentor_assignments_track ON mentor_assignments(track_id);
CREATE INDEX IX_mentor_assignments_team ON mentor_assignments(team_id);

CREATE INDEX IX_rounds_event ON rounds(event_id);
CREATE INDEX IX_judge_assignments_judge ON judge_assignments(judge_id);
CREATE INDEX IX_judge_assignments_round ON judge_assignments(round_id);
CREATE INDEX IX_submissions_team ON submissions(team_id);
CREATE INDEX IX_submissions_round ON submissions(round_id);
CREATE INDEX IX_submission_assets_sub ON submission_assets(submission_id);

CREATE INDEX IX_criteria_sets_event ON criteria_sets(event_id);
CREATE INDEX IX_scoring_criteria_set ON scoring_criteria(set_id);
CREATE INDEX IX_scores_submission ON scores(submission_id);
CREATE INDEX IX_scores_judge ON scores(judge_id);
CREATE INDEX IX_scores_criteria ON scores(criteria_id);
CREATE INDEX IX_round_rankings_team ON round_rankings(team_id);
CREATE INDEX IX_round_rankings_round ON round_rankings(round_id);

CREATE INDEX IX_prizes_event ON prizes(event_id);
CREATE INDEX IX_prize_awards_team ON prize_awards(team_id);
CREATE INDEX IX_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IX_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX IX_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IX_audit_logs_created ON audit_logs(created_at DESC);

SELECT '=== Section 8: All indexes created ===' AS message;
SELECT '=== DDL Script completed successfully! ===' AS message;

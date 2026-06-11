-- =====================================================
-- SEAL Hackathon Management System
-- MySQL DDL Script  (idempotent — safe to re-run)
-- 17 tables
--
-- CHANGELOG (assignment redesign):
--   - Removed TeamAssignment (duplicate + wrong business unit).
--   - Slimmed UserEventRole to pure N-N "who is allowed to be what role".
--   - Added JudgeAssignment (judge scores per round + track).
--   - Added MentorAssignment (mentor supports per track).
--   - Added Round.is_final flag to distinguish final round (judge-all)
--     from preliminary rounds (judge-per-track).
-- =====================================================

-- Drop and recreate so this script is always safe to re-run.
-- WARNING: this wipes all existing data. For production use a
-- proper migration tool (Flyway / Liquibase) instead.
DROP DATABASE IF EXISTS seal_hackathon;

CREATE DATABASE seal_hackathon
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE seal_hackathon;

-- =====================================================
-- USER & ROLE MANAGEMENT
-- =====================================================

CREATE TABLE Role (
  role_id     INT          NOT NULL AUTO_INCREMENT,
  role_name   VARCHAR(50)  NOT NULL COMMENT 'EVENT_COORDINATOR, MENTOR, JUDGE',
  description VARCHAR(255),
  PRIMARY KEY (role_id),
  UNIQUE KEY uq_role_name (role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- password_hash is NULL-able: OAuth2 users (Google/GitHub) have no local password.
-- provider tracks which auth method was used: LOCAL | GOOGLE | GITHUB
CREATE TABLE `User` (
  user_id       INT          NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255)          COMMENT 'NULL for OAuth2 users',
  full_name     VARCHAR(255) NOT NULL,
  user_type     VARCHAR(20)  NOT NULL COMMENT 'FPT_STUDENT, EXTERNAL_STUDENT, STAFF',
  provider      VARCHAR(20)  NOT NULL DEFAULT 'LOCAL' COMMENT 'LOCAL, GOOGLE, GITHUB',
  provider_id   VARCHAR(255)          COMMENT 'Unique user ID from the OAuth2 provider',
  avatar_url    VARCHAR(500)          COMMENT 'Profile picture URL from OAuth2 provider',
  student_id    VARCHAR(50)           COMMENT 'FPT student ID or external student ID',
  university    VARCHAR(255)          COMMENT 'For external students only',
  is_approved   BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expired_at    DATETIME              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_email (email),
  KEY idx_user_type (user_type),
  KEY idx_user_provider (provider, provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- EVENT STRUCTURE
-- =====================================================

CREATE TABLE HackathonEvent (
  event_id           INT          NOT NULL AUTO_INCREMENT,
  name               VARCHAR(255) NOT NULL COMMENT 'e.g. SEAL Spring 2026',
  season             VARCHAR(20)  NOT NULL COMMENT 'SPRING, SUMMER, FALL',
  year               INT          NOT NULL,
  description        TEXT,
  registration_start DATETIME,
  registration_end   DATETIME,
  start_date         DATETIME     NOT NULL,
  end_date           DATETIME     NOT NULL,
  status             VARCHAR(20)  NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT, OPEN, IN_PROGRESS, COMPLETED, CANCELLED',
  created_by         INT          NOT NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id),
  KEY idx_event_season_year (season, year),
  KEY idx_event_status (status),
  CONSTRAINT fk_event_created_by FOREIGN KEY (created_by) REFERENCES `User` (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Track (
  track_id    INT          NOT NULL AUTO_INCREMENT,
  event_id    INT          NOT NULL,
  name        VARCHAR(255) NOT NULL COMMENT 'e.g. Web Application, AI Solution',
  description TEXT,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (track_id),
  UNIQUE KEY uq_track_event_name (event_id, name),
  CONSTRAINT fk_track_event FOREIGN KEY (event_id) REFERENCES HackathonEvent (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Round (
  round_id            INT          NOT NULL AUTO_INCREMENT,
  event_id            INT          NOT NULL,
  name                VARCHAR(255) NOT NULL COMMENT 'e.g. Preliminary, Semi-final, Final',
  order_number        INT          NOT NULL COMMENT 'Round sequence: 1, 2, 3...',
  start_time          DATETIME     NOT NULL,
  end_time            DATETIME     NOT NULL,
  submission_deadline DATETIME     NOT NULL,
  top_n_advance       INT                   COMMENT 'Top N teams per track that advance to next round',
  is_final            BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'TRUE = final round (judges score all, no per-track split)',
  is_calibration      BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'TRUE for RBL judge calibration rounds',
  status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, ACTIVE, CLOSED, FINALIZED',
  PRIMARY KEY (round_id),
  UNIQUE KEY uq_round_event_order (event_id, order_number),
  CONSTRAINT fk_round_event FOREIGN KEY (event_id) REFERENCES HackathonEvent (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- USER EVENT ROLE  (must come after Event)
-- Pure N-N: lets one user hold multiple roles (e.g. JUDGE + MENTOR)
-- in the same event. This table answers "WHO IS ALLOWED to be what".
-- The actual work assignment lives in JudgeAssignment / MentorAssignment.
-- =====================================================

CREATE TABLE UserEventRole (
  id          INT       NOT NULL AUTO_INCREMENT,
  user_id     INT       NOT NULL,
  role_id     INT       NOT NULL,
  event_id    INT                COMMENT 'NULL for system-wide roles (ADMIN)',
  assigned_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by INT                COMMENT 'Coordinator who granted this role',
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_role_event (user_id, role_id, event_id),
  KEY idx_uer_user_event (user_id, event_id),
  KEY idx_uer_event_role (event_id, role_id),
  CONSTRAINT fk_uer_user     FOREIGN KEY (user_id)     REFERENCES `User` (user_id),
  CONSTRAINT fk_uer_role     FOREIGN KEY (role_id)     REFERENCES Role (role_id),
  CONSTRAINT fk_uer_event    FOREIGN KEY (event_id)    REFERENCES HackathonEvent (event_id),
  CONSTRAINT fk_uer_assigned FOREIGN KEY (assigned_by) REFERENCES `User` (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- WORK ASSIGNMENTS  (must come after Track & Round)
-- =====================================================

-- JudgeAssignment — which submissions a judge may score.
--   Preliminary round: track_id is set  -> judge scores that track only.
--   Final round:       track_id is NULL -> judge scores all teams.
-- Service layer must enforce:
--   round.is_final = FALSE  -> track_id REQUIRED
--   round.is_final = TRUE   -> track_id must be NULL
CREATE TABLE JudgeAssignment (
  id            INT          NOT NULL AUTO_INCREMENT,
  judge_user_id INT          NOT NULL,
  round_id      INT          NOT NULL,
  track_id      INT                   COMMENT 'NULL = score all (final round)',
  judge_type    VARCHAR(20)  NOT NULL COMMENT 'INTERNAL or GUEST',
  assigned_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by   INT,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_judge_round_track (judge_user_id, round_id, track_id),
  KEY idx_ja_round_track (round_id, track_id),
  KEY idx_ja_judge (judge_user_id),
  CONSTRAINT fk_ja_judge    FOREIGN KEY (judge_user_id) REFERENCES `User` (user_id),
  CONSTRAINT fk_ja_round    FOREIGN KEY (round_id)      REFERENCES Round (round_id),
  CONSTRAINT fk_ja_track    FOREIGN KEY (track_id)      REFERENCES Track (track_id),
  CONSTRAINT fk_ja_assigned FOREIGN KEY (assigned_by)   REFERENCES `User` (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- MentorAssignment — which track a mentor supports (whole event, not per round).
CREATE TABLE MentorAssignment (
  id             INT       NOT NULL AUTO_INCREMENT,
  mentor_user_id INT       NOT NULL,
  track_id       INT       NOT NULL,
  assigned_at    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by    INT,
  is_active      BOOLEAN   NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mentor_track (mentor_user_id, track_id),
  KEY idx_ma_track (track_id),
  CONSTRAINT fk_ma_mentor   FOREIGN KEY (mentor_user_id) REFERENCES `User` (user_id),
  CONSTRAINT fk_ma_track    FOREIGN KEY (track_id)       REFERENCES Track (track_id),
  CONSTRAINT fk_ma_assigned FOREIGN KEY (assigned_by)    REFERENCES `User` (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- TEAM MANAGEMENT
-- =====================================================

CREATE TABLE Team (
  team_id             INT          NOT NULL AUTO_INCREMENT,
  event_id            INT          NOT NULL,
  track_id            INT          NOT NULL,
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, APPROVED, REJECTED, DISQUALIFIED',
  disqualified_reason TEXT,
  disqualified_at     DATETIME,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id),
  UNIQUE KEY uq_team_event_name (event_id, name),
  KEY idx_team_track (track_id),
  KEY idx_team_status (status),
  CONSTRAINT fk_team_event FOREIGN KEY (event_id) REFERENCES HackathonEvent (event_id),
  CONSTRAINT fk_team_track FOREIGN KEY (track_id) REFERENCES Track (track_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE TeamMember (
  id          INT         NOT NULL AUTO_INCREMENT,
  team_id     INT         NOT NULL,
  user_id     INT         NOT NULL,
  member_role VARCHAR(20) NOT NULL DEFAULT 'MEMBER' COMMENT 'LEADER or MEMBER',
  joined_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_team_member (team_id, user_id),
  KEY idx_team_member_user (user_id),
  CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES Team (team_id),
  CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES `User` (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- SUBMISSION
-- =====================================================

CREATE TABLE Submission (
  submission_id INT          NOT NULL AUTO_INCREMENT,
  team_id       INT          NOT NULL,
  round_id      INT          NOT NULL,
  repo_url      VARCHAR(500),
  demo_url      VARCHAR(500),
  slide_url     VARCHAR(500),
  description   TEXT,
  submitted_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_by  INT          NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'SUBMITTED' COMMENT 'DRAFT, SUBMITTED, LATE, INVALID',
  PRIMARY KEY (submission_id),
  UNIQUE KEY uq_submission_team_round (team_id, round_id),
  KEY idx_submission_round (round_id),
  CONSTRAINT fk_sub_team      FOREIGN KEY (team_id)     REFERENCES Team (team_id),
  CONSTRAINT fk_sub_round     FOREIGN KEY (round_id)    REFERENCES Round (round_id),
  CONSTRAINT fk_sub_submitted FOREIGN KEY (submitted_by) REFERENCES `User` (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- SCORING
-- =====================================================

CREATE TABLE ScoringCriteriaTemplate (
  template_id INT          NOT NULL AUTO_INCREMENT,
  name        VARCHAR(255) NOT NULL COMMENT 'e.g. Standard Hackathon Criteria',
  description TEXT,
  is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE ScoringCriteria (
  criteria_id  INT           NOT NULL AUTO_INCREMENT,
  event_id     INT                    COMMENT 'NULL if criteria belongs to a template only',
  round_id     INT                    COMMENT 'Set for round-specific criteria',
  template_id  INT                    COMMENT 'Source template if inherited',
  name         VARCHAR(255)  NOT NULL COMMENT 'e.g. Innovation, Technical, UI/UX',
  description  TEXT,
  weight       DECIMAL(5,2)  NOT NULL DEFAULT 1.0,
  max_score    DECIMAL(5,2)  NOT NULL DEFAULT 10.0,
  order_number INT,
  PRIMARY KEY (criteria_id),
  KEY idx_criteria_event (event_id),
  KEY idx_criteria_round (round_id),
  CONSTRAINT fk_sc_event    FOREIGN KEY (event_id)    REFERENCES HackathonEvent (event_id),
  CONSTRAINT fk_sc_round    FOREIGN KEY (round_id)    REFERENCES Round (round_id),
  CONSTRAINT fk_sc_template FOREIGN KEY (template_id) REFERENCES ScoringCriteriaTemplate (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Score (
  score_id      INT           NOT NULL AUTO_INCREMENT,
  submission_id INT           NOT NULL,
  judge_user_id INT           NOT NULL,
  criteria_id   INT           NOT NULL,
  value         DECIMAL(5,2)  NOT NULL,
  comment       TEXT,
  is_draft      BOOLEAN       NOT NULL DEFAULT TRUE,
  scored_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (score_id),
  UNIQUE KEY uq_score (submission_id, judge_user_id, criteria_id),
  KEY idx_score_judge (judge_user_id),
  KEY idx_score_submission (submission_id),
  CONSTRAINT fk_score_submission FOREIGN KEY (submission_id) REFERENCES Submission (submission_id),
  CONSTRAINT fk_score_judge      FOREIGN KEY (judge_user_id) REFERENCES `User` (user_id),
  CONSTRAINT fk_score_criteria   FOREIGN KEY (criteria_id)   REFERENCES ScoringCriteria (criteria_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- RESULTS & RANKING
-- =====================================================

CREATE TABLE RoundResult (
  result_id     INT           NOT NULL AUTO_INCREMENT,
  team_id       INT           NOT NULL,
  round_id      INT           NOT NULL,
  total_score   DECIMAL(7,2)  NOT NULL,
  rank_position INT           NOT NULL,
  advanced      BOOLEAN       NOT NULL DEFAULT FALSE,
  is_published  BOOLEAN       NOT NULL DEFAULT FALSE,
  finalized_at  DATETIME,
  finalized_by  INT,
  PRIMARY KEY (result_id),
  UNIQUE KEY uq_result_team_round (team_id, round_id),
  KEY idx_result_round_rank (round_id, rank_position),
  CONSTRAINT fk_rr_team      FOREIGN KEY (team_id)     REFERENCES Team (team_id),
  CONSTRAINT fk_rr_round     FOREIGN KEY (round_id)    REFERENCES Round (round_id),
  CONSTRAINT fk_rr_finalized FOREIGN KEY (finalized_by) REFERENCES `User` (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Prize (
  prize_id      INT          NOT NULL AUTO_INCREMENT,
  event_id      INT          NOT NULL,
  track_id      INT                   COMMENT 'NULL for event-wide prizes',
  name          VARCHAR(255) NOT NULL COMMENT 'e.g. Champion, 1st Runner-up',
  description   TEXT,
  rank_position INT          NOT NULL,
  team_id       INT                   COMMENT 'Set after announcement',
  awarded_at    DATETIME,
  PRIMARY KEY (prize_id),
  CONSTRAINT fk_prize_event FOREIGN KEY (event_id) REFERENCES HackathonEvent (event_id),
  CONSTRAINT fk_prize_track FOREIGN KEY (track_id) REFERENCES Track (track_id),
  CONSTRAINT fk_prize_team  FOREIGN KEY (team_id)  REFERENCES Team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- ACCOUNT APPROVAL & TEAM INVITES
-- =====================================================

CREATE TABLE AccountApproval (
  approval_id  INT          NOT NULL AUTO_INCREMENT,
  user_id      INT          NOT NULL,
  reviewed_by  INT                   COMMENT 'Coordinator who approved/rejected',
  status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, APPROVED, REJECTED',
  note         TEXT,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at  DATETIME,
  PRIMARY KEY (approval_id),
  KEY idx_approval_user   (user_id),
  KEY idx_approval_status (status),
  CONSTRAINT fk_approval_user     FOREIGN KEY (user_id)     REFERENCES `User` (user_id),
  CONSTRAINT fk_approval_reviewer FOREIGN KEY (reviewed_by) REFERENCES `User` (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE TeamInvite (
  invite_id        INT          NOT NULL AUTO_INCREMENT,
  team_id          INT          NOT NULL,
  invited_user_id  INT          NOT NULL,
  invited_by       INT          NOT NULL,
  message          TEXT,
  status           VARCHAR(20)  NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, ACCEPTED, DECLINED',
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at     DATETIME,
  PRIMARY KEY (invite_id),
  UNIQUE KEY uq_invite_team_user (team_id, invited_user_id),
  KEY idx_invite_user (invited_user_id),
  CONSTRAINT fk_invite_team    FOREIGN KEY (team_id)         REFERENCES Team (team_id),
  CONSTRAINT fk_invite_invitee FOREIGN KEY (invited_user_id) REFERENCES `User` (user_id),
  CONSTRAINT fk_invite_inviter FOREIGN KEY (invited_by)      REFERENCES `User` (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- COMMUNICATION & AUDIT
-- =====================================================

CREATE TABLE Notification (
  notification_id   INT          NOT NULL AUTO_INCREMENT,
  recipient_user_id INT          NOT NULL,
  title             VARCHAR(255) NOT NULL,
  content           TEXT,
  type              VARCHAR(50)           COMMENT 'ANNOUNCEMENT, RESULT, REMINDER, ASSIGNMENT, APPROVAL',
  related_event_id  INT,
  is_read           BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id),
  KEY idx_notif_recipient_read (recipient_user_id, is_read),
  CONSTRAINT fk_notif_recipient FOREIGN KEY (recipient_user_id) REFERENCES `User` (user_id),
  CONSTRAINT fk_notif_event     FOREIGN KEY (related_event_id)  REFERENCES HackathonEvent (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE AuditLog (
  log_id        INT         NOT NULL AUTO_INCREMENT,
  actor_user_id INT         NOT NULL,
  action        VARCHAR(50) NOT NULL COMMENT 'CREATE_EVENT, UPDATE_SCORE, DISQUALIFY_TEAM, PUBLISH_RESULT...',
  target_type   VARCHAR(50)          COMMENT 'TEAM, SUBMISSION, SCORE, EVENT...',
  target_id     INT,
  reason        TEXT,
  metadata_json TEXT                 COMMENT 'JSON snapshot of before/after state',
  ip_address    VARCHAR(45),
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id),
  KEY idx_audit_target  (target_type, target_id),
  KEY idx_audit_actor   (actor_user_id),
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES `User` (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Roles are for event staff only.
-- Participants (FPT_STUDENT, EXTERNAL_STUDENT) are identified by User.user_type,
-- not by this table. Team LEADER/MEMBER distinction lives in TeamMember.member_role.
INSERT INTO Role (role_name, description) VALUES
  ('EVENT_COORDINATOR', 'SE Dept / PDP staff — manages events, approves accounts, assigns roles'),
  ('MENTOR',            'Faculty mentor assigned to a track'),
  ('JUDGE',             'Judge who scores submissions — INTERNAL or GUEST');

-- Seed users and coordinator bootstrap account are in seal_seed.sql

-- =====================================================
-- SEAL Hackathon — Round Timers migration
-- Adds RoundTimer + RoundTimerNotice to an EXISTING database without wiping data.
-- (seal_schema.sql already contains these tables for fresh installs.)
--
-- Safe to re-run: CREATE TABLE IF NOT EXISTS.
-- Usage:  mysql -u <user> -p seal_hackathon < seal_roundtimer.sql
-- =====================================================

USE seal_hackathon;

-- Live, server-authoritative countdown per (round, phase).
--   CONTEST phase -> gates team SUBMISSION (participants)
--   JUDGING phase -> gates judge SCORING   (judges)
CREATE TABLE IF NOT EXISTS RoundTimer (
  timer_id           INT          NOT NULL AUTO_INCREMENT,
  round_id           INT          NOT NULL,
  phase              VARCHAR(20)  NOT NULL COMMENT 'CONTEST (gates submission) | JUDGING (gates scoring)',
  status             VARCHAR(20)  NOT NULL DEFAULT 'IDLE' COMMENT 'IDLE, RUNNING, PAUSED, STOPPED, EXPIRED',
  duration_seconds   INT                   COMMENT 'Configured length of the run, in seconds',
  started_at         DATETIME              COMMENT 'When the current run started (last start/resume)',
  ends_at            DATETIME              COMMENT 'Source of truth for the countdown; remaining = ends_at - now',
  paused_at          DATETIME              COMMENT 'When paused (NULL while running)',
  remaining_at_pause INT                   COMMENT 'Seconds left captured at pause; ends_at = now + this on resume',
  milestone_minutes  VARCHAR(100) NOT NULL DEFAULT '30,15,5,1' COMMENT 'CSV of "minutes remaining" reminder marks; only marks < duration fire',
  notify_at_half     TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '1 = also notify when 50% of the time has elapsed',
  updated_at         DATETIME              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (timer_id),
  UNIQUE KEY uq_roundtimer_round_phase (round_id, phase),
  CONSTRAINT fk_roundtimer_round FOREIGN KEY (round_id) REFERENCES Round (round_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Exactly-once ledger for milestone fan-out (one row per fired mark).
CREATE TABLE IF NOT EXISTS RoundTimerNotice (
  id            INT          NOT NULL AUTO_INCREMENT,
  round_id      INT          NOT NULL,
  phase         VARCHAR(20)  NOT NULL,
  milestone_key VARCHAR(30)  NOT NULL COMMENT 'STARTED, REM_30, REM_15, REM_5, REM_1, HALF, EXPIRED, STOPPED',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_timer_notice (round_id, phase, milestone_key),
  CONSTRAINT fk_timer_notice_round FOREIGN KEY (round_id) REFERENCES Round (round_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

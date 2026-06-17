-- =====================================================
-- MIGRATION: add ReopenRequest table (non-destructive)
-- Run this on an EXISTING database that already has the SEAL schema/seed,
-- when you do NOT want to drop & re-run seal_schema.sql (which wipes data).
--
--   mysql -u root -p seal_hackathon < "migration_reopen_request.sql"
--
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS.
-- =====================================================

USE seal_hackathon;

CREATE TABLE IF NOT EXISTS ReopenRequest (
  request_id   INT          NOT NULL AUTO_INCREMENT,
  event_id     INT          NOT NULL,
  requested_by INT          NOT NULL COMMENT 'Coordinator who asked to reopen',
  reason       TEXT                  COMMENT 'Optional explanation for the admin',
  status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, APPROVED, REJECTED',
  resolved_by  INT                   COMMENT 'Admin who approved/rejected',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at  DATETIME,
  PRIMARY KEY (request_id),
  KEY idx_reopen_event  (event_id),
  KEY idx_reopen_status (status),
  CONSTRAINT fk_reopen_event     FOREIGN KEY (event_id)     REFERENCES HackathonEvent (event_id),
  CONSTRAINT fk_reopen_requester FOREIGN KEY (requested_by) REFERENCES `User` (user_id),
  CONSTRAINT fk_reopen_resolver  FOREIGN KEY (resolved_by)  REFERENCES `User` (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

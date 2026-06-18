-- =====================================================
-- MIGRATION: ensure the AuditLog table exists (non-destructive)
-- Run this on an EXISTING database that already has the SEAL schema/seed,
-- when you do NOT want to drop & re-run seal_schema.sql (which wipes data).
--
--   mysql -u root -p seal_hackathon < "migration_audit_log.sql"
--
-- NOTE: AuditLog is ALREADY part of seal_schema.sql, so on any database created
-- from the current schema this migration is a harmless no-op. It exists so an
-- OLDER database (created before AuditLog was added) gets the table without a
-- full rebuild. Safe to re-run: uses CREATE TABLE IF NOT EXISTS.
-- =====================================================

USE seal_hackathon;

CREATE TABLE IF NOT EXISTS AuditLog (
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

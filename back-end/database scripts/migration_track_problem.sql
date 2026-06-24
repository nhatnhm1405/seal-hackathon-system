-- =====================================================
-- MIGRATION: add "đề thi" (problem statement) columns to Track (non-destructive)
-- Run this on an EXISTING database that already has the SEAL schema/seed,
-- when you do NOT want to drop & re-run seal_schema.sql (which wipes data).
--
--   mysql -u root -p seal_hackathon < "migration_track_problem.sql"
--
-- The ALTER TABLE below must run ONCE — re-running errors with
-- "Duplicate column name", which is harmless (means it was already applied).
--
-- The Coordinator uploads ONE problem file per track (PDF/DOCX/ZIP) while the
-- event is in SETUP or IN_PROGRESS, then explicitly RELEASES it. Only members of
-- an APPROVED team assigned to that track may download a RELEASED problem.
-- The file itself is stored OUTSIDE the public /uploads dir and streamed through
-- an access-controlled endpoint, so only the storage key is kept here.
-- =====================================================

USE seal_hackathon;

ALTER TABLE Track
  ADD COLUMN problem_storage_key  VARCHAR(500)          COMMENT 'Internal path/key of the stored problem file. NULL = no problem uploaded yet' AFTER capacity,
  ADD COLUMN problem_file_name    VARCHAR(255)          COMMENT 'Original file name, shown to participants on download' AFTER problem_storage_key,
  ADD COLUMN problem_file_size    BIGINT                COMMENT 'File size in bytes (for display)' AFTER problem_file_name,
  ADD COLUMN problem_content_type VARCHAR(100)          COMMENT 'MIME type, returned on download' AFTER problem_file_size,
  ADD COLUMN problem_released     TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1 = published; participants in the track can download' AFTER problem_content_type,
  ADD COLUMN problem_uploaded_at  DATETIME              COMMENT 'When the problem file was uploaded / last replaced' AFTER problem_released,
  ADD COLUMN problem_released_at  DATETIME              COMMENT 'When the problem was released (NULL while hidden)' AFTER problem_uploaded_at;

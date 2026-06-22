-- =====================================================
-- MIGRATION: add Announcement table + link from Notification (non-destructive)
-- Run this on an EXISTING database that already has the SEAL schema/seed,
-- when you do NOT want to drop & re-run seal_schema.sql (which wipes data).
--
--   mysql -u root -p seal_hackathon < "migration_announcement.sql"
--
-- The CREATE TABLE is safe to re-run (IF NOT EXISTS). The ALTER TABLE that
-- adds Notification.announcement_id must run ONCE — re-running errors with
-- "Duplicate column name", which is harmless (means it was already applied).
-- =====================================================

USE seal_hackathon;

-- Announcements composed by a Mentor (scoped to a track) or a Coordinator
-- (scoped to the whole event). Source of truth for the "sent history" views
-- and for the "From / subject / date" shown in the email-style popup.
CREATE TABLE IF NOT EXISTS Announcement (
  announcement_id INT          NOT NULL AUTO_INCREMENT,
  sender_user_id  INT          NOT NULL,
  sender_role     VARCHAR(20)  NOT NULL COMMENT 'MENTOR, COORDINATOR',
  scope           VARCHAR(20)  NOT NULL COMMENT 'TRACK, EVENT',
  audience        VARCHAR(20)           COMMENT 'PARTICIPANT, JUDGE, MENTOR (who the coordinator targeted)',
  event_id        INT          NOT NULL,
  track_id        INT                   COMMENT 'NULL when scope = EVENT',
  title           VARCHAR(255) NOT NULL,
  content         TEXT,
  link_url        VARCHAR(1000)         COMMENT 'Optional attachment link (Drive/Form/Repo...)',
  recipient_count INT          NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (announcement_id),
  KEY idx_ann_sender (sender_user_id),
  KEY idx_ann_event  (event_id),
  KEY idx_ann_track  (track_id),
  CONSTRAINT fk_ann_sender FOREIGN KEY (sender_user_id) REFERENCES `User` (user_id),
  CONSTRAINT fk_ann_event  FOREIGN KEY (event_id)       REFERENCES HackathonEvent (event_id),
  CONSTRAINT fk_ann_track  FOREIGN KEY (track_id)       REFERENCES Track (track_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Link each delivered notification back to its announcement (nullable; only set
-- for ANNOUNCEMENT notifications). Lets the popup resolve sender + scope.
-- Run once — ignore "Duplicate column name 'announcement_id'" on re-run.
ALTER TABLE Notification
  ADD COLUMN announcement_id INT NULL AFTER type,
  ADD KEY idx_notif_announcement (announcement_id),
  ADD CONSTRAINT fk_notif_announcement
      FOREIGN KEY (announcement_id) REFERENCES Announcement (announcement_id);

-- If the Announcement table already existed WITHOUT the audience column
-- (created by an earlier version of this migration), add it. Run once;
-- ignore "Duplicate column name 'audience'" on re-run.
ALTER TABLE Announcement
  ADD COLUMN audience VARCHAR(20) NULL COMMENT 'PARTICIPANT, JUDGE, MENTOR, ALL' AFTER scope;

-- Optional attachment link (run once; ignore "Duplicate column name 'link_url'").
ALTER TABLE Announcement
  ADD COLUMN link_url VARCHAR(1000) NULL COMMENT 'Optional attachment link' AFTER content;

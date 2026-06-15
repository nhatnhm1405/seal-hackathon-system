-- =====================================================
-- Migration: add JoinRequest table
-- Participant-initiated requests to join an existing team
-- (reverse direction of TeamInvite). Apply once on existing DBs.
-- =====================================================

CREATE TABLE IF NOT EXISTS JoinRequest (
  request_id        INT          NOT NULL AUTO_INCREMENT,
  team_id           INT          NOT NULL,
  requester_user_id INT          NOT NULL,
  message           TEXT,
  status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, ACCEPTED, DECLINED',
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at      DATETIME,
  PRIMARY KEY (request_id),
  UNIQUE KEY uq_join_team_user (team_id, requester_user_id),
  KEY idx_join_requester (requester_user_id),
  CONSTRAINT fk_join_team      FOREIGN KEY (team_id)           REFERENCES Team (team_id),
  CONSTRAINT fk_join_requester FOREIGN KEY (requester_user_id) REFERENCES `User` (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

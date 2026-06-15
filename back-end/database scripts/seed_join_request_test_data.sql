USE seal_hackathon;

SET @old_sql_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SET @test_password_hash =
  '$2a$10$0ck6TfX5CqlTb8NFxY63guW52UpO3kFCbJYtKOA5a6/iqPzuB/Veq';

INSERT INTO `User` (email, password_hash, full_name, user_type, student_id, university, is_approved, is_active)
SELECT 'join.tester@fpt.edu.vn', @test_password_hash, 'Join Tester', 'FPT_STUDENT', 'JRTEST001', NULL, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM `User` WHERE email = 'join.tester@fpt.edu.vn');

INSERT INTO `User` (email, password_hash, full_name, user_type, student_id, university, is_approved, is_active)
SELECT 'join.leader.ai@fpt.edu.vn', @test_password_hash, 'Join AI Leader', 'FPT_STUDENT', 'JRLEAD001', NULL, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM `User` WHERE email = 'join.leader.ai@fpt.edu.vn');

INSERT INTO `User` (email, password_hash, full_name, user_type, student_id, university, is_approved, is_active)
SELECT 'join.leader.web@fpt.edu.vn', @test_password_hash, 'Join Web Leader', 'FPT_STUDENT', 'JRLEAD002', NULL, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM `User` WHERE email = 'join.leader.web@fpt.edu.vn');

INSERT INTO `User` (email, password_hash, full_name, user_type, student_id, university, is_approved, is_active)
SELECT 'join.leader.full@fpt.edu.vn', @test_password_hash, 'Join Full Leader', 'FPT_STUDENT', 'JRLEAD003', NULL, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM `User` WHERE email = 'join.leader.full@fpt.edu.vn');

INSERT INTO `User` (email, password_hash, full_name, user_type, student_id, university, is_approved, is_active)
SELECT 'join.leader.pending@fpt.edu.vn', @test_password_hash, 'Join Pending Leader', 'FPT_STUDENT', 'JRLEAD004', NULL, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM `User` WHERE email = 'join.leader.pending@fpt.edu.vn');

INSERT INTO `User` (email, password_hash, full_name, user_type, student_id, university, is_approved, is_active)
SELECT 'join.member1@fpt.edu.vn', @test_password_hash, 'Join Member One', 'FPT_STUDENT', 'JRMEM001', NULL, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM `User` WHERE email = 'join.member1@fpt.edu.vn');

INSERT INTO `User` (email, password_hash, full_name, user_type, student_id, university, is_approved, is_active)
SELECT 'join.member2@fpt.edu.vn', @test_password_hash, 'Join Member Two', 'FPT_STUDENT', 'JRMEM002', NULL, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM `User` WHERE email = 'join.member2@fpt.edu.vn');

INSERT INTO `User` (email, password_hash, full_name, user_type, student_id, university, is_approved, is_active)
SELECT 'join.member3@fpt.edu.vn', @test_password_hash, 'Join Member Three', 'FPT_STUDENT', 'JRMEM003', NULL, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM `User` WHERE email = 'join.member3@fpt.edu.vn');

INSERT INTO `User` (email, password_hash, full_name, user_type, student_id, university, is_approved, is_active)
SELECT 'join.member4@fpt.edu.vn', @test_password_hash, 'Join Member Four', 'FPT_STUDENT', 'JRMEM004', NULL, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM `User` WHERE email = 'join.member4@fpt.edu.vn');

UPDATE `User`
SET password_hash = @test_password_hash,
    is_approved = TRUE,
    is_active = TRUE
WHERE email IN (
  'join.tester@fpt.edu.vn',
  'join.leader.ai@fpt.edu.vn',
  'join.leader.web@fpt.edu.vn',
  'join.leader.full@fpt.edu.vn',
  'join.leader.pending@fpt.edu.vn',
  'join.member1@fpt.edu.vn',
  'join.member2@fpt.edu.vn',
  'join.member3@fpt.edu.vn',
  'join.member4@fpt.edu.vn'
);

SET @tester_id := (SELECT user_id FROM `User` WHERE email = 'join.tester@fpt.edu.vn');
SET @ai_leader_id := (SELECT user_id FROM `User` WHERE email = 'join.leader.ai@fpt.edu.vn');
SET @web_leader_id := (SELECT user_id FROM `User` WHERE email = 'join.leader.web@fpt.edu.vn');
SET @full_leader_id := (SELECT user_id FROM `User` WHERE email = 'join.leader.full@fpt.edu.vn');
SET @pending_leader_id := (SELECT user_id FROM `User` WHERE email = 'join.leader.pending@fpt.edu.vn');
SET @member1_id := (SELECT user_id FROM `User` WHERE email = 'join.member1@fpt.edu.vn');
SET @member2_id := (SELECT user_id FROM `User` WHERE email = 'join.member2@fpt.edu.vn');
SET @member3_id := (SELECT user_id FROM `User` WHERE email = 'join.member3@fpt.edu.vn');
SET @member4_id := (SELECT user_id FROM `User` WHERE email = 'join.member4@fpt.edu.vn');

INSERT INTO HackathonEvent
  (name, season, year, description, registration_start, registration_end, start_date, end_date, status)
SELECT
  'SEAL Join Request Test 2026',
  'JOIN_TEST',
  2026,
  'Dedicated OPEN event for Join Request API testing.',
  '2026-01-01 00:00:00',
  '2026-12-31 23:59:59',
  '2026-12-01 08:00:00',
  '2026-12-02 23:59:59',
  'OPEN'
WHERE NOT EXISTS (
  SELECT 1 FROM HackathonEvent WHERE name = 'SEAL Join Request Test 2026'
);

UPDATE HackathonEvent
SET status = 'OPEN',
    registration_start = '2026-01-01 00:00:00',
    registration_end = '2026-12-31 23:59:59'
WHERE name = 'SEAL Join Request Test 2026';

SET @event_id := (SELECT event_id FROM HackathonEvent WHERE name = 'SEAL Join Request Test 2026' LIMIT 1);

INSERT INTO Track (event_id, name, description)
SELECT @event_id, 'AI Solution', 'Join Request test AI track'
WHERE NOT EXISTS (SELECT 1 FROM Track WHERE event_id = @event_id AND name = 'AI Solution');

INSERT INTO Track (event_id, name, description)
SELECT @event_id, 'Web Application', 'Join Request test Web track'
WHERE NOT EXISTS (SELECT 1 FROM Track WHERE event_id = @event_id AND name = 'Web Application');

SET @ai_track_id := (SELECT track_id FROM Track WHERE event_id = @event_id AND name = 'AI Solution' LIMIT 1);
SET @web_track_id := (SELECT track_id FROM Track WHERE event_id = @event_id AND name = 'Web Application' LIMIT 1);

INSERT INTO Team (event_id, track_id, name, description, status)
SELECT @event_id, @ai_track_id, 'Join AI Open', 'Approved AI team with open slots', 'APPROVED'
WHERE NOT EXISTS (SELECT 1 FROM Team WHERE event_id = @event_id AND name = 'Join AI Open');

INSERT INTO Team (event_id, track_id, name, description, status)
SELECT @event_id, @web_track_id, 'Join Web Open', 'Approved Web team with open slots', 'APPROVED'
WHERE NOT EXISTS (SELECT 1 FROM Team WHERE event_id = @event_id AND name = 'Join Web Open');

INSERT INTO Team (event_id, track_id, name, description, status)
SELECT @event_id, @ai_track_id, 'Join AI Full', 'Approved AI team already full', 'APPROVED'
WHERE NOT EXISTS (SELECT 1 FROM Team WHERE event_id = @event_id AND name = 'Join AI Full');

INSERT INTO Team (event_id, track_id, name, description, status)
SELECT @event_id, @ai_track_id, 'Join AI Pending', 'Pending AI team should not be joinable', 'PENDING'
WHERE NOT EXISTS (SELECT 1 FROM Team WHERE event_id = @event_id AND name = 'Join AI Pending');

UPDATE Team SET status = 'APPROVED'
WHERE event_id = @event_id AND name IN ('Join AI Open', 'Join Web Open', 'Join AI Full');

UPDATE Team SET status = 'PENDING'
WHERE event_id = @event_id AND name = 'Join AI Pending';

SET @ai_open_team_id := (SELECT team_id FROM Team WHERE event_id = @event_id AND name = 'Join AI Open' LIMIT 1);
SET @web_open_team_id := (SELECT team_id FROM Team WHERE event_id = @event_id AND name = 'Join Web Open' LIMIT 1);
SET @ai_full_team_id := (SELECT team_id FROM Team WHERE event_id = @event_id AND name = 'Join AI Full' LIMIT 1);
SET @ai_pending_team_id := (SELECT team_id FROM Team WHERE event_id = @event_id AND name = 'Join AI Pending' LIMIT 1);

DELETE jr
FROM JoinRequest jr
JOIN Team t ON t.team_id = jr.team_id
WHERE t.event_id = @event_id OR jr.requester_user_id = @tester_id;

DELETE tm
FROM TeamMember tm
JOIN Team t ON t.team_id = tm.team_id
WHERE t.event_id = @event_id;

INSERT IGNORE INTO TeamMember (team_id, user_id, member_role) VALUES
  (@ai_open_team_id, @ai_leader_id, 'LEADER'),
  (@web_open_team_id, @web_leader_id, 'LEADER'),
  (@ai_full_team_id, @full_leader_id, 'LEADER'),
  (@ai_pending_team_id, @pending_leader_id, 'LEADER'),
  (@ai_full_team_id, @member1_id, 'MEMBER'),
  (@ai_full_team_id, @member2_id, 'MEMBER'),
  (@ai_full_team_id, @member3_id, 'MEMBER'),
  (@ai_full_team_id, @member4_id, 'MEMBER'),
  (@web_open_team_id, @member1_id, 'MEMBER');

SELECT
  @event_id AS join_request_test_event_id,
  @tester_id AS tester_user_id,
  'join.tester@fpt.edu.vn' AS tester_email;

SELECT
  t.team_id,
  t.name AS team_name,
  tr.name AS track_name,
  e.status AS event_status,
  t.status AS team_status,
  COUNT(tm.user_id) AS member_count
FROM Team t
JOIN HackathonEvent e ON e.event_id = t.event_id
JOIN Track tr ON tr.track_id = t.track_id
LEFT JOIN TeamMember tm ON tm.team_id = t.team_id
WHERE t.event_id = @event_id
GROUP BY t.team_id, t.name, tr.name, e.status, t.status
ORDER BY t.team_id;

SET SQL_SAFE_UPDATES = @old_sql_safe_updates;

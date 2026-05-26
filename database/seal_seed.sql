USE seal_hackathon;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Roles (đã có trong script chính, bỏ qua nếu đã chạy)
INSERT IGNORE INTO Role (role_name, description) VALUES
  ('ADMIN',             'System administrator'),
  ('EVENT_COORDINATOR', 'SE Dept / PDP staff managing events'),
  ('MENTOR',            'Faculty mentor assigned to a track'),
  ('JUDGE',             'Judge scoring submissions'),
  ('TEAM_LEADER',       'Team representative, can submit'),
  ('TEAM_MEMBER',       'Regular team participant');

-- Users
INSERT INTO User (email, password_hash, full_name, user_type, student_code, university, is_approved, is_active) VALUES
  ('coordinator@fpt.edu.vn', '$2a$10$hashed', 'Nguyen Van Coordinator', 'FACULTY',          NULL,      'FPT University', TRUE,  TRUE),
  ('mentor.an@fpt.edu.vn',   '$2a$10$hashed', 'Tran Van An',            'FACULTY',          NULL,      'FPT University', TRUE,  TRUE),
  ('judge.binh@fpt.edu.vn',  '$2a$10$hashed', 'Le Van Binh',            'FACULTY',          NULL,      'FPT University', TRUE,  TRUE),
  ('guest.judge@gmail.com',  '$2a$10$hashed', 'Pham Thi Guest',         'GUEST',            NULL,      NULL,             TRUE,  TRUE),
  ('leader1@fpt.edu.vn',     '$2a$10$hashed', 'Hoang Van Leader',       'FPT_STUDENT',      'SE001',   'FPT University', TRUE,  TRUE),
  ('member1@fpt.edu.vn',     '$2a$10$hashed', 'Nguyen Thi Member',      'FPT_STUDENT',      'SE002',   'FPT University', TRUE,  TRUE),
  ('member2@fpt.edu.vn',     '$2a$10$hashed', 'Tran Van Member',        'FPT_STUDENT',      'SE003',   'FPT University', TRUE,  TRUE),
  ('leader2@hcmut.edu.vn',   '$2a$10$hashed', 'Do Van Leader2',         'EXTERNAL_STUDENT', 'BK001',   'HCMUT',          TRUE,  TRUE),
  ('member3@hcmut.edu.vn',   '$2a$10$hashed', 'Vo Thi Member3',         'EXTERNAL_STUDENT', 'BK002',   'HCMUT',          TRUE,  TRUE),
  ('member4@hcmut.edu.vn',   '$2a$10$hashed', 'Ly Van Member4',         'EXTERNAL_STUDENT', 'BK003',   'HCMUT',          FALSE, TRUE);

-- HackathonEvent
INSERT INTO HackathonEvent (name, season, year, description, registration_start, registration_end, start_date, end_date, status, created_by) VALUES
  ('SEAL Spring 2026', 'SPRING', 2026,
   'Annual SEAL Hackathon - Spring season',
   '2026-01-01 00:00:00', '2026-02-28 23:59:59',
   '2026-03-01 08:00:00', '2026-05-31 23:59:59',
   'IN_PROGRESS', 1);

-- Tracks
INSERT INTO Track (event_id, name, description) VALUES
  (1, 'Web Application',  'Build a full-stack web application'),
  (1, 'AI Solution',      'Build an AI-powered product'),
  (1, 'Social Impact',    'Tech solution for social problems');

-- Rounds
INSERT INTO Round (event_id, name, order_number, start_time, end_time, submission_deadline, top_n_advance, is_calibration, status) VALUES
  (1, 'Preliminary', 1, '2026-03-01 08:00:00', '2026-03-31 23:59:59', '2026-03-31 23:59:59', 3, FALSE, 'FINALIZED'),
  (1, 'Semi-final',  2, '2026-04-01 08:00:00', '2026-04-30 23:59:59', '2026-04-30 23:59:59', 1, FALSE, 'ACTIVE'),
  (1, 'Final',       3, '2026-05-01 08:00:00', '2026-05-31 23:59:59', '2026-05-31 23:59:59', NULL, FALSE, 'PENDING');

-- UserEventRole assignments
INSERT INTO UserEventRole (user_id, role_id, event_id, track_id, round_id, judge_type, assigned_by) VALUES
  (1, 2, 1, NULL, NULL, NULL,       1),  -- coordinator ở event 1
  (2, 3, 1, 1,    NULL, NULL,       1),  -- thầy An: MENTOR track Web App
  (2, 4, 1, 2,    1,    'INTERNAL', 1),  -- thầy An: JUDGE track AI, round Preliminary
  (3, 4, 1, 1,    1,    'INTERNAL', 1),  -- thầy Binh: JUDGE track Web App, round Preliminary
  (3, 4, 1, 1,    2,    'INTERNAL', 1),  -- thầy Binh: JUDGE track Web App, round Semi-final
  (4, 4, 1, 1,    1,    'GUEST',    1);  -- guest judge: JUDGE track Web App, round Preliminary

-- Teams
INSERT INTO Team (event_id, track_id, name, description, status) VALUES
  (1, 1, 'Team Alpha',   'Web app for student management', 'APPROVED'),
  (1, 1, 'Team Beta',    'E-commerce platform',            'APPROVED'),
  (1, 2, 'Team Gamma',   'AI chatbot for education',       'APPROVED'),
  (1, 3, 'Team Delta',   'Food waste reduction app',       'APPROVED');

-- TeamMembers
INSERT INTO TeamMember (team_id, user_id, member_role) VALUES
  (1, 5, 'LEADER'),  -- Hoang Van Leader -> Team Alpha
  (1, 6, 'MEMBER'),  -- Nguyen Thi Member -> Team Alpha
  (1, 7, 'MEMBER'),  -- Tran Van Member -> Team Alpha
  (2, 8, 'LEADER'),  -- Do Van Leader2 -> Team Beta
  (2, 9, 'MEMBER'),  -- Vo Thi Member3 -> Team Beta
  (3, 10,'MEMBER');  -- Ly Van Member4 -> Team Gamma (chưa approved)

-- ScoringCriteriaTemplate
INSERT INTO ScoringCriteriaTemplate (name, description, is_default) VALUES
  ('Standard Hackathon Criteria', 'Default criteria set for SEAL events', TRUE);

-- ScoringCriteria (gắn với event 1, round 1)
INSERT INTO ScoringCriteria (event_id, round_id, template_id, name, description, weight, max_score, order_number) VALUES
  (1, 1, 1, 'Innovation',    'Tính sáng tạo và độc đáo của ý tưởng', 1.5, 10.0, 1),
  (1, 1, 1, 'Technical',     'Chất lượng kỹ thuật và implementation',  2.0, 10.0, 2),
  (1, 1, 1, 'UI/UX',         'Giao diện và trải nghiệm người dùng',    1.0, 10.0, 3),
  (1, 1, 1, 'Presentation',  'Kỹ năng thuyết trình và demo',           1.0, 10.0, 4),
  (1, 1, 1, 'Completeness',  'Mức độ hoàn thiện của sản phẩm',         1.5, 10.0, 5);

-- Submissions (round 1 - Preliminary)
INSERT INTO Submission (team_id, round_id, repo_url, demo_url, slide_url, submitted_by, status) VALUES
  (1, 1, 'https://github.com/team-alpha/project',  'https://demo.teamalpha.com',  'https://slides.com/alpha',  5, 'SUBMITTED'),
  (2, 1, 'https://github.com/team-beta/project',   'https://demo.teambeta.com',   'https://slides.com/beta',   8, 'SUBMITTED'),
  (3, 1, 'https://github.com/team-gamma/project',  'https://demo.teamgamma.com',  'https://slides.com/gamma',  10,'SUBMITTED');

-- Scores (thầy Binh chấm Team Alpha, round 1)
INSERT INTO Score (submission_id, judge_user_id, criteria_id, value, comment, is_draft) VALUES
  (1, 3, 1, 8.5, 'Ý tưởng khá độc đáo',           FALSE),
  (1, 3, 2, 9.0, 'Code sạch, có test',              FALSE),
  (1, 3, 3, 7.5, 'UI còn đơn giản',                FALSE),
  (1, 3, 4, 8.0, 'Trình bày rõ ràng',               FALSE),
  (1, 3, 5, 8.5, 'Hoàn thiện tốt',                  FALSE),
-- Guest judge chấm Team Alpha, round 1
  (1, 4, 1, 8.0, 'Good concept',                    FALSE),
  (1, 4, 2, 8.5, 'Solid implementation',             FALSE),
  (1, 4, 3, 8.0, 'Clean design',                    FALSE),
  (1, 4, 4, 7.5, 'Could improve storytelling',      FALSE),
  (1, 4, 5, 8.0, 'Almost complete',                 FALSE),
-- thầy Binh chấm Team Beta, round 1
  (2, 3, 1, 7.0, 'Ý tưởng phổ biến',                FALSE),
  (2, 3, 2, 8.0, 'Kỹ thuật ổn',                     FALSE),
  (2, 3, 3, 8.5, 'UI đẹp',                           FALSE),
  (2, 3, 4, 7.0, 'Cần cải thiện demo',               FALSE),
  (2, 3, 5, 7.5, 'Còn thiếu một số tính năng',       FALSE);

-- RoundResult (round 1 finalized)
INSERT INTO RoundResult (team_id, round_id, total_score, rank_position, advanced, is_published, finalized_by) VALUES
  (1, 1, 82.50, 1, TRUE,  TRUE, 1),
  (2, 1, 75.25, 2, TRUE,  TRUE, 1),
  (3, 1, 61.00, 3, FALSE, TRUE, 1);

-- Prize structure
INSERT INTO Prize (event_id, track_id, name, description, rank_position) VALUES
  (1, 1, 'Champion',      'Web Application track champion',     1),
  (1, 1, '1st Runner-up', 'Web Application track runner-up',    2),
  (1, 2, 'Champion',      'AI Solution track champion',         1),
  (1, NULL, 'Best Overall','Best team across all tracks',        1);

-- AuditLog samples
INSERT INTO AuditLog (actor_user_id, action, target_type, target_id, reason, metadata_json) VALUES
  (1, 'APPROVE_TEAM',    'TEAM',       1, NULL,                    '{"team_name":"Team Alpha","status":"APPROVED"}'),
  (1, 'PUBLISH_RESULT',  'ROUND',      1, NULL,                    '{"round_name":"Preliminary","published_at":"2026-04-01"}'),
  (3, 'UPDATE_SCORE',    'SCORE',      1, 'Chấm lại sau khi xem lại demo', '{"before":7.5,"after":8.5,"criteria":"Innovation"}');

-- Notifications
INSERT INTO Notification (recipient_user_id, title, content, type, related_event_id) VALUES
  (5, 'Team Alpha đã được duyệt',         'Team của bạn đã được ban tổ chức phê duyệt tham gia SEAL Spring 2026.',      'APPROVAL',    1),
  (8, 'Team Beta đã được duyệt',          'Team của bạn đã được ban tổ chức phê duyệt tham gia SEAL Spring 2026.',      'APPROVAL',    1),
  (5, 'Kết quả vòng Preliminary',         'Team Alpha đứng hạng 1 và đã đủ điều kiện vào vòng Semi-final.',             'RESULT',      1),
  (8, 'Kết quả vòng Preliminary',         'Team Beta đứng hạng 2 và đã đủ điều kiện vào vòng Semi-final.',              'RESULT',      1),
  (3, 'Bạn được phân công chấm điểm',     'Bạn được phân công làm giám khảo vòng Semi-final track Web Application.',    'ASSIGNMENT',  1);

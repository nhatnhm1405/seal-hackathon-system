USE seal_hackathon;

-- =====================================================
-- SEAL Hackathon Management System — SEED DATA
-- Run this AFTER seal_hackathon.sql
-- =====================================================

-- =====================================================
-- 1. ROLE
-- INSERT IGNORE skips duplicates if seal_hackathon.sql already inserted them
-- =====================================================
INSERT IGNORE INTO Role (role_name, description) VALUES
  ('EVENT_COORDINATOR', 'SE Dept / PDP staff — quản lý sự kiện'),
  ('MENTOR',            'Giảng viên hướng dẫn đội theo hạng mục'),
  ('JUDGE',             'Giám khảo chấm điểm bài nộp');

-- =====================================================
-- 2. USER
-- -------------------------------------------------------
-- ALL seed users share the same test password: Test@1234
-- The hashes below are BCrypt(10) of "Test@1234".
--
-- If login still fails, regenerate the hash with:
--   Java:   new BCryptPasswordEncoder(10).encode("Test@1234")
--   Online: https://bcrypt-generator.com  (cost = 10)
-- Then run:
--   UPDATE `User` SET password_hash = '<new_hash>' WHERE email = '<email>';
-- -------------------------------------------------------
-- user_type: 'FPT_STUDENT' | 'EXTERNAL_STUDENT' | 'STAFF'
-- STAFF = coordinator / mentor / judge (internal or guest)
-- student_id: FPT pattern SE/HE/DE/CE/QE + YY(≤21) + digits
-- =====================================================
INSERT INTO `User` (email, password_hash, full_name, user_type, student_id, university, is_approved, is_active) VALUES
  -- user_id 1: STAFF — Event Coordinator (bootstrap account)
  ('coordinator@fpt.edu.vn',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Nguyen Van Coordinator', 'STAFF', NULL, NULL, TRUE,  TRUE),

  -- user_id 2: STAFF — Internal mentor / judge (Thầy An)
  ('mentor.an@fpt.edu.vn',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Tran Van An', 'STAFF', NULL, NULL, TRUE,  TRUE),

  -- user_id 3: STAFF — Internal judge (Thầy Binh)
  ('judge.binh@fpt.edu.vn',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Le Van Binh', 'STAFF', NULL, NULL, TRUE,  TRUE),

  -- user_id 4: STAFF — Guest judge (created by coordinator, pre-approved)
  ('guest.judge@gmail.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Pham Thi Guest', 'STAFF', NULL, NULL, TRUE,  TRUE),

  -- user_id 5: FPT_STUDENT — Team leader
  ('leader1@fpt.edu.vn',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Hoang Van Leader', 'FPT_STUDENT', 'SE211234', NULL, TRUE,  TRUE),

  -- user_id 6: FPT_STUDENT — Team member
  ('member1@fpt.edu.vn',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Nguyen Thi Lan', 'FPT_STUDENT', 'HE195678', NULL, TRUE,  TRUE),

  -- user_id 7: FPT_STUDENT — Team member
  ('member2@fpt.edu.vn',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Tran Van Duc', 'FPT_STUDENT', 'DE209012', NULL, TRUE,  TRUE),

  -- user_id 8: EXTERNAL_STUDENT — Team leader from HCMUT
  ('leader2@hcmut.edu.vn',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Do Van Long', 'EXTERNAL_STUDENT', 'BK2100123', 'HCMUT', TRUE,  TRUE),

  -- user_id 9: EXTERNAL_STUDENT — Team member from HCMUT
  ('member3@hcmut.edu.vn',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Vo Thi Hoa', 'EXTERNAL_STUDENT', 'BK2100456', 'HCMUT', TRUE,  TRUE),

  -- user_id 10: EXTERNAL_STUDENT — Not yet approved (tests pending-approval flow)
  ('member4@hcmut.edu.vn',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Ly Van Minh', 'EXTERNAL_STUDENT', 'BK2100789', 'HCMUT', FALSE, TRUE),

  -- user_id 11: FPT_STUDENT — Team leader (CE major)
  ('student.ce@fpt.edu.vn',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Pham Thi Bich', 'FPT_STUDENT', 'CE213456', NULL, TRUE,  TRUE),

  -- user_id 12: FPT_STUDENT — Team member (QE major)
  ('student.qe@fpt.edu.vn',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Nguyen Van Khoa', 'FPT_STUDENT', 'QE207890', NULL, TRUE,  TRUE);

-- =====================================================
-- 3. HACKATHON EVENT
-- created_by → user_id 1 (coordinator)
-- =====================================================
INSERT INTO HackathonEvent (name, season, year, description, registration_start, registration_end, start_date, end_date, status, created_by) VALUES
  ('SEAL Spring 2026', 'SPRING', 2026,
   'Annual SEAL Hackathon — Spring season. Mở cho sinh viên FPT và các trường đối tác.',
   '2026-01-01 00:00:00', '2026-02-28 23:59:59',
   '2026-03-01 08:00:00', '2026-05-31 23:59:59',
   'IN_PROGRESS', 1);

-- =====================================================
-- 4. TRACK
-- =====================================================
INSERT INTO Track (event_id, name, description) VALUES
  (1, 'Web Application', 'Xây dựng ứng dụng web full-stack'),
  (1, 'AI Solution',     'Sản phẩm ứng dụng AI/ML'),
  (1, 'Social Impact',   'Giải pháp công nghệ cho vấn đề xã hội');

-- =====================================================
-- 5. ROUND
-- =====================================================
INSERT INTO Round (event_id, name, order_number, start_time, end_time, submission_deadline, top_n_advance, is_calibration, status) VALUES
  (1, 'Preliminary', 1, '2026-03-01 08:00:00', '2026-03-31 23:59:59', '2026-03-31 23:59:59', 3, FALSE, 'FINALIZED'),
  (1, 'Semi-final',  2, '2026-04-01 08:00:00', '2026-04-30 23:59:59', '2026-04-30 23:59:59', 1, FALSE, 'ACTIVE'),
  (1, 'Final',       3, '2026-05-01 08:00:00', '2026-05-31 23:59:59', '2026-05-31 23:59:59', NULL, FALSE, 'PENDING');

-- =====================================================
-- 6. USER EVENT ROLE
-- role_id: 1=EVENT_COORDINATOR, 2=MENTOR, 3=JUDGE
-- judge_type only set when role = JUDGE
-- =====================================================
INSERT INTO UserEventRole (user_id, role_id, event_id, track_id, round_id, judge_type, assigned_by) VALUES
  -- user 1 (Coordinator): EVENT_COORDINATOR for event 1
  (1, 1, 1, NULL, NULL, NULL,       1),
  -- user 2 (Thầy An): MENTOR for Web Application track
  (2, 2, 1, 1,    NULL, NULL,       1),
  -- user 2 (Thầy An): JUDGE for AI Solution, Preliminary round (INTERNAL)
  (2, 3, 1, 2,    1,    'INTERNAL', 1),
  -- user 3 (Thầy Binh): JUDGE for Web Application, Preliminary (INTERNAL)
  (3, 3, 1, 1,    1,    'INTERNAL', 1),
  -- user 3 (Thầy Binh): JUDGE for Web Application, Semi-final (INTERNAL)
  (3, 3, 1, 1,    2,    'INTERNAL', 1),
  -- user 4 (Guest): JUDGE for Web Application, Preliminary (GUEST)
  (4, 3, 1, 1,    1,    'GUEST',    1);

-- =====================================================
-- 7. TEAM
-- =====================================================
INSERT INTO Team (event_id, track_id, name, description, status) VALUES
  (1, 1, 'Team Alpha',  'Ứng dụng web quản lý sinh viên',   'APPROVED'),
  (1, 1, 'Team Beta',   'Nền tảng thương mại điện tử',       'APPROVED'),
  (1, 2, 'Team Gamma',  'Chatbot AI hỗ trợ học tập',         'APPROVED'),
  (1, 3, 'Team Delta',  'Ứng dụng giảm lãng phí thực phẩm', 'APPROVED');

-- =====================================================
-- 8. TEAM MEMBER
-- member_role: 'LEADER' | 'MEMBER'
-- Team Alpha (id=1): user 5 leader, 6 & 7 members
-- Team Beta  (id=2): user 8 leader, 9 member
-- Team Gamma (id=3): user 10 member (unapproved user — tests edge case)
-- Team Delta (id=4): user 11 leader, 12 member
-- =====================================================
INSERT INTO TeamMember (team_id, user_id, member_role) VALUES
  (1, 5,  'LEADER'),
  (1, 6,  'MEMBER'),
  (1, 7,  'MEMBER'),
  (2, 8,  'LEADER'),
  (2, 9,  'MEMBER'),
  (3, 10, 'MEMBER'),
  (4, 11, 'LEADER'),
  (4, 12, 'MEMBER');

-- =====================================================
-- 9. SCORING CRITERIA TEMPLATE
-- =====================================================
INSERT INTO ScoringCriteriaTemplate (name, description, is_default) VALUES
  ('Standard Hackathon Criteria', 'Bộ tiêu chí mặc định cho sự kiện SEAL', TRUE);

-- =====================================================
-- 10. SCORING CRITERIA
-- =====================================================
INSERT INTO ScoringCriteria (event_id, round_id, template_id, name, description, weight, max_score, order_number) VALUES
  (1, 1, 1, 'Innovation',   'Tính sáng tạo và độc đáo của ý tưởng',   1.5, 10.0, 1),
  (1, 1, 1, 'Technical',    'Chất lượng kỹ thuật và implementation',    2.0, 10.0, 2),
  (1, 1, 1, 'UI/UX',        'Giao diện và trải nghiệm người dùng',      1.0, 10.0, 3),
  (1, 1, 1, 'Presentation', 'Kỹ năng thuyết trình và demo',            1.0, 10.0, 4),
  (1, 1, 1, 'Completeness', 'Mức độ hoàn thiện của sản phẩm',          1.5, 10.0, 5);

-- =====================================================
-- 11. SUBMISSION
-- submitted_by must be a member of that team
-- =====================================================
INSERT INTO Submission (team_id, round_id, repo_url, demo_url, slide_url, submitted_by, status) VALUES
  (1, 1, 'https://github.com/team-alpha/seal-2026',  'https://demo.teamalpha.io',  'https://slides.com/alpha-seal',  5,  'SUBMITTED'),
  (2, 1, 'https://github.com/team-beta/seal-2026',   'https://demo.teambeta.io',   'https://slides.com/beta-seal',   8,  'SUBMITTED'),
  (3, 1, 'https://github.com/team-gamma/seal-2026',  'https://demo.teamgamma.io',  'https://slides.com/gamma-seal',  10, 'SUBMITTED');

-- =====================================================
-- 12. SCORE
-- submission 1 = Team Alpha (track 1, round 1) → judges: user 3 (Binh INTERNAL), user 4 (Guest)
-- submission 2 = Team Beta  (track 1, round 1) → judge:  user 3 (Binh)
-- submission 3 = Team Gamma (track 2, round 1) → judge:  user 2 (An)
-- =====================================================
INSERT INTO Score (submission_id, judge_user_id, criteria_id, value, comment, is_draft) VALUES
  -- Thầy Binh chấm Team Alpha
  (1, 3, 1, 8.5, 'Ý tưởng khá độc đáo',             FALSE),
  (1, 3, 2, 9.0, 'Code sạch, có unit test',           FALSE),
  (1, 3, 3, 7.5, 'UI còn đơn giản',                  FALSE),
  (1, 3, 4, 8.0, 'Trình bày rõ ràng',                 FALSE),
  (1, 3, 5, 8.5, 'Sản phẩm hoàn thiện tốt',           FALSE),
  -- Guest judge chấm Team Alpha
  (1, 4, 1, 8.0, 'Good concept',                      FALSE),
  (1, 4, 2, 8.5, 'Solid implementation',               FALSE),
  (1, 4, 3, 8.0, 'Clean design',                       FALSE),
  (1, 4, 4, 7.5, 'Could improve storytelling',         FALSE),
  (1, 4, 5, 8.0, 'Almost complete',                    FALSE),
  -- Thầy Binh chấm Team Beta
  (2, 3, 1, 7.0, 'Ý tưởng phổ biến',                  FALSE),
  (2, 3, 2, 8.0, 'Kỹ thuật ổn định',                   FALSE),
  (2, 3, 3, 8.5, 'UI đẹp, responsive tốt',             FALSE),
  (2, 3, 4, 7.0, 'Demo cần cải thiện',                 FALSE),
  (2, 3, 5, 7.5, 'Còn thiếu một số tính năng',         FALSE),
  -- Thầy An chấm Team Gamma
  (3, 2, 1, 7.5, 'Ý tưởng chatbot thú vị',             FALSE),
  (3, 2, 2, 7.0, 'Model cần fine-tune thêm',           FALSE),
  (3, 2, 3, 6.5, 'UI cơ bản',                          FALSE),
  (3, 2, 4, 7.0, 'Demo live khá ổn',                   FALSE),
  (3, 2, 5, 6.0, 'Chưa hoàn thiện toàn bộ tính năng', FALSE);

-- =====================================================
-- 13. ROUND RESULT
-- Weighted totals (value × weight, averaged across judges):
--   Team Alpha: (Binh 56.25 + Guest 54.0) / 2 = 55.13
--   Team Beta:  Binh only = 49.25
--   Team Gamma: An only   = 44.75
-- top_n_advance = 3 → all 3 advance from Preliminary
-- =====================================================
INSERT INTO RoundResult (team_id, round_id, total_score, rank_position, advanced, is_published, finalized_at, finalized_by) VALUES
  (1, 1, 55.13, 1, TRUE,  TRUE, '2026-04-01 09:00:00', 1),
  (2, 1, 49.25, 2, TRUE,  TRUE, '2026-04-01 09:00:00', 1),
  (3, 1, 44.75, 3, TRUE,  TRUE, '2026-04-01 09:00:00', 1);

-- =====================================================
-- 14. PRIZE (team_id NULL = not yet awarded)
-- =====================================================
INSERT INTO Prize (event_id, track_id, name, description, rank_position, team_id, awarded_at) VALUES
  (1, 1,    'Champion',      'Web Application — Quán quân',       1, NULL, NULL),
  (1, 1,    '1st Runner-up', 'Web Application — Á quân',          2, NULL, NULL),
  (1, 2,    'Champion',      'AI Solution — Quán quân',            1, NULL, NULL),
  (1, 3,    'Champion',      'Social Impact — Quán quân',          1, NULL, NULL),
  (1, NULL, 'Best Overall',  'Đội xuất sắc nhất toàn sự kiện',    1, NULL, NULL);

-- =====================================================
-- 15. AUDIT LOG
-- =====================================================
INSERT INTO AuditLog (actor_user_id, action, target_type, target_id, reason, metadata_json, ip_address) VALUES
  (1, 'CREATE_EVENT',   'EVENT',  1, NULL,
   '{"event_name":"SEAL Spring 2026","status":"DRAFT"}',                                   '192.168.1.1'),
  (1, 'APPROVE_TEAM',   'TEAM',   1, NULL,
   '{"team_name":"Team Alpha","before":"PENDING","after":"APPROVED"}',                      '192.168.1.1'),
  (1, 'APPROVE_TEAM',   'TEAM',   2, NULL,
   '{"team_name":"Team Beta","before":"PENDING","after":"APPROVED"}',                       '192.168.1.1'),
  (1, 'APPROVE_TEAM',   'TEAM',   3, NULL,
   '{"team_name":"Team Gamma","before":"PENDING","after":"APPROVED"}',                      '192.168.1.1'),
  (1, 'APPROVE_TEAM',   'TEAM',   4, NULL,
   '{"team_name":"Team Delta","before":"PENDING","after":"APPROVED"}',                      '192.168.1.1'),
  (1, 'PUBLISH_RESULT', 'ROUND',  1, NULL,
   '{"round_name":"Preliminary","published_at":"2026-04-01T09:00:00"}',                     '192.168.1.1'),
  (3, 'UPDATE_SCORE',   'SCORE',  1, 'Xem lại demo, điều chỉnh điểm Innovation',
   '{"before":7.5,"after":8.5,"criteria":"Innovation","submission_id":1}',                 '192.168.1.2');

-- =====================================================
-- 16. NOTIFICATION
-- =====================================================
INSERT INTO Notification (recipient_user_id, title, content, type, related_event_id) VALUES
  (5,  'Team Alpha đã được duyệt',
       'Team của bạn đã được ban tổ chức phê duyệt tham gia SEAL Spring 2026.', 'APPROVAL', 1),
  (8,  'Team Beta đã được duyệt',
       'Team của bạn đã được ban tổ chức phê duyệt tham gia SEAL Spring 2026.', 'APPROVAL', 1),
  (10, 'Team Gamma đã được duyệt',
       'Team của bạn đã được ban tổ chức phê duyệt tham gia SEAL Spring 2026.', 'APPROVAL', 1),
  (11, 'Team Delta đã được duyệt',
       'Team của bạn đã được ban tổ chức phê duyệt tham gia SEAL Spring 2026.', 'APPROVAL', 1),
  (5,  'Kết quả vòng Preliminary',
       'Team Alpha xếp hạng 1 với tổng điểm 55.13 — đủ điều kiện vào vòng Semi-final.', 'RESULT', 1),
  (8,  'Kết quả vòng Preliminary',
       'Team Beta xếp hạng 2 với tổng điểm 49.25 — đủ điều kiện vào vòng Semi-final.',  'RESULT', 1),
  (10, 'Kết quả vòng Preliminary',
       'Team Gamma xếp hạng 3 với tổng điểm 44.75 — đủ điều kiện vào vòng Semi-final.', 'RESULT', 1),
  (3,  'Phân công chấm điểm vòng Semi-final',
       'Bạn được phân công làm giám khảo vòng Semi-final — track Web Application.',       'ASSIGNMENT', 1);

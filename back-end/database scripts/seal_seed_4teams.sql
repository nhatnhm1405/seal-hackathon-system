USE seal_hackathon;

-- =====================================================
-- SEAL Hackathon — ADD-ON: 4 EXTRA TEAMS (Event 2 — Summer 2026, OPEN)
--
-- PURPOSE: apply these 4 teams to an EXISTING, already-running database that
-- was seeded with the 13-team baseline (i.e. the OLD seal_seed.sql), WITHOUT
-- having to drop & re-seed everything.
--
-- NOTE: seal_seed.sql now ALREADY contains these 4 teams (team 14-17, users
-- 28-43). To make this file safe in BOTH situations, every statement uses
-- INSERT IGNORE — rows that already exist are skipped (no duplicate-key error):
--     • Existing DB on the old 13-team seed → inserts the 4 teams.
--     • DB already seeded from the new seal_seed.sql → skips everything (no-op).
--   Re-running it is therefore always harmless.
--
-- Continues the seal_seed.sql ID sequences:
--     User : last baseline user_id = 27  → new users 28-43 (16 members)
--     Team : last baseline team_id = 13  → new teams 14-17 (4 teams)
--
-- Event 2 is OPEN, so — like Summer teams 6-13 — these register WITHOUT a track
-- (track_id = NULL); the track is chosen later via self-select or coordinator draw.
--
-- Team sizes respect the 3-5 members rule (1 LEADER + 2-4 MEMBER):
--     team 14 Team Aurora  — 5 members  (APPROVED)
--     team 15 Team Specter — 4 members  (APPROVED)
--     team 16 Team Quantum — 3 members  (PENDING — for the approval demo)
--     team 17 Team Zephyr  — 4 members  (APPROVED)
--
-- All new users are approved + active and share the same test password:
--     Test@1234  (BCrypt cost 10 — identical hash to the main seed)
-- =====================================================

START TRANSACTION;

-- =====================================================
-- 1. USERS  (user_id 28-43)  — leaders + members for the 4 teams
-- user_type : 'FPT_STUDENT' | 'EXTERNAL_STUDENT'
-- =====================================================
INSERT IGNORE INTO `User` (user_id, email, password_hash, full_name, user_type, judge_type, student_id, university, is_approved, is_active) VALUES
  -- ── Team Aurora (team 14) ──
  (28, 'leader9@fpt.edu.vn',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Tran Van Son',    'FPT_STUDENT',      NULL, 'SE211020',   NULL,    TRUE, TRUE),
  (29, 'member11@fpt.edu.vn',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Nguyen Thi Hang', 'FPT_STUDENT',      NULL, 'HE211021',   NULL,    TRUE, TRUE),
  (30, 'member12@hcmut.edu.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Le Van Khoa',     'EXTERNAL_STUDENT', NULL, 'BK2100222',  'HCMUT', TRUE, TRUE),
  (31, 'member13@fpt.edu.vn',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Pham Thi Yen',    'FPT_STUDENT',      NULL, 'DE211022',   NULL,    TRUE, TRUE),
  (32, 'member14@uit.edu.vn',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Vo Van Tai',      'EXTERNAL_STUDENT', NULL, 'UIT2100302', 'UIT',   TRUE, TRUE),

  -- ── Team Specter (team 15) ──
  (33, 'leader10@fpt.edu.vn',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Hoang Van Tan',   'FPT_STUDENT',      NULL, 'SE211023',   NULL,    TRUE, TRUE),
  (34, 'member15@fpt.edu.vn',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Do Thi Mai',      'FPT_STUDENT',      NULL, 'HE211024',   NULL,    TRUE, TRUE),
  (35, 'member16@hcmut.edu.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Ngo Van Hai',     'EXTERNAL_STUDENT', NULL, 'BK2100223',  'HCMUT', TRUE, TRUE),
  (36, 'member17@fpt.edu.vn',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Bui Van Long',    'FPT_STUDENT',      NULL, 'CE211025',   NULL,    TRUE, TRUE),

  -- ── Team Quantum (team 16) ──
  (37, 'leader11@hcmut.edu.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Tran Van Phu',    'EXTERNAL_STUDENT', NULL, 'BK2100224',  'HCMUT', TRUE, TRUE),
  (38, 'member18@hcmut.edu.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Le Thi Thao',     'EXTERNAL_STUDENT', NULL, 'BK2100225',  'HCMUT', TRUE, TRUE),
  (39, 'member19@fpt.edu.vn',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Nguyen Van Vu',   'FPT_STUDENT',      NULL, 'SE211026',   NULL,    TRUE, TRUE),

  -- ── Team Zephyr (team 17) ──
  (40, 'leader12@fpt.edu.vn',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Dang Van Hieu',   'FPT_STUDENT',      NULL, 'SE211027',   NULL,    TRUE, TRUE),
  (41, 'member20@fpt.edu.vn',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Pham Thi Linh',   'FPT_STUDENT',      NULL, 'HE211028',   NULL,    TRUE, TRUE),
  (42, 'member21@uit.edu.vn',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Vo Thi Ngoc',     'EXTERNAL_STUDENT', NULL, 'UIT2100303', 'UIT',   TRUE, TRUE),
  (43, 'member22@fpt.edu.vn',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Nguyen Van Dung', 'FPT_STUDENT',      NULL, 'CE211029',   NULL,    TRUE, TRUE);


-- =====================================================
-- 2. TEAM  (team_id 14-17) — Event 2, track_id = NULL (assigned later)
-- team_id set explicitly so the TeamMember rows below are deterministic.
-- =====================================================
INSERT IGNORE INTO Team (team_id, event_id, track_id, name, description, status) VALUES
  (14, 2, NULL, 'Team Aurora',  'Web app ho tro on tap thi cu',          'APPROVED'),
  (15, 2, NULL, 'Team Specter', 'AI phat hien dao van bai nop',          'APPROVED'),
  (16, 2, NULL, 'Team Quantum', 'Nen tang quan ly du an nhom sinh vien', 'PENDING'),
  (17, 2, NULL, 'Team Zephyr',  'Giai phap IoT tiet kiem nang luong',    'APPROVED');


-- =====================================================
-- 3. TEAM MEMBER   member_role: 'LEADER' | 'MEMBER'
-- =====================================================
INSERT IGNORE INTO TeamMember (team_id, user_id, member_role) VALUES
  -- Team Aurora (5)
  (14, 28, 'LEADER'),  -- Tran Van Son
  (14, 29, 'MEMBER'),  -- Nguyen Thi Hang
  (14, 30, 'MEMBER'),  -- Le Van Khoa
  (14, 31, 'MEMBER'),  -- Pham Thi Yen
  (14, 32, 'MEMBER'),  -- Vo Van Tai
  -- Team Specter (4)
  (15, 33, 'LEADER'),  -- Hoang Van Tan
  (15, 34, 'MEMBER'),  -- Do Thi Mai
  (15, 35, 'MEMBER'),  -- Ngo Van Hai
  (15, 36, 'MEMBER'),  -- Bui Van Long
  -- Team Quantum (3)
  (16, 37, 'LEADER'),  -- Tran Van Phu
  (16, 38, 'MEMBER'),  -- Le Thi Thao
  (16, 39, 'MEMBER'),  -- Nguyen Van Vu
  -- Team Zephyr (4)
  (17, 40, 'LEADER'),  -- Dang Van Hieu
  (17, 41, 'MEMBER'),  -- Pham Thi Linh
  (17, 42, 'MEMBER'),  -- Vo Thi Ngoc
  (17, 43, 'MEMBER');  -- Nguyen Van Dung

COMMIT;

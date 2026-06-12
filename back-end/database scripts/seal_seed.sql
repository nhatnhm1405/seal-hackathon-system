USE seal_hackathon;

-- =====================================================
-- SEAL Hackathon Management System — CONSOLIDATED SEED DATA
-- (gộp từ seal_seed.sql + seal_events_seed.sql + seal_events_full_seed.sql)
-- Run this AFTER seal_hackathon.sql (schema).
--
-- Thay đổi so với bộ seed cũ:
--   • Đã XÓA event "SEAL Spring 2026" (event_id 1 cũ, IN_PROGRESS) cùng toàn
--     bộ dữ liệu phụ thuộc của nó.
--   • Các event còn lại được đánh số lại liên tục từ 1:
--       event 1: SEAL FUHCM Spring 2026  → COMPLETED (đã kết thúc)
--       event 2: SEAL FUHCM Summer 2026  → IN_PROGRESS (đang diễn ra)
--       event 3: SEAL FUHN  Summer 2026  → OPEN  (đang mở đăng ký)
--       event 4: SEAL FUHCM Fall 2026    → DRAFT
--   • "SEAL FUHCM Summer 2026" đổi OPEN → IN_PROGRESS, dời ngày & round cho
--     khớp trạng thái đang chạy (registration đã đóng, Preliminary ACTIVE).
--
-- ALL seed users share the same test password: Test@1234 (BCrypt cost 10).
--
-- CẬP NHẬT theo schema mới (assignment redesign):
--   • UserEventRole đã gọn lại còn (user_id, role_id, event_id) — chỉ định danh role.
--   • Thêm mục 6b JudgeAssignment + 6c MentorAssignment cho phân công cụ thể.
--   • Đã bổ sung đủ JudgeAssignment cho các round mà Score có ghi nhận (Semi/Final
--     của Thầy An + Guest), vốn bị thiếu trong bộ seed cũ.
-- =====================================================


-- =====================================================
-- 1. ROLE
-- INSERT IGNORE: schema (seal_hackathon.sql) đã insert sẵn 3 role này.
-- =====================================================
INSERT IGNORE INTO Role (role_name, description) VALUES
  ('EVENT_COORDINATOR', 'SE Dept / PDP staff — quản lý sự kiện'),
  ('MENTOR',            'Giảng viên hướng dẫn đội theo hạng mục'),
  ('JUDGE',             'Giám khảo chấm điểm bài nộp');


-- =====================================================
-- 2. USER  (user_id 1-26)
-- user_type: 'FPT_STUDENT' | 'EXTERNAL_STUDENT' | 'STAFF'
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

  -- user_id 4: STAFF — Guest judge (pre-approved)
  ('guest.judge@gmail.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Pham Thi Guest', 'STAFF', NULL, NULL, TRUE,  TRUE),

  -- user_id 5: FPT_STUDENT — Team leader (đa sự kiện)
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

  -- user_id 8: EXTERNAL_STUDENT — Team leader from HCMUT (đa sự kiện)
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

  -- user_id 11: FPT_STUDENT — Team leader (CE major, đa sự kiện)
  ('student.ce@fpt.edu.vn',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Pham Thi Bich', 'FPT_STUDENT', 'CE213456', NULL, TRUE,  TRUE),

  -- user_id 12: FPT_STUDENT — Team member (QE major)
  ('student.qe@fpt.edu.vn',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Nguyen Van Khoa', 'FPT_STUDENT', 'QE207890', NULL, TRUE,  TRUE),

  -- ── Dùng cho event 1 (FUHCM Spring 2026 - COMPLETED) ──
  -- user_id 13: FPT_STUDENT member
  ('leader3@fpt.edu.vn',
   '$2a$10$eMfJGvnhoPcIlzEvQ5FPmunpn/DSf1KK.u89I.LtAR3v6sXeESFK.',
   'Bui Thi Thu', 'FPT_STUDENT', 'SE211001', NULL, TRUE, TRUE),

  -- user_id 14: FPT_STUDENT member
  ('member5@fpt.edu.vn',
   '$2a$10$eMfJGvnhoPcIlzEvQ5FPmunpn/DSf1KK.u89I.LtAR3v6sXeESFK.',
   'Ngo Van Hieu', 'FPT_STUDENT', 'HE201002', NULL, TRUE, TRUE),

  -- user_id 15: FPT_STUDENT leader
  ('leader4@fpt.edu.vn',
   '$2a$10$eMfJGvnhoPcIlzEvQ5FPmunpn/DSf1KK.u89I.LtAR3v6sXeESFK.',
   'Tran Thi Mai', 'FPT_STUDENT', 'DE211003', NULL, TRUE, TRUE),

  -- user_id 16: EXTERNAL_STUDENT member (UIT)
  ('member6@uit.edu.vn',
   '$2a$10$eMfJGvnhoPcIlzEvQ5FPmunpn/DSf1KK.u89I.LtAR3v6sXeESFK.',
   'Dang Van Tuan', 'EXTERNAL_STUDENT', 'UIT2100301', 'UIT', TRUE, TRUE),

  -- user_id 17: FPT_STUDENT leader (top winner event 1)
  ('leader5@fpt.edu.vn',
   '$2a$10$eMfJGvnhoPcIlzEvQ5FPmunpn/DSf1KK.u89I.LtAR3v6sXeESFK.',
   'Le Van Nam', 'FPT_STUDENT', 'CE211004', NULL, TRUE, TRUE),

  -- user_id 18: FPT_STUDENT member
  ('member7@fpt.edu.vn',
   '$2a$10$eMfJGvnhoPcIlzEvQ5FPmunpn/DSf1KK.u89I.LtAR3v6sXeESFK.',
   'Hoang Thi Ly', 'FPT_STUDENT', 'SE201005', NULL, TRUE, TRUE),

  -- user_id 19: STAFF — Internal judge cho event 1 (Cô Cam)
  ('judge.cam@fpt.edu.vn',
   '$2a$10$eMfJGvnhoPcIlzEvQ5FPmunpn/DSf1KK.u89I.LtAR3v6sXeESFK.',
   'Nguyen Thi Cam', 'STAFF', NULL, NULL, TRUE, TRUE),

  -- ── Dùng cho event 2 (FUHCM Summer 2026 - IN_PROGRESS) ──
  -- user_id 20: FPT_STUDENT leader
  ('leader6@fpt.edu.vn',
   '$2a$10$eMfJGvnhoPcIlzEvQ5FPmunpn/DSf1KK.u89I.LtAR3v6sXeESFK.',
   'Pham Van Dat', 'FPT_STUDENT', 'SE211006', NULL, TRUE, TRUE),

  -- user_id 21: FPT_STUDENT member
  ('member8@fpt.edu.vn',
   '$2a$10$eMfJGvnhoPcIlzEvQ5FPmunpn/DSf1KK.u89I.LtAR3v6sXeESFK.',
   'Vo Thi Lan', 'FPT_STUDENT', 'HE211007', NULL, TRUE, TRUE),

  -- user_id 22: FPT_STUDENT member
  ('member9@fpt.edu.vn',
   '$2a$10$eMfJGvnhoPcIlzEvQ5FPmunpn/DSf1KK.u89I.LtAR3v6sXeESFK.',
   'Nguyen Van Phuc', 'FPT_STUDENT', 'AI211008', NULL, TRUE, TRUE),

  -- user_id 23: EXTERNAL_STUDENT leader (chưa approved — test pending flow)
  ('leader7@hust.edu.vn',
   '$2a$10$eMfJGvnhoPcIlzEvQ5FPmunpn/DSf1KK.u89I.LtAR3v6sXeESFK.',
   'Dinh Van Khang', 'EXTERNAL_STUDENT', 'HUST2100901', 'HUST', FALSE, TRUE),

  -- ── Dùng cho event 3 (FUHN Summer 2026 - OPEN) ──
  -- user_id 24: FPT_STUDENT leader (campus HN)
  ('leader8@fpt.edu.vn',
   '$2a$10$eMfJGvnhoPcIlzEvQ5FPmunpn/DSf1KK.u89I.LtAR3v6sXeESFK.',
   'Tran Van Quan', 'FPT_STUDENT', 'SE211010', NULL, TRUE, TRUE),

  -- user_id 25: FPT_STUDENT member (campus HN)
  ('member10@fpt.edu.vn',
   '$2a$10$eMfJGvnhoPcIlzEvQ5FPmunpn/DSf1KK.u89I.LtAR3v6sXeESFK.',
   'Nguyen Thi Bich', 'FPT_STUDENT', 'HE211011', NULL, TRUE, TRUE),

  -- user_id 26: STAFF — Mentor cho event 2 & 3
  ('mentor.hung@fpt.edu.vn',
   '$2a$10$eMfJGvnhoPcIlzEvQ5FPmunpn/DSf1KK.u89I.LtAR3v6sXeESFK.',
   'Nguyen Minh Hung', 'STAFF', NULL, NULL, TRUE, TRUE);


-- =====================================================
-- 3. HACKATHON EVENT  (event_id 1-4)
-- created_by → user_id 1 (coordinator)
-- =====================================================
INSERT INTO HackathonEvent
  (name, season, year, description,
   registration_start, registration_end,
   start_date, end_date,
   status, created_by)
VALUES
  -- ── event_id 1 ── FUHCM Spring — đã kết thúc (dùng test lịch sử / archive)
  ('SEAL FUHCM Spring 2026', 'SPRING', 2026,
   'Sự kiện SEAL Spring 2026 tại FPT University HCM — đã kết thúc. '
   'Mở cho sinh viên FPT và các trường đối tác khu vực phía Nam.',
   '2025-12-15 00:00:00', '2026-01-31 23:59:59',
   '2026-02-01 08:00:00', '2026-04-30 23:59:59',
   'COMPLETED', 1),

  -- ── event_id 2 ── FUHCM Summer — ĐANG DIỄN RA (vòng Preliminary)
  ('SEAL FUHCM Summer 2026', 'SUMMER', 2026,
   'Sự kiện SEAL Summer 2026 tại FPT University HCM — đang diễn ra (vòng Preliminary). '
   'Chủ đề: "Build for Tomorrow" — khuyến khích giải pháp AI và bền vững.',
   '2026-04-01 00:00:00', '2026-05-31 23:59:59',
   '2026-06-01 08:00:00', '2026-08-31 23:59:59',
   'IN_PROGRESS', 1),

  -- ── event_id 3 ── FUHN Summer — đang mở đăng ký (campus Hà Nội)
  ('SEAL FUHN Summer 2026', 'SUMMER', 2026,
   'Sự kiện SEAL Summer 2026 tại FPT University Hà Nội — đang mở đăng ký. '
   'Chủ đề: "Build for Tomorrow" — dành cho sinh viên khu vực phía Bắc và các trường đối tác.',
   '2026-05-15 00:00:00', '2026-07-15 23:59:59',
   '2026-07-20 08:00:00', '2026-09-30 23:59:59',
   'OPEN', 1),

  -- ── event_id 4 ── FUHCM Fall — còn đang lên kế hoạch
  ('SEAL FUHCM Fall 2026', 'FALL', 2026,
   'Sự kiện SEAL Fall 2026 tại FPT University HCM — đang trong giai đoạn lên kế hoạch. '
   'Chủ đề và thể lệ sẽ được công bố sau.',
   '2026-09-01 00:00:00', '2026-10-15 23:59:59',
   '2026-10-20 08:00:00', '2026-12-20 23:59:59',
   'DRAFT', 1);


-- =====================================================
-- 4. TRACK  (track_id 1-10)
-- event 4 (DRAFT) chưa có track.
-- =====================================================
-- Event 1 — FUHCM Spring (track 1-3)
INSERT INTO Track (event_id, name, description) VALUES
  (1, 'Web Application', 'Ứng dụng web full-stack'),               -- track 1
  (1, 'Mobile App',      'Ứng dụng di động iOS/Android'),          -- track 2
  (1, 'AI Solution',     'Sản phẩm ứng dụng AI/ML');               -- track 3

-- Event 2 — FUHCM Summer (track 4-7)
INSERT INTO Track (event_id, name, description) VALUES
  (2, 'Web Application', 'Ứng dụng web full-stack'),               -- track 4
  (2, 'AI Solution',     'Sản phẩm ứng dụng AI/ML'),               -- track 5
  (2, 'Social Impact',   'Giải pháp công nghệ cho vấn đề xã hội'), -- track 6
  (2, 'Green Tech',      'Giải pháp công nghệ xanh, bền vững');    -- track 7

-- Event 3 — FUHN Summer (track 8-10)
INSERT INTO Track (event_id, name, description) VALUES
  (3, 'Web Application', 'Ứng dụng web full-stack'),               -- track 8
  (3, 'AI Solution',     'Sản phẩm ứng dụng AI/ML'),               -- track 9
  (3, 'EdTech',          'Công nghệ giáo dục');                    -- track 10


-- =====================================================
-- 5. ROUND  (round_id 1-9)
-- =====================================================
-- Event 1 — FUHCM Spring: đã COMPLETED → cả 3 round FINALIZED (round 1-3)
INSERT INTO Round
  (event_id, name, order_number, start_time, end_time, submission_deadline,
   top_n_advance, is_calibration, status)
VALUES
  (1, 'Preliminary', 1,
   '2026-02-01 08:00:00', '2026-02-28 23:59:59', '2026-02-28 23:59:59',
   5, FALSE, 'FINALIZED'),
  (1, 'Semi-final', 2,
   '2026-03-10 08:00:00', '2026-03-31 23:59:59', '2026-03-31 23:59:59',
   2, FALSE, 'FINALIZED'),
  (1, 'Final', 3,
   '2026-04-10 08:00:00', '2026-04-30 23:59:59', '2026-04-30 23:59:59',
   NULL, FALSE, 'FINALIZED');

-- Event 2 — FUHCM Summer: IN_PROGRESS → Preliminary ACTIVE, còn lại PENDING (round 4-6)
INSERT INTO Round
  (event_id, name, order_number, start_time, end_time, submission_deadline,
   top_n_advance, is_calibration, status)
VALUES
  (2, 'Preliminary', 1,
   '2026-06-01 08:00:00', '2026-06-30 23:59:59', '2026-06-30 23:59:59',
   5, FALSE, 'ACTIVE'),
  (2, 'Semi-final', 2,
   '2026-07-10 08:00:00', '2026-07-31 23:59:59', '2026-07-31 23:59:59',
   2, FALSE, 'PENDING'),
  (2, 'Final', 3,
   '2026-08-10 08:00:00', '2026-08-31 23:59:59', '2026-08-31 23:59:59',
   NULL, FALSE, 'PENDING');

-- Event 3 — FUHN Summer: đang OPEN → rounds PENDING (round 7-9)
INSERT INTO Round
  (event_id, name, order_number, start_time, end_time, submission_deadline,
   top_n_advance, is_calibration, status)
VALUES
  (3, 'Preliminary', 1,
   '2026-07-20 08:00:00', '2026-08-15 23:59:59', '2026-08-15 23:59:59',
   5, FALSE, 'PENDING'),
  (3, 'Semi-final', 2,
   '2026-08-25 08:00:00', '2026-09-15 23:59:59', '2026-09-15 23:59:59',
   2, FALSE, 'PENDING'),
  (3, 'Final', 3,
   '2026-09-20 08:00:00', '2026-09-30 23:59:59', '2026-09-30 23:59:59',
   NULL, FALSE, 'PENDING');


-- =====================================================
-- 6. USER EVENT ROLE  (định danh role — N-N user ↔ role per event)
-- role_id: 1=EVENT_COORDINATOR, 2=MENTOR, 3=JUDGE
-- Bảng này CHỈ ghi "ai được phép làm role gì trong event nào".
-- Việc phân công cụ thể (chấm round/track nào, mentor track nào) nằm ở
-- JudgeAssignment (mục 6b) và MentorAssignment (mục 6c).
-- Lưu ý: 1 user có thể có nhiều role trong cùng event (vd user 2 vừa
-- MENTOR vừa JUDGE ở event 1) → mỗi role là 1 dòng riêng.
-- =====================================================
INSERT INTO UserEventRole (user_id, role_id, event_id, assigned_by) VALUES
  -- ── EVENT 1 (COMPLETED) ──
  (1,  1, 1, 1),   -- Coordinator
  (2,  2, 1, 1),   -- Thầy An: MENTOR (Web App)
  (2,  3, 1, 1),   -- Thầy An: cũng là JUDGE (AI Solution) — case vừa Mentor vừa Judge
  (3,  3, 1, 1),   -- Thầy Binh: JUDGE
  (19, 3, 1, 1),   -- Cô Cam: JUDGE
  (4,  3, 1, 1),   -- Guest judge: JUDGE

  -- ── EVENT 2 (IN_PROGRESS - FUHCM Summer) ──
  (1,  1, 2, 1),   -- Coordinator
  (26, 2, 2, 1),   -- Thầy Hung: MENTOR
  (2,  2, 2, 1),   -- Thầy An: MENTOR

  -- ── EVENT 3 (OPEN - FUHN Summer) ──
  (1,  1, 3, 1),   -- Coordinator
  (26, 2, 3, 1),   -- Thầy Hung: MENTOR
  (19, 2, 3, 1),   -- Cô Cam: MENTOR

  -- ── EVENT 4 (DRAFT) ──
  (1,  1, 4, 1);   -- Coordinator


-- =====================================================
-- 6b. JUDGE ASSIGNMENT  (phân công Judge chấm round/track cụ thể)
-- Event 1 tracks: 1=Web, 2=Mobile, 3=AI  | rounds: 1=Prelim, 2=Semi, 3=Final
-- Vòng loại (Prelim/Semi): track_id có giá trị → chấm theo track.
-- Vòng Final: theo dữ liệu cũ judge vẫn chấm theo track (mỗi track 1 champion),
--   nên giữ track_id cho khớp seed Score. Nếu sau này Final chấm chung thì để NULL.
-- =====================================================
INSERT INTO JudgeAssignment (judge_user_id, round_id, track_id, judge_type, assigned_by) VALUES
  -- Thầy Binh (3): JUDGE Web App (track 1) — cả 3 round
  (3,  1, 1, 'INTERNAL', 1),
  (3,  2, 1, 'INTERNAL', 1),
  (3,  3, 1, 'INTERNAL', 1),
  -- Cô Cam (19): JUDGE Mobile App (track 2) — cả 3 round
  (19, 1, 2, 'INTERNAL', 1),
  (19, 2, 2, 'INTERNAL', 1),
  (19, 3, 2, 'INTERNAL', 1),
  -- Thầy An (2): JUDGE AI Solution (track 3) — Preliminary + Semi + Final (theo seed Score)
  (2,  1, 3, 'INTERNAL', 1),
  (2,  2, 3, 'INTERNAL', 1),
  (2,  3, 3, 'INTERNAL', 1),
  -- Guest judge (4): JUDGE AI Solution (track 3) — Preliminary + Final (theo seed Score)
  (4,  1, 3, 'GUEST',    1),
  (4,  3, 3, 'GUEST',    1);


-- =====================================================
-- 6c. MENTOR ASSIGNMENT  (phân công Mentor hỗ trợ track — cả event)
-- Event 1 tracks: 1=Web, 3=AI | Event 2: 4=Web, 5=AI | Event 3: 8=Web, 10=EdTech
-- =====================================================
INSERT INTO MentorAssignment (mentor_user_id, track_id, assigned_by) VALUES
  -- Event 1
  (2,  1, 1),    -- Thầy An: MENTOR Web App
  -- Event 2
  (26, 4, 1),    -- Thầy Hung: MENTOR Web App
  (2,  5, 1),    -- Thầy An: MENTOR AI Solution
  -- Event 3
  (26, 8,  1),   -- Thầy Hung: MENTOR Web App
  (19, 10, 1);   -- Cô Cam: MENTOR EdTech


-- =====================================================
-- 7. TEAM  (team_id 1-13)
-- =====================================================
-- Event 1 — FUHCM Spring (team 1-5). track 1=Web, 2=Mobile, 3=AI
INSERT INTO Team (event_id, track_id, name, description, status) VALUES
  (1, 1, 'Team Phoenix',  'Web app quản lý ký túc xá thông minh',     'APPROVED'),  -- team 1
  (1, 1, 'Team Dragon',   'Nền tảng học tập trực tuyến',              'APPROVED'),  -- team 2
  (1, 2, 'Team Tiger',    'App theo dõi sức khỏe sinh viên',          'APPROVED'),  -- team 3
  (1, 3, 'Team Eagle',    'AI chấm điểm bài tập tự động',             'APPROVED'),  -- team 4
  (1, 1, 'Team Falcon',   'Web marketplace trao đổi sách cũ',         'APPROVED');  -- team 5

-- Event 2 — FUHCM Summer (team 6-10). track 4=Web, 5=AI, 6=Social, 7=Green
INSERT INTO Team (event_id, track_id, name, description, status) VALUES
  (2, 4,  'Team Horizon',  'Web app hỗ trợ tìm việc làm cho sinh viên',  'APPROVED'),  -- team 6
  (2, 5,  'Team Nexus',    'AI tóm tắt tài liệu học tập tự động',        'APPROVED'),  -- team 7
  (2, 6,  'Team Verde',    'App kết nối tình nguyện viên và dự án xã hội','APPROVED'), -- team 8
  (2, 7,  'Team EcoSmart', 'IoT monitoring chất lượng không khí campus',  'PENDING'),   -- team 9
  (2, 4,  'Team Pixel',    'Platform thiết kế portfolio cho sinh viên',   'PENDING');   -- team 10

-- Event 3 — FUHN Summer (team 11-13). track 8=Web, 9=AI, 10=EdTech
INSERT INTO Team (event_id, track_id, name, description, status) VALUES
  (3, 8,  'Team Polaris', 'Web platform kết nối mentor và sinh viên HN', 'APPROVED'),  -- team 11
  (3, 9,  'Team Aurora',  'AI chatbot tư vấn tuyển sinh đại học',        'APPROVED'),  -- team 12
  (3, 10, 'Team Spark',   'LMS gamification cho học sinh cấp 3',         'PENDING');   -- team 13


-- =====================================================
-- 8. TEAM MEMBER
-- member_role: 'LEADER' | 'MEMBER'
-- =====================================================
-- Event 1 teams
INSERT INTO TeamMember (team_id, user_id, member_role) VALUES
  (1, 5,  'LEADER'), -- Hoang Van Leader
  (1, 13, 'MEMBER'), -- Bui Thi Thu
  (1, 14, 'MEMBER'), -- Ngo Van Hieu
  (2, 15, 'LEADER'), -- Tran Thi Mai
  (2, 16, 'MEMBER'), -- Dang Van Tuan
  (3, 11, 'LEADER'), -- Pham Thi Bich
  (3, 12, 'MEMBER'), -- Nguyen Van Khoa
  (4, 17, 'LEADER'), -- Le Van Nam
  (4, 18, 'MEMBER'), -- Hoang Thi Ly
  (5, 8,  'LEADER'), -- Do Van Long
  (5, 9,  'MEMBER'); -- Vo Thi Hoa

-- Event 2 teams
INSERT INTO TeamMember (team_id, user_id, member_role) VALUES
  (6,  20, 'LEADER'), -- Pham Van Dat
  (6,  21, 'MEMBER'), -- Vo Thi Lan
  (6,  22, 'MEMBER'), -- Nguyen Van Phuc
  (7,  5,  'LEADER'), -- Hoang Van Leader (đa sự kiện)
  (7,  6,  'MEMBER'), -- Nguyen Thi Lan
  (8,  11, 'LEADER'), -- Pham Thi Bich (đa sự kiện)
  (8,  12, 'MEMBER'), -- Nguyen Van Khoa
  (9,  23, 'LEADER'), -- Dinh Van Khang (chưa approved)
  (10, 17, 'LEADER'), -- Le Van Nam
  (10, 18, 'MEMBER'); -- Hoang Thi Ly

-- Event 3 teams
INSERT INTO TeamMember (team_id, user_id, member_role) VALUES
  (11, 24, 'LEADER'), -- Tran Van Quan
  (11, 25, 'MEMBER'), -- Nguyen Thi Bich
  (12, 8,  'LEADER'), -- Do Van Long (đa sự kiện)
  (12, 9,  'MEMBER'), -- Vo Thi Hoa
  (13, 13, 'LEADER'), -- Bui Thi Thu
  (13, 14, 'MEMBER'); -- Ngo Van Hieu


-- =====================================================
-- 9. SCORING CRITERIA TEMPLATE  (template_id 1)
-- =====================================================
INSERT INTO ScoringCriteriaTemplate (name, description, is_default) VALUES
  ('Standard Hackathon Criteria', 'Bộ tiêu chí mặc định cho sự kiện SEAL', TRUE);


-- =====================================================
-- 10. SCORING CRITERIA  (criteria_id 1-15) — chỉ event 1 (COMPLETED)
-- Round 1 Prelim:  criteria 1=Innov, 2=Tech, 3=UX, 4=Pres, 5=Complete
-- Round 2 Semi:    criteria 6=Innov, 7=Tech, 8=UX, 9=Pres, 10=Market
-- Round 3 Final:   criteria 11=Innov, 12=Tech, 13=UX, 14=Pres, 15=Market
-- =====================================================
INSERT INTO ScoringCriteria (event_id, round_id, template_id, name, description, weight, max_score, order_number) VALUES
  -- Round 1 (Preliminary)
  (1, 1, 1, 'Innovation',    'Tính sáng tạo và độc đáo của ý tưởng',   1.5, 10.0, 1),
  (1, 1, 1, 'Technical',     'Chất lượng kỹ thuật và implementation',   2.0, 10.0, 2),
  (1, 1, 1, 'UI/UX',         'Giao diện và trải nghiệm người dùng',     1.0, 10.0, 3),
  (1, 1, 1, 'Presentation',  'Kỹ năng thuyết trình và demo',            1.0, 10.0, 4),
  (1, 1, 1, 'Completeness',  'Mức độ hoàn thiện của sản phẩm',         1.5, 10.0, 5),
  -- Round 2 (Semi-final) — thêm tiêu chí Market Viability
  (1, 2, 1, 'Innovation',    'Tính sáng tạo và độc đáo của ý tưởng',   1.5, 10.0, 1),
  (1, 2, 1, 'Technical',     'Chất lượng kỹ thuật và implementation',   2.0, 10.0, 2),
  (1, 2, 1, 'UI/UX',         'Giao diện và trải nghiệm người dùng',     1.0, 10.0, 3),
  (1, 2, 1, 'Presentation',  'Kỹ năng thuyết trình và demo',            1.5, 10.0, 4),
  (1, 2, 1, 'Market',        'Tiềm năng thị trường và khả năng scale',  1.0, 10.0, 5),
  -- Round 3 (Final)
  (1, 3, 1, 'Innovation',    'Tính sáng tạo và độc đáo của ý tưởng',   1.5, 10.0, 1),
  (1, 3, 1, 'Technical',     'Chất lượng kỹ thuật và implementation',   2.0, 10.0, 2),
  (1, 3, 1, 'UI/UX',         'Giao diện và trải nghiệm người dùng',     1.0, 10.0, 3),
  (1, 3, 1, 'Presentation',  'Kỹ năng thuyết trình và demo',            1.5, 10.0, 4),
  (1, 3, 1, 'Market',        'Tiềm năng thị trường và khả năng scale',  1.0, 10.0, 5);


-- =====================================================
-- 11. SUBMISSION  (submission_id 1-12) — event 1
-- Preliminary (round 1): cả 5 team nộp
-- Semi-final  (round 2): Phoenix, Dragon, Tiger, Eagle
-- Final       (round 3): Phoenix, Tiger, Eagle
-- =====================================================
INSERT INTO Submission (team_id, round_id, repo_url, demo_url, slide_url, submitted_by, status) VALUES
  -- Preliminary round (round 1)
  (1, 1, 'https://github.com/team-phoenix/seal-spring-2026', 'https://demo.teamphoenix.io', 'https://slides.com/phoenix-seal', 5,  'SUBMITTED'),  -- sub 1
  (2, 1, 'https://github.com/team-dragon/seal-spring-2026',  'https://demo.teamdragon.io',  'https://slides.com/dragon-seal',  15, 'SUBMITTED'),  -- sub 2
  (3, 1, 'https://github.com/team-tiger/seal-spring-2026',   'https://demo.teamtiger.io',   'https://slides.com/tiger-seal',   11, 'SUBMITTED'),  -- sub 3
  (4, 1, 'https://github.com/team-eagle/seal-spring-2026',   'https://demo.teameagle.io',   'https://slides.com/eagle-seal',   17, 'SUBMITTED'),  -- sub 4
  (5, 1, 'https://github.com/team-falcon/seal-spring-2026',  'https://demo.teamfalcon.io',  'https://slides.com/falcon-seal',  8,  'SUBMITTED'),  -- sub 5
  -- Semi-final round (round 2)
  (1, 2, 'https://github.com/team-phoenix/seal-spring-2026', 'https://demo.teamphoenix.io/v2', 'https://slides.com/phoenix-semi', 5,  'SUBMITTED'),  -- sub 6
  (2, 2, 'https://github.com/team-dragon/seal-spring-2026',  'https://demo.teamdragon.io/v2',  'https://slides.com/dragon-semi',  15, 'SUBMITTED'),  -- sub 7
  (3, 2, 'https://github.com/team-tiger/seal-spring-2026',   'https://demo.teamtiger.io/v2',   'https://slides.com/tiger-semi',   11, 'SUBMITTED'),  -- sub 8
  (4, 2, 'https://github.com/team-eagle/seal-spring-2026',   'https://demo.teameagle.io/v2',   'https://slides.com/eagle-semi',   17, 'SUBMITTED'),  -- sub 9
  -- Final round (round 3)
  (1, 3, 'https://github.com/team-phoenix/seal-spring-2026', 'https://demo.teamphoenix.io/final', 'https://slides.com/phoenix-final', 5,  'SUBMITTED'),  -- sub 10
  (3, 3, 'https://github.com/team-tiger/seal-spring-2026',   'https://demo.teamtiger.io/final',   'https://slides.com/tiger-final',   11, 'SUBMITTED'),  -- sub 11
  (4, 3, 'https://github.com/team-eagle/seal-spring-2026',   'https://demo.teameagle.io/final',   'https://slides.com/eagle-final',   17, 'SUBMITTED');  -- sub 12


-- =====================================================
-- 12. SCORE — event 1
-- criteria_id: Round1 Prelim=1-5, Round2 Semi=6-10, Round3 Final=11-15
-- =====================================================

-- ── Preliminary: Thầy Binh chấm Web (sub 1=Phoenix, 2=Dragon, 5=Falcon)
INSERT INTO Score (submission_id, judge_user_id, criteria_id, value, comment, is_draft) VALUES
  -- Binh chấm Phoenix (sub 1)
  (1, 3, 1, 9.0, 'Ý tưởng KTX thông minh rất thực tiễn',     FALSE),
  (1, 3, 2, 9.5, 'Code sạch, kiến trúc tốt, có CI/CD',        FALSE),
  (1, 3, 3, 8.5, 'UI hiện đại, UX mượt mà',                   FALSE),
  (1, 3, 4, 9.0, 'Demo live rất ấn tượng',                     FALSE),
  (1, 3, 5, 9.0, 'Sản phẩm gần như hoàn chỉnh',               FALSE),
  -- Binh chấm Dragon (sub 2)
  (2, 3, 1, 7.5, 'Ý tưởng học tập trực tuyến khá phổ biến',   FALSE),
  (2, 3, 2, 8.0, 'Backend ổn định, có authentication',         FALSE),
  (2, 3, 3, 8.5, 'UI đẹp, responsive tốt',                     FALSE),
  (2, 3, 4, 7.5, 'Trình bày ổn',                               FALSE),
  (2, 3, 5, 7.5, 'Còn thiếu tính năng thanh toán',             FALSE),
  -- Binh chấm Falcon (sub 5)
  (5, 3, 1, 7.0, 'Ý tưởng marketplace bình thường',            FALSE),
  (5, 3, 2, 7.5, 'Kỹ thuật cơ bản, thiếu tối ưu',              FALSE),
  (5, 3, 3, 7.0, 'UI cần cải thiện thêm',                      FALSE),
  (5, 3, 4, 7.5, 'Demo khá ổn',                                FALSE),
  (5, 3, 5, 6.5, 'Còn nhiều tính năng dở dang',                FALSE);

-- ── Preliminary: Cô Cam chấm Mobile (sub 3=Tiger)
INSERT INTO Score (submission_id, judge_user_id, criteria_id, value, comment, is_draft) VALUES
  (3, 19, 1, 8.0, 'Ý tưởng health tracking thực tế',           FALSE),
  (3, 19, 2, 8.5, 'Native app, performance tốt',               FALSE),
  (3, 19, 3, 9.0, 'UI mobile rất đẹp, UX tự nhiên',            FALSE),
  (3, 19, 4, 8.0, 'Thuyết trình tự tin',                       FALSE),
  (3, 19, 5, 7.5, 'Thiếu tính năng sync cloud',                FALSE);

-- ── Preliminary: Thầy An chấm AI (sub 4=Eagle) + Guest judge
INSERT INTO Score (submission_id, judge_user_id, criteria_id, value, comment, is_draft) VALUES
  -- An chấm Eagle (sub 4)
  (4, 2, 1, 8.5, 'Ứng dụng AI vào chấm bài rất sáng tạo',     FALSE),
  (4, 2, 2, 8.0, 'Model NLP đạt accuracy khá',                 FALSE),
  (4, 2, 3, 7.5, 'UI teacher dashboard cần cải thiện',         FALSE),
  (4, 2, 4, 8.0, 'Demo live AI chạy tốt',                      FALSE),
  (4, 2, 5, 7.0, 'Chưa có tính năng phân tích báo cáo',        FALSE),
  -- Guest chấm Eagle (sub 4)
  (4, 4, 1, 9.0, 'Very innovative use of NLP',                  FALSE),
  (4, 4, 2, 8.0, 'Good model performance',                      FALSE),
  (4, 4, 3, 7.0, 'UI needs improvement',                        FALSE),
  (4, 4, 4, 8.5, 'Great live demo',                             FALSE),
  (4, 4, 5, 7.5, 'Core features solid',                         FALSE);

-- ── Semi-final: Binh chấm Phoenix & Dragon (sub 6,7), Cam chấm Tiger (sub 8), An chấm Eagle (sub 9)
INSERT INTO Score (submission_id, judge_user_id, criteria_id, value, comment, is_draft) VALUES
  -- Binh chấm Phoenix semi (sub 6) — criteria 6-10
  (6,  3, 6,  9.0, 'Phát triển thêm nhiều tính năng mới',       FALSE),
  (6,  3, 7,  9.5, 'Refactor tốt, thêm unit test',              FALSE),
  (6,  3, 8,  9.0, 'UX cải thiện rõ rệt',                       FALSE),
  (6,  3, 9,  9.0, 'Pitch deck chuyên nghiệp',                   FALSE),
  (6,  3, 10, 8.5, 'Có kế hoạch triển khai thực tế',            FALSE),
  -- Binh chấm Dragon semi (sub 7)
  (7,  3, 6,  8.0, 'Bổ sung thêm tính năng quiz',               FALSE),
  (7,  3, 7,  8.5, 'Thêm payment integration',                   FALSE),
  (7,  3, 8,  8.5, 'Dark mode mới trông chuyên nghiệp',          FALSE),
  (7,  3, 9,  8.0, 'Cải thiện so với vòng trước',                FALSE),
  (7,  3, 10, 7.5, 'Thị trường cạnh tranh cao',                  FALSE),
  -- Cam chấm Tiger semi (sub 8)
  (8, 19, 6,  8.5, 'Thêm tích hợp wearable device',            FALSE),
  (8, 19, 7,  9.0, 'Performance cải thiện đáng kể',             FALSE),
  (8, 19, 8,  9.0, 'UI được polish kỹ',                         FALSE),
  (8, 19, 9,  8.0, 'Demo wearable rất ấn tượng',                FALSE),
  (8, 19, 10, 8.0, 'Tiềm năng mở rộng tốt',                    FALSE),
  -- An chấm Eagle semi (sub 9)
  (9, 2, 6,  9.0, 'Model accuracy tăng lên 92%',                FALSE),
  (9, 2, 7,  8.5, 'Thêm API integration với LMS',               FALSE),
  (9, 2, 8,  8.0, 'Dashboard analytics mới rất hữu ích',        FALSE),
  (9, 2, 9,  8.5, 'Giải thích model AI rất thuyết phục',        FALSE),
  (9, 2, 10, 8.0, 'Thị trường EdTech tiềm năng',               FALSE);

-- ── Final: Binh chấm Phoenix (sub 10), Cam chấm Tiger (sub 11), An+Guest chấm Eagle (sub 12)
INSERT INTO Score (submission_id, judge_user_id, criteria_id, value, comment, is_draft) VALUES
  -- Binh chấm Phoenix final (sub 10) — criteria 11-15
  (10, 3, 11, 9.5, 'Sản phẩm xuất sắc, rất sáng tạo',          FALSE),
  (10, 3, 12, 9.5, 'Kiến trúc microservice hoàn chỉnh',         FALSE),
  (10, 3, 13, 9.0, 'UI/UX đạt chuẩn production',                FALSE),
  (10, 3, 14, 9.5, 'Pitch hoàn hảo, Q&A trả lời tốt',           FALSE),
  (10, 3, 15, 9.0, 'Kế hoạch go-to-market chi tiết',            FALSE),
  -- Cam chấm Tiger final (sub 11)
  (11, 19, 11, 8.5, 'Sản phẩm health tech hoàn thiện',          FALSE),
  (11, 19, 12, 9.0, 'Native app performance xuất sắc',           FALSE),
  (11, 19, 13, 9.5, 'UX mobile tốt nhất trong tất cả team',     FALSE),
  (11, 19, 14, 8.5, 'Demo wearable trực tiếp gây ấn tượng',     FALSE),
  (11, 19, 15, 8.0, 'Thị trường rộng nhưng cạnh tranh cao',     FALSE),
  -- An chấm Eagle final (sub 12)
  (12, 2, 11, 9.0, 'AI grading là giải pháp rất cần thiết',     FALSE),
  (12, 2, 12, 8.5, 'Model fine-tuned tốt, latency thấp',        FALSE),
  (12, 2, 13, 8.5, 'Teacher UX cải thiện nhiều',                 FALSE),
  (12, 2, 14, 9.0, 'Thuyết trình mạch lạc, có số liệu rõ ràng', FALSE),
  (12, 2, 15, 9.0, 'EdTech market rất tiềm năng',               FALSE),
  -- Guest chấm Eagle final (sub 12)
  (12, 4, 11, 9.5, 'Most innovative solution overall',           FALSE),
  (12, 4, 12, 8.5, 'Robust API and model pipeline',             FALSE),
  (12, 4, 13, 8.0, 'Good but could be more intuitive',          FALSE),
  (12, 4, 14, 9.5, 'Best presentation of the final round',      FALSE),
  (12, 4, 15, 9.0, 'Clear monetization strategy',               FALSE);


-- =====================================================
-- 13. ROUND RESULT — event 1
-- Preliminary (round 1, top_n=5 → all advance)
-- Semi-final  (round 2, top_n=2 / track)
-- Final       (round 3): champion mỗi track
-- =====================================================
INSERT INTO RoundResult (team_id, round_id, total_score, rank_position, advanced, is_published, finalized_at, finalized_by) VALUES
  -- Preliminary (round 1)
  (1, 1, 63.50, 1, TRUE, TRUE, '2026-02-28 22:00:00', 1),  -- Phoenix
  (3, 1, 57.25, 2, TRUE, TRUE, '2026-02-28 22:00:00', 1),  -- Tiger
  (4, 1, 55.50, 3, TRUE, TRUE, '2026-02-28 22:00:00', 1),  -- Eagle
  (2, 1, 54.50, 4, TRUE, TRUE, '2026-02-28 22:00:00', 1),  -- Dragon
  (5, 1, 49.75, 5, TRUE, TRUE, '2026-02-28 22:00:00', 1),  -- Falcon

  -- Semi-final (round 2)
  (1, 2, 63.50, 1, TRUE,  TRUE, '2026-03-31 22:00:00', 1),  -- Phoenix → Final
  (3, 2, 59.75, 2, TRUE,  TRUE, '2026-03-31 22:00:00', 1),  -- Tiger → Final
  (4, 2, 59.25, 3, FALSE, TRUE, '2026-03-31 22:00:00', 1),  -- Eagle (khác track → vào Final)
  (2, 2, 57.00, 4, FALSE, TRUE, '2026-03-31 22:00:00', 1),  -- Dragon loại

  -- Final (round 3)
  (1, 3, 65.50, 1, TRUE,  TRUE, '2026-04-30 20:00:00', 1),  -- Phoenix — Web Champion
  (4, 3, 62.00, 2, FALSE, TRUE, '2026-04-30 20:00:00', 1),  -- Eagle — AI Champion
  (3, 3, 61.00, 3, FALSE, TRUE, '2026-04-30 20:00:00', 1);  -- Tiger — Mobile Champion


-- =====================================================
-- 14. PRIZE
-- Event 1 (COMPLETED): đã trao giải (gán team_id + awarded_at).
-- Event 2, 3 (chưa kết thúc): team_id NULL, awarded_at NULL.
-- =====================================================
-- Event 1 — đã trao. track 1=Web, 2=Mobile, 3=AI
INSERT INTO Prize (event_id, track_id, name, description, rank_position, team_id, awarded_at) VALUES
  (1, 1,    'Champion',      'Web Application — Quán quân',         1, 1, '2026-04-30 20:00:00'),  -- Phoenix
  (1, 1,    '1st Runner-up', 'Web Application — Á quân',            2, 2, '2026-04-30 20:00:00'),  -- Dragon
  (1, 2,    'Champion',      'Mobile App — Quán quân',              1, 3, '2026-04-30 20:00:00'),  -- Tiger
  (1, 3,    'Champion',      'AI Solution — Quán quân',             1, 4, '2026-04-30 20:00:00'),  -- Eagle
  (1, NULL, 'Best Overall',  'Đội xuất sắc nhất FUHCM Spring 2026', 1, 1, '2026-04-30 20:00:00');  -- Phoenix

-- Event 2 — chưa trao. track 4=Web, 5=AI, 6=Social, 7=Green
INSERT INTO Prize (event_id, track_id, name, description, rank_position, team_id, awarded_at) VALUES
  (2, 4,  'Champion',      'Web Application — Quán quân',    1, NULL, NULL),
  (2, 4,  '1st Runner-up', 'Web Application — Á quân',       2, NULL, NULL),
  (2, 5,  'Champion',      'AI Solution — Quán quân',        1, NULL, NULL),
  (2, 6,  'Champion',      'Social Impact — Quán quân',      1, NULL, NULL),
  (2, 7,  'Champion',      'Green Tech — Quán quân',         1, NULL, NULL),
  (2, NULL, 'Best Overall', 'Đội xuất sắc nhất FUHCM Summer 2026', 1, NULL, NULL);

-- Event 3 — chưa trao. track 8=Web, 9=AI, 10=EdTech
INSERT INTO Prize (event_id, track_id, name, description, rank_position, team_id, awarded_at) VALUES
  (3, 8,  'Champion',      'Web Application — Quán quân',    1, NULL, NULL),
  (3, 8,  '1st Runner-up', 'Web Application — Á quân',       2, NULL, NULL),
  (3, 9,  'Champion',      'AI Solution — Quán quân',        1, NULL, NULL),
  (3, 10, 'Champion',      'EdTech — Quán quân',             1, NULL, NULL),
  (3, NULL, 'Best Overall', 'Đội xuất sắc nhất FUHN Summer 2026', 1, NULL, NULL);


-- =====================================================
-- 15. ACCOUNT APPROVAL
-- Approved bởi coordinator (user_id 1); 2 user chưa duyệt để test pending flow.
-- =====================================================
INSERT INTO AccountApproval (user_id, reviewed_by, status, note, reviewed_at) VALUES
  (2,  1, 'APPROVED', NULL, '2026-01-05 09:10:00'),
  (3,  1, 'APPROVED', NULL, '2026-01-05 09:12:00'),
  (6,  1, 'APPROVED', NULL, '2026-01-05 09:15:00'),
  (7,  1, 'APPROVED', NULL, '2026-01-05 09:18:00'),
  (8,  1, 'APPROVED', NULL, '2026-02-10 10:00:00'),
  (9,  1, 'APPROVED', NULL, '2026-02-10 10:05:00'),
  (11, 1, 'APPROVED', NULL, '2026-02-10 10:10:00'),
  (12, 1, 'APPROVED', NULL, '2026-02-10 10:12:00'),
  (13, 1, 'APPROVED', NULL, '2026-05-20 09:00:00'),
  (14, 1, 'APPROVED', NULL, '2026-05-20 09:05:00'),
  (15, 1, 'APPROVED', NULL, '2026-05-20 09:08:00'),
  (16, 1, 'APPROVED', NULL, '2026-05-20 09:10:00'),
  (17, 1, 'APPROVED', NULL, '2026-05-20 09:12:00'),
  -- Chưa duyệt (self-registered, đang chờ)
  (10, NULL, 'PENDING', NULL, NULL),
  (23, NULL, 'PENDING', NULL, NULL);


-- =====================================================
-- 16. TEAM INVITE
-- =====================================================
INSERT INTO TeamInvite (team_id, invited_user_id, invited_by, message, status) VALUES
  -- Team Horizon (event 2) mời user 23 (external, đang chờ duyệt)
  (6, 23, 20, 'Chào bạn! Team Horizon muốn mời bạn tham gia nhé.', 'PENDING'),
  -- Team Verde (event 2) mời user 12 — đã chấp nhận (hiện là member)
  (8, 12, 11, NULL, 'ACCEPTED');


-- =====================================================
-- 17. NOTIFICATION
-- =====================================================
INSERT INTO Notification (recipient_user_id, title, content, type, related_event_id) VALUES
  -- Event 1 kết thúc — kết quả
  (5,  'SEAL FUHCM Spring 2026 đã kết thúc — Team Phoenix đoạt giải Quán quân!',
       'Chúc mừng Team Phoenix đã xuất sắc giành giải Champion hạng Web Application '
       'và Best Overall tại SEAL FUHCM Spring 2026!', 'RESULT', 1),
  (17, 'SEAL FUHCM Spring 2026 đã kết thúc — Team Eagle đoạt giải AI Champion!',
       'Chúc mừng Team Eagle đã xuất sắc giành giải Champion hạng AI Solution!', 'RESULT', 1),
  (11, 'SEAL FUHCM Spring 2026 đã kết thúc — Team Tiger đoạt giải Mobile Champion!',
       'Chúc mừng Team Tiger đã xuất sắc giành giải Champion hạng Mobile App!', 'RESULT', 1),
  -- Event 2 đang diễn ra — vòng Preliminary
  (20, 'SEAL FUHCM Summer 2026 đang diễn ra',
       'Sự kiện SEAL Summer 2026 tại FPT University HCM đã bắt đầu — vòng Preliminary đang mở. '
       'Hạn nộp bài: 30/06/2026. Đăng nhập để nộp bài cho team của bạn!',
       'ANNOUNCEMENT', 2),
  (5,  'SEAL FUHCM Summer 2026 đang diễn ra',
       'Sự kiện SEAL Summer 2026 tại FPT University HCM đã bắt đầu — vòng Preliminary đang mở. '
       'Hạn nộp bài: 30/06/2026. Đăng nhập để nộp bài cho team của bạn!',
       'ANNOUNCEMENT', 2),
  (11, 'SEAL FUHCM Summer 2026 đang diễn ra',
       'Sự kiện SEAL Summer 2026 tại FPT University HCM đã bắt đầu — vòng Preliminary đang mở. '
       'Hạn nộp bài: 30/06/2026. Đăng nhập để nộp bài cho team của bạn!',
       'ANNOUNCEMENT', 2),
  -- Event 2 team approved
  (20, 'Team Horizon đã được duyệt',
       'Team của bạn đã được ban tổ chức phê duyệt tham gia SEAL FUHCM Summer 2026.', 'APPROVAL', 2),
  (5,  'Team Nexus đã được duyệt',
       'Team của bạn đã được ban tổ chức phê duyệt tham gia SEAL FUHCM Summer 2026.', 'APPROVAL', 2),
  (11, 'Team Verde đã được duyệt',
       'Team của bạn đã được ban tổ chức phê duyệt tham gia SEAL FUHCM Summer 2026.', 'APPROVAL', 2),
  -- Event 3 team approved
  (24, 'Team Polaris đã được duyệt',
       'Team của bạn đã được ban tổ chức phê duyệt tham gia SEAL FUHN Summer 2026.', 'APPROVAL', 3),
  (8,  'Team Aurora đã được duyệt',
       'Team của bạn đã được ban tổ chức phê duyệt tham gia SEAL FUHN Summer 2026.', 'APPROVAL', 3);


-- =====================================================
-- 18. AUDIT LOG
-- =====================================================
INSERT INTO AuditLog (actor_user_id, action, target_type, target_id, reason, metadata_json, ip_address) VALUES
  -- ── Event lifecycle ──
  (1, 'CREATE_EVENT', 'EVENT', 1, NULL,
   '{"event_name":"SEAL FUHCM Spring 2026","status":"DRAFT"}',    '192.168.1.1'),
  (1, 'COMPLETE_EVENT', 'EVENT', 1, 'Sự kiện đã kết thúc theo lịch',
   '{"event_name":"SEAL FUHCM Spring 2026","completed_at":"2026-04-30T23:59:59"}', '192.168.1.1'),
  (1, 'CREATE_EVENT', 'EVENT', 2, NULL,
   '{"event_name":"SEAL FUHCM Summer 2026","status":"OPEN"}',      '192.168.1.1'),
  (1, 'OPEN_EVENT',   'EVENT', 2, 'Mở đăng ký chính thức',
   '{"event_name":"SEAL FUHCM Summer 2026","opened_at":"2026-04-01T00:00:00"}', '192.168.1.1'),
  (1, 'START_EVENT',  'EVENT', 2, 'Đóng đăng ký, khởi động vòng Preliminary',
   '{"event_name":"SEAL FUHCM Summer 2026","before":"OPEN","after":"IN_PROGRESS","started_at":"2026-06-01T08:00:00"}', '192.168.1.1'),
  (1, 'CREATE_EVENT', 'EVENT', 3, NULL,
   '{"event_name":"SEAL FUHN Summer 2026","status":"OPEN"}',       '192.168.1.1'),
  (1, 'OPEN_EVENT',   'EVENT', 3, 'Mở đăng ký chính thức',
   '{"event_name":"SEAL FUHN Summer 2026","opened_at":"2026-05-15T00:00:00"}',  '192.168.1.1'),
  (1, 'CREATE_EVENT', 'EVENT', 4, NULL,
   '{"event_name":"SEAL FUHCM Fall 2026","status":"DRAFT"}',       '192.168.1.1'),

  -- ── Event 1 team approvals ──
  (1, 'APPROVE_TEAM',   'TEAM',  1, NULL,
   '{"team_name":"Team Phoenix","event_id":1,"before":"PENDING","after":"APPROVED"}', '192.168.1.1'),
  (1, 'APPROVE_TEAM',   'TEAM',  2, NULL,
   '{"team_name":"Team Dragon","event_id":1,"before":"PENDING","after":"APPROVED"}',  '192.168.1.1'),
  (1, 'APPROVE_TEAM',   'TEAM',  3, NULL,
   '{"team_name":"Team Tiger","event_id":1,"before":"PENDING","after":"APPROVED"}',   '192.168.1.1'),
  (1, 'APPROVE_TEAM',   'TEAM',  4, NULL,
   '{"team_name":"Team Eagle","event_id":1,"before":"PENDING","after":"APPROVED"}',   '192.168.1.1'),
  (1, 'APPROVE_TEAM',   'TEAM',  5, NULL,
   '{"team_name":"Team Falcon","event_id":1,"before":"PENDING","after":"APPROVED"}',  '192.168.1.1'),

  -- ── Event 1 result publishing ──
  (1, 'PUBLISH_RESULT', 'ROUND', 1, NULL,
   '{"round_name":"Preliminary","event_id":1,"published_at":"2026-02-28T22:00:00"}',  '192.168.1.1'),
  (1, 'PUBLISH_RESULT', 'ROUND', 2, NULL,
   '{"round_name":"Semi-final","event_id":1,"published_at":"2026-03-31T22:00:00"}',   '192.168.1.1'),
  (1, 'PUBLISH_RESULT', 'ROUND', 3, NULL,
   '{"round_name":"Final","event_id":1,"published_at":"2026-04-30T20:00:00"}',        '192.168.1.1'),
  (1, 'AWARD_PRIZE',    'PRIZE', NULL, NULL,
   '{"event_id":1,"team":"Team Phoenix","prize":"Champion Web + Best Overall"}',      '192.168.1.1'),
  (3, 'UPDATE_SCORE',   'SCORE', 1, 'Xem lại demo, điều chỉnh điểm Innovation',
   '{"before":7.5,"after":9.0,"criteria":"Innovation","submission_id":1}',           '192.168.1.2'),

  -- ── Event 2 team approvals ──
  (1, 'APPROVE_TEAM',   'TEAM',  6, NULL,
   '{"team_name":"Team Horizon","event_id":2,"before":"PENDING","after":"APPROVED"}', '192.168.1.1'),
  (1, 'APPROVE_TEAM',   'TEAM',  7, NULL,
   '{"team_name":"Team Nexus","event_id":2,"before":"PENDING","after":"APPROVED"}',   '192.168.1.1'),
  (1, 'APPROVE_TEAM',   'TEAM',  8, NULL,
   '{"team_name":"Team Verde","event_id":2,"before":"PENDING","after":"APPROVED"}',   '192.168.1.1'),

  -- ── Event 3 team approvals ──
  (1, 'APPROVE_TEAM',   'TEAM', 11, NULL,
   '{"team_name":"Team Polaris","event_id":3,"before":"PENDING","after":"APPROVED"}', '192.168.1.1'),
  (1, 'APPROVE_TEAM',   'TEAM', 12, NULL,
   '{"team_name":"Team Aurora","event_id":3,"before":"PENDING","after":"APPROVED"}',  '192.168.1.1');


-- =====================================================
-- 19. VERIFY — SELECT * cho 16 bảng chính
-- =====================================================
SELECT 'Role' AS table_name; SELECT * FROM Role;

SELECT 'User' AS table_name; SELECT * FROM `User`;

SELECT 'HackathonEvent' AS table_name; SELECT * FROM HackathonEvent;

SELECT 'Track' AS table_name; SELECT * FROM Track;

SELECT 'Round' AS table_name; SELECT * FROM Round;

SELECT 'UserEventRole' AS table_name; SELECT * FROM UserEventRole;

SELECT 'JudgeAssignment' AS table_name; SELECT * FROM JudgeAssignment;

SELECT 'MentorAssignment' AS table_name; SELECT * FROM MentorAssignment;

SELECT 'Team' AS table_name; SELECT * FROM Team;

SELECT 'TeamMember' AS table_name; SELECT * FROM TeamMember;

SELECT 'Submission' AS table_name; SELECT * FROM Submission;

SELECT 'ScoringCriteriaTemplate' AS table_name; SELECT * FROM ScoringCriteriaTemplate;

SELECT 'ScoringCriteria' AS table_name; SELECT * FROM ScoringCriteria;

SELECT 'Score' AS table_name; SELECT * FROM Score;

SELECT 'RoundResult' AS table_name; SELECT * FROM RoundResult;

SELECT 'Prize' AS table_name; SELECT * FROM Prize;

SELECT 'Notification' AS table_name; SELECT * FROM Notification;

SELECT 'AuditLog' AS table_name; SELECT * FROM AuditLog;

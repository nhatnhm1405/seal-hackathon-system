-- =====================================================
-- SEAL Hackathon — DEMO: JUDGE SCORING
-- File: demo_scoring.sql
--
-- MUC DICH:
--   Tao mot event demo DOC LAP (event_id = 90, dai ID cao tach biet) o trang
--   thai IN_PROGRESS + round ACTIVE + du chuoi du lieu de JUDGE cham diem ngay,
--   ma KHONG dung vao seal_seed.sql va KHONG anh huong cac event 1-3 hien co.
--
-- THU TU CHAY:
--   1) seal_schema.sql   (DROP + CREATE DB, tao bang + role)   -- WIPE du lieu cu
--   2) seal_seed.sql     (du lieu goc: user 1-27, event 1-3, ...)
--   3) demo_scoring.sql  (file nay)  <-- BAT BUOC chay SAU seed
--      (vi no tham chieu role JUDGE va cac user co san: 4, 6, 7, 9, 10)
--
--   LUU Y: moi lan chay lai schema la DB bi xoa sach -> phai chay lai file nay.
--   File nay idempotent: chay lai nhieu lan van sach (co khoi DELETE o dau).
--
-- DANG NHAP DEMO (mat khau chung cua seed = "password"):
--   judge.binh@fpt.edu.vn   (user 4, da co ROLE_JUDGE)
--
-- DAI ID DEMO (de xoa sach):
--   event 90 | track 90 | round 90 | criteria 90-93 | team 90-91 | submission 90-91
--
-- GO HAN DU LIEU DEMO:
--   Chay rieng "PHAN 1 — CLEANUP" ben duoi (xoa toan bo dai ID 90).
-- =====================================================

USE seal_hackathon;


-- #####################################################
-- PHAN 1 — CLEANUP  (xoa theo thu tu nguoc khoa ngoai)
-- Chay lai duoc nhieu lan; cung dung de GO HAN du lieu demo.
-- #####################################################
-- Score do judge tao ra khi demo (tham chieu Submission demo)
DELETE FROM Score           WHERE submission_id IN (90, 91);
DELETE FROM JudgeAssignment WHERE round_id = 90;
DELETE FROM Submission      WHERE submission_id IN (90, 91);
DELETE FROM TeamMember      WHERE team_id IN (90, 91);
DELETE FROM Team            WHERE team_id IN (90, 91);
DELETE FROM ScoringCriteria WHERE round_id = 90;
DELETE FROM Round           WHERE round_id = 90;
DELETE FROM UserEventRole   WHERE event_id = 90;
DELETE FROM Track           WHERE track_id = 90;
DELETE FROM HackathonEvent  WHERE event_id = 90;


-- #####################################################
-- PHAN 2 — INSERT DU LIEU DEMO  (theo thu tu khoa ngoai)
-- Moc thoi gian neo quanh "hom nay" 2026-06-15 de event dang IN_PROGRESS.
-- #####################################################

-- 1) HACKATHON EVENT (id 90) — IN_PROGRESS (10/06 -> 20/06/2026)
INSERT INTO HackathonEvent
  (event_id, name, season, year, description,
   registration_start, registration_end, start_date, end_date, status)
VALUES
  (90, 'SEAL Demo Scoring 2026', 'SUMMER', 2026,
   'Event DEMO danh rieng cho viec cham diem (judge). Khong dung vao du lieu that.',
   '2026-05-01 00:00:00', '2026-06-05 23:59:59',
   '2026-06-10 08:00:00', '2026-06-20 23:59:59',
   'IN_PROGRESS');

-- 2) TRACK (id 90)
INSERT INTO Track (track_id, event_id, name, description) VALUES
  (90, 90, 'AI Solution (Demo)', 'Track demo de cham diem');

-- 3) ROUND (id 90) — ACTIVE, deadline 14/06 da qua -> cac team da nop bai
INSERT INTO Round
  (round_id, event_id, name, order_number, start_time, end_time,
   submission_deadline, top_n_advance, is_final, status)
VALUES
  (90, 90, 'Preliminary (Demo)', 1,
   '2026-06-12 08:00:00', '2026-06-20 23:59:59', '2026-06-14 23:59:59',
   3, FALSE, 'ACTIVE');

-- 4) SCORING CRITERIA (id 90-93) — BAT BUOC, neu thieu thi nut luu bi khoa
--    weighted_total = Σ (value × weight). Tong weight = 1.00, max_score = 10.
INSERT INTO ScoringCriteria
  (criteria_id, event_id, round_id, template_id, name, description, weight, max_score, order_number)
VALUES
  (90, 90, 90, NULL, 'Innovation', 'Tinh moi va sang tao cua giai phap',        0.25, 10.0, 1),
  (91, 90, 90, NULL, 'Technical',  'Chat luong code, kien truc, hieu nang',     0.30, 10.0, 2),
  (92, 90, 90, NULL, 'Design/UX',  'Trai nghiem nguoi dung, trinh bay, tai lieu', 0.20, 10.0, 3),
  (93, 90, 90, NULL, 'Impact',     'Kha nang ung dung thuc te va tiem nang',    0.25, 10.0, 4);

-- 5) TEAM (id 90-91) — status APPROVED (judge chi thay team APPROVED trong track)
INSERT INTO Team (team_id, event_id, track_id, name, description, status) VALUES
  (90, 90, 90, 'Demo Team Alpha', 'Team demo so 1', 'APPROVED'),
  (91, 90, 90, 'Demo Team Beta',  'Team demo so 2', 'APPROVED');

-- 6) TEAM MEMBER (dung user co san tu seed; deu da is_approved = TRUE)
INSERT INTO TeamMember (team_id, user_id, member_role) VALUES
  (90, 6, 'LEADER'),   -- Hoang Van Leader
  (90, 7, 'MEMBER'),   -- Nguyen Thi Lan
  (91, 9, 'LEADER'),   -- Do Van Long (HCMUT)
  (91, 10, 'MEMBER');  -- Vo Thi Hoa (HCMUT)

-- 7) SUBMISSION (id 90-91) — da nop truoc deadline 14/06, status SUBMITTED
INSERT INTO Submission
  (submission_id, team_id, round_id, repo_url, demo_url, slide_url, description,
   submitted_at, submitted_by, status)
VALUES
  (90, 90, 90,
   'https://github.com/demo/alpha', 'https://demo-alpha.example.com', 'https://slides.example.com/alpha',
   'Du an demo cua Team Alpha — chua cham diem.',
   '2026-06-13 10:00:00', 6, 'SUBMITTED'),
  (91, 91, 90,
   'https://github.com/demo/beta', 'https://demo-beta.example.com', 'https://slides.example.com/beta',
   'Du an demo cua Team Beta — chua cham diem.',
   '2026-06-14 09:30:00', 9, 'SUBMITTED');

-- 8) JUDGE ASSIGNMENT (id 90) — judge user 4 cham track 90, round 90
--    findActiveByJudge chi loc is_active = TRUE -> can is_active = 1
INSERT INTO JudgeAssignment (id, judge_user_id, round_id, track_id, is_active) VALUES
  (90, 4, 90, 90, TRUE);

-- 9) USER EVENT ROLE (tuy chon — cho nhat quan) judge user 4 = JUDGE trong event 90
--    Khong bat buoc cho quyen (user 4 da co ROLE_JUDGE tu event 1), nhung giup
--    cac man coordinator/roster hien thi dung trong pham vi event demo.
INSERT INTO UserEventRole (user_id, role_id, event_id) VALUES
  (4, 4, 90);   -- role_id 4 = JUDGE


-- =====================================================
-- KIEM TRA NHANH (tuy chon — bo comment de chay)
-- =====================================================
-- SELECT * FROM HackathonEvent WHERE event_id = 90;
-- SELECT * FROM Round          WHERE round_id = 90;
-- SELECT * FROM ScoringCriteria WHERE round_id = 90;
-- SELECT * FROM Submission     WHERE round_id = 90;
-- SELECT * FROM JudgeAssignment WHERE round_id = 90;

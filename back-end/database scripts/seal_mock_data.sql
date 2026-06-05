USE seal_hackathon;

-- =====================================================
-- MOCK DATA CHO BẢNG TeamAssignment
-- Cần chạy sau script seal_seed.sql
-- =====================================================

-- Xóa dữ liệu cũ của bảng để có thể chạy đi chạy lại idempotent
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE TeamAssignment;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Thêm assignments cho Mentor (user_id = 2: mentor.an@fpt.edu.vn)
-- Mentor An được phân công hướng dẫn các đội:
-- - Team Alpha (team_id = 1) -> ACTIVE
-- - Team Beta (team_id = 2) -> ACTIVE
-- - Team Gamma (team_id = 3) -> INACTIVE (để test lọc is_active = 1)
INSERT INTO
    TeamAssignment (
        team_id,
        user_id,
        assignment_type,
        event_id,
        round_id,
        assigned_by,
        is_active
    )
VALUES (1, 2, 'MENTOR', 1, NULL, 1, 1),
    (2, 2, 'MENTOR', 1, NULL, 1, 1),
    (3, 2, 'MENTOR', 1, NULL, 1, 0);

-- 2. Thêm assignments cho Judge (user_id = 3: judge.binh@fpt.edu.vn)
-- Judge Binh được phân công chấm các đội trong vòng Preliminary (round_id = 1):
-- - Team Alpha (team_id = 1) -> ACTIVE
-- - Team Beta (team_id = 2) -> ACTIVE
-- - Team Delta (team_id = 4) -> INACTIVE (để test lọc is_active = 1)
INSERT INTO
    TeamAssignment (
        team_id,
        user_id,
        assignment_type,
        event_id,
        round_id,
        assigned_by,
        is_active
    )
VALUES (1, 3, 'JUDGE', 1, 1, 1, 1),
    (2, 3, 'JUDGE', 1, 1, 1, 1),
    (4, 3, 'JUDGE', 1, 1, 1, 0);
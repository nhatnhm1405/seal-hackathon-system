-- ============================================================================
-- SEAL HACKATHON MANAGEMENT SYSTEM
-- Seed / Sample Data Script (MySQL Version)
-- Target: MySQL 8.0+
-- ============================================================================
-- PREREQUISITES:
--   Execute 01_seal_hackathon_ddl.sql first to create all tables.
-- INSTRUCTIONS:
--   Open this file in your MySQL client and execute.
-- ============================================================================

USE seal_hackathon;

-- ============================================================================
-- 1. GLOBAL ROLES
-- ============================================================================
INSERT INTO roles (role_id, role_name, description) VALUES
(1, 'ADMIN',      'Full system access, platform configuration, and user management'),
(2, 'ORGANIZER',  'Event management, round setup, judge/mentor assignments'),
(3, 'USER',       'General users: participants, mentors, judges (event-role via assignment tables)');

-- ============================================================================
-- 2. SYSTEM PERMISSIONS
-- ============================================================================
INSERT INTO permissions (permission_id, permission_key, description) VALUES
(1,  'event:create',      'Create new hackathon events'),
(2,  'event:edit',         'Modify event details, dates, and status'),
(3,  'event:delete',       'Soft-delete hackathon events'),
(4,  'team:create',        'Create and lead a hackathon team'),
(5,  'team:manage',        'Approve/reject team registrations'),
(6,  'submission:create',  'Submit project deliverables'),
(7,  'submission:view',    'View all submissions (judges/organizers)'),
(8,  'score:write',        'Grade team submissions'),
(9,  'score:view_all',     'View all scores and rankings'),
(10, 'user:approve',       'Approve external user registrations'),
(11, 'user:manage',        'Manage user accounts and roles'),
(12, 'audit:view',         'View audit logs');

-- ============================================================================
-- 3. ROLE-PERMISSION MAPPINGS
-- ============================================================================
-- ADMIN: all permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6),
(1, 7), (1, 8), (1, 9), (1, 10), (1, 11), (1, 12);

-- ORGANIZER: event management, team management, scoring oversight
INSERT INTO role_permissions (role_id, permission_id) VALUES
(2, 1), (2, 2), (2, 5), (2, 7), (2, 8), (2, 9), (2, 10);

-- USER: team creation, submission, viewing own scores
INSERT INTO role_permissions (role_id, permission_id) VALUES
(3, 4), (3, 6);

-- ============================================================================
-- 4. USERS (password hashes are bcrypt placeholders)
-- ============================================================================
INSERT INTO users (user_id, role_id, email, password_hash, status) VALUES
-- Admins
(1,  1, 'admin@sealhackathon.com',      '$2b$12$AdminSecureHashStringValueHereXX', 'ACTIVE'),
-- Organizers / Coordinators
(2,  2, 'coordinator1@sealhackathon.com', '$2b$12$Coord1SecureHashStringValueHere', 'ACTIVE'),
(3,  2, 'coordinator2@sealhackathon.com', '$2b$12$Coord2SecureHashStringValueHere', 'ACTIVE'),
-- Judges
(4,  3, 'judge.binh@techcorp.vn',         '$2b$12$Judge1SecureHashStringValueHere', 'ACTIVE'),
(5,  3, 'judge.linh@innovate.vn',          '$2b$12$Judge2SecureHashStringValueHere', 'ACTIVE'),
(6,  3, 'judge.guest@external.com',        '$2b$12$Judge3SecureHashStringValueHere', 'ACTIVE'),
-- Mentors
(7,  3, 'mentor.minh@vng.vn',             '$2b$12$Mentor1SecureHashStringValueHer', 'ACTIVE'),
(8,  3, 'mentor.tuan@fpt.edu.vn',         '$2b$12$Mentor2SecureHashStringValueHer', 'ACTIVE'),
-- Participants (Team Leaders)
(9,  3, 'an.nguyen@fpt.edu.vn',           '$2b$12$Leader1SecureHashStringValueHer', 'ACTIVE'),
(10, 3, 'huong.le@fpt.edu.vn',            '$2b$12$Leader2SecureHashStringValueHer', 'ACTIVE'),
(11, 3, 'david.chen@hust.edu.vn',         '$2b$12$Leader3SecureHashStringValueHer', 'ACTIVE'),
-- Participants (Team Members)
(12, 3, 'bao.tran@fpt.edu.vn',            '$2b$12$Member1SecureHashStringValueHer', 'ACTIVE'),
(13, 3, 'chi.pham@fpt.edu.vn',            '$2b$12$Member2SecureHashStringValueHer', 'ACTIVE'),
(14, 3, 'dung.vo@fpt.edu.vn',             '$2b$12$Member3SecureHashStringValueHer', 'ACTIVE'),
(15, 3, 'emily.wang@rmit.edu.vn',         '$2b$12$Member4SecureHashStringValueHer', 'ACTIVE'),
(16, 3, 'fong.li@hust.edu.vn',            '$2b$12$Member5SecureHashStringValueHer', 'ACTIVE'),
-- Pending user (for account approval testing)
(17, 3, 'pending.user@gmail.com',          '$2b$12$PendingSecureHashStringValueHer', 'PENDING');

-- ============================================================================
-- 5. USER PROFILES (Vietnamese names with diacritics)
-- ============================================================================
INSERT INTO user_profiles (user_id, first_name, last_name, phone_number, student_id, student_type, university_name) VALUES
(1,  'Hoàng',   'Nguyễn',  '0912345678', NULL,        'NONE',     'SEAL Hackathon Board'),
(2,  'Nhật',    'Đào',     '0987654321', NULL,        'NONE',     'FPT University'),
(3,  'Lan',     'Phạm',    '0901111111', NULL,        'NONE',     'FPT University'),
(4,  'Bình',    'Trần',    '0901234567', NULL,        'NONE',     'TechCorp Research'),
(5,  'Linh',    'Vũ',      '0902345678', NULL,        'NONE',     'Innovate Labs'),
(6,  'Guest',   'Judge',   '0903456789', NULL,        'NONE',     'External Organization'),
(7,  'Minh',    'Lê',      '0934567890', NULL,        'NONE',     'VNG Corporation'),
(8,  'Tuấn',    'Ngô',     '0945678901', 'SE140001', 'FPT',      'FPT University HCM'),
(9,  'An',      'Nguyễn',  '0956789012', 'SE150123', 'FPT',      'FPT University Đà Nẵng'),
(10, 'Hương',   'Lê',      '0967890123', 'SE150456', 'FPT',      'FPT University HCM'),
(11, 'David',   'Chen',    '0978901234', 'IT200789', 'EXTERNAL', 'HUST Hanoi'),
(12, 'Bảo',     'Trần',    '0989012345', 'SE150789', 'FPT',      'FPT University Đà Nẵng'),
(13, 'Chi',     'Phạm',    '0990123456', 'SE151000', 'FPT',      'FPT University HCM'),
(14, 'Dũng',    'Võ',      '0911234567', 'SE151111', 'FPT',      'FPT University Đà Nẵng'),
(15, 'Emily',   'Wang',    '0922345678', 'IT300100', 'EXTERNAL', 'RMIT Vietnam'),
(16, 'Fong',    'Li',      '0933456789', 'IT200800', 'EXTERNAL', 'HUST Hanoi'),
(17, 'Pending', 'User',    '0944567890', NULL,        'NONE',     NULL);

-- ============================================================================
-- 6. ACCOUNT APPROVALS
-- ============================================================================
INSERT INTO account_approvals (user_id, reviewed_by, status, note) VALUES
(9,  1, 'APPROVED', 'FPT student verified via student ID card.'),
(10, 1, 'APPROVED', 'FPT student verified.'),
(11, 1, 'APPROVED', 'External student from HUST. University confirmation letter received.'),
(15, 2, 'APPROVED', 'RMIT student. Verified via enrollment letter.'),
(17, NULL, 'PENDING', NULL);

-- ============================================================================
-- 7. HACKATHON EVENTS
-- ============================================================================
INSERT INTO events (event_id, event_name, season, academic_year, start_date, end_date, status) VALUES
(1, 'SEAL Hackathon Summer 2026',  'SUMMER', 2026, '2026-06-01', '2026-06-03', 'OPEN'),
(2, 'SEAL Hackathon Fall 2026',    'FALL',   2026, '2026-10-15', '2026-10-17', 'DRAFT');

-- ============================================================================
-- 8. EVENT COORDINATORS
-- ============================================================================
INSERT INTO event_coordinators (event_id, user_id) VALUES
(1, 2),  -- Coordinator 1 manages Summer 2026
(1, 3),  -- Coordinator 2 also manages Summer 2026
(2, 2);  -- Coordinator 1 manages Fall 2026

-- ============================================================================
-- 9. EVENT ACTIVITIES (Workshops, Webinars, etc.)
-- ============================================================================
INSERT INTO event_activities (event_id, organizer_id, title, description, activity_type, scheduled_start, scheduled_end, location_url) VALUES
(1, 2, 'Kickoff Webinar',          'Introduction to hackathon rules, APIs, and judging criteria.',                  'WEBINAR',       '2026-06-01 09:00:00', '2026-06-01 10:30:00', 'https://zoom.us/j/seal-kickoff-2026'),
(1, 7, 'AI Mentoring Session #1',  'Hands-on guidance on integrating LLMs into your project.',                      'MENTORING',     '2026-06-01 14:00:00', '2026-06-01 15:30:00', 'https://meet.google.com/seal-ai-mentor'),
(1, 3, 'Midpoint Check-in',        'Mandatory progress report. Teams must show working prototype.',                  'WORKSHOP',      '2026-06-02 10:00:00', '2026-06-02 12:00:00', 'FPT University - Room A301'),
(1, 2, 'Final Results Announcement', 'Awards ceremony and closing remarks.',                                          'ANNOUNCEMENT',  '2026-06-03 16:00:00', '2026-06-03 17:00:00', 'https://zoom.us/j/seal-closing-2026');

-- ============================================================================
-- 10. TRACKS
-- ============================================================================
INSERT INTO tracks (track_id, event_id, track_name, description, max_teams) VALUES
(1, 1, 'Generative AI Solutions',   'Building production-grade applications powered by GenAI, LLMs, and multi-modal models.', 20),
(2, 1, 'FinTech Innovation',        'Disrupting financial services with blockchain, payments, or banking solutions.',           15),
(3, 1, 'HealthTech for Good',       'Technology solutions addressing healthcare challenges in Southeast Asia.',                 10);

-- ============================================================================
-- 11. TEAMS
-- ============================================================================
INSERT INTO teams (team_id, track_id, leader_id, team_name, status) VALUES
(1, 1, 9,  'Tech Wizards',     'APPROVED'),
(2, 1, 10, 'AI Dreamers',      'APPROVED'),
(3, 2, 11, 'FinCode Masters',  'APPROVED'),
(4, 3, 12, 'HealthHack VN',    'PENDING');

-- ============================================================================
-- 12. TEAM MEMBERS
-- ============================================================================
-- Team 1: Tech Wizards (Track: GenAI)
INSERT INTO team_members (team_id, user_id, role_in_team) VALUES
(1, 9,  'LEADER'),    -- An Nguyen (leader)
(1, 12, 'MEMBER'),    -- Bao Tran
(1, 13, 'MEMBER');    -- Chi Pham

-- Team 2: AI Dreamers (Track: GenAI)
INSERT INTO team_members (team_id, user_id, role_in_team) VALUES
(2, 10, 'LEADER'),    -- Huong Le (leader)
(2, 14, 'MEMBER');    -- Dung Vo

-- Team 3: FinCode Masters (Track: FinTech)
INSERT INTO team_members (team_id, user_id, role_in_team) VALUES
(3, 11, 'LEADER'),    -- David Chen (leader)
(3, 15, 'MEMBER'),    -- Emily Wang
(3, 16, 'MEMBER');    -- Fong Li

-- Team 4: HealthHack VN (Track: HealthTech) - Pending approval
INSERT INTO team_members (team_id, user_id, role_in_team) VALUES
(4, 12, 'LEADER');    -- Bao Tran (also in Team 1 as member - cross-track scenario)

-- ============================================================================
-- 13. TEAM INVITATIONS
-- ============================================================================
INSERT INTO team_invitations (team_id, inviter_id, invitee_email, status, expires_at) VALUES
(1, 9,  'newmember@fpt.edu.vn',     'PENDING',  '2026-06-01 23:59:59'),
(2, 10, 'potential@fpt.edu.vn',      'EXPIRED',  '2026-05-20 23:59:59'),
(3, 11, 'another@hust.edu.vn',       'DECLINED', '2026-05-25 23:59:59');

-- ============================================================================
-- 14. MENTOR ASSIGNMENTS
-- ============================================================================
INSERT INTO mentor_assignments (mentor_id, track_id, team_id) VALUES
(7, 1,    NULL),    -- Mentor Minh assigned to entire GenAI track
(8, NULL, 3);       -- Mentor Tuan assigned specifically to Team 3 (FinCode Masters)

-- ============================================================================
-- 15. ROUNDS
-- ============================================================================
INSERT INTO rounds (round_id, event_id, round_name, round_order, submission_deadline, top_n_advance, status) VALUES
(1, 1, 'Round 1: Idea Pitch',       1, '2026-06-01 23:59:59', 10, 'CLOSED'),
(2, 1, 'Round 2: Prototype Demo',   2, '2026-06-02 20:00:00', 5,  'ACTIVE'),
(3, 1, 'Round 3: Final Presentation', 3, '2026-06-03 14:00:00', NULL, 'UPCOMING');

-- ============================================================================
-- 16. JUDGE ASSIGNMENTS
-- ============================================================================
-- Round 1: All 3 judges
INSERT INTO judge_assignments (judge_id, round_id, judge_type) VALUES
(4, 1, 'INTERNAL'),   -- Judge Binh - Round 1
(5, 1, 'INTERNAL'),   -- Judge Linh - Round 1
(6, 1, 'GUEST');      -- Guest Judge - Round 1

-- Round 2: Internal judges only
INSERT INTO judge_assignments (judge_id, round_id, judge_type) VALUES
(4, 2, 'INTERNAL'),   -- Judge Binh - Round 2
(5, 2, 'INTERNAL');   -- Judge Linh - Round 2

-- Round 3: All judges for final
INSERT INTO judge_assignments (judge_id, round_id, judge_type) VALUES
(4, 3, 'INTERNAL'),
(5, 3, 'INTERNAL'),
(6, 3, 'GUEST');

-- ============================================================================
-- 17. CRITERIA SETS & SCORING CRITERIA
-- ============================================================================
INSERT INTO criteria_sets (set_id, event_id, set_name, description) VALUES
(1, 1, 'General Rubric v1', 'Standard grading rubric for SEAL Hackathon Summer 2026');

INSERT INTO scoring_criteria (criteria_id, set_id, criteria_name, description, max_score, default_weight) VALUES
(1, 1, 'Innovation & Originality',    'Uniqueness of the problem solved and the approach taken.',                10.00, 1.50),
(2, 1, 'Technical Feasibility',       'Quality of implementation, code stability, and architecture.',            10.00, 1.00),
(3, 1, 'Business Impact',             'Potential market viability and real-world impact of the solution.',        10.00, 1.00),
(4, 1, 'Presentation & Demo Quality', 'Clarity, professionalism, and effectiveness of the team''s pitch.',       10.00, 0.75),
(5, 1, 'UX/UI Design',                'User experience design, accessibility, and visual polish.',               10.00, 0.75);

-- ============================================================================
-- 18. ROUND-CRITERIA MAPPINGS
-- ============================================================================
-- Round 1 (Idea Pitch): Innovation weighted higher, no UX/UI
INSERT INTO round_criteria (round_id, criteria_id, weight_override) VALUES
(1, 1, 2.00),  -- Innovation: weight boosted from 1.50 to 2.00 for idea round
(1, 2, NULL),  -- Technical: uses default (1.00)
(1, 3, NULL),  -- Business: uses default (1.00)
(1, 4, 1.00); -- Presentation: slightly boosted from 0.75 for pitch round

-- Round 2 (Prototype Demo): Technical weighted higher, includes UX/UI
INSERT INTO round_criteria (round_id, criteria_id, weight_override) VALUES
(2, 1, NULL),  -- Innovation: default
(2, 2, 1.50),  -- Technical: boosted for prototype round
(2, 3, NULL),  -- Business: default
(2, 4, NULL),  -- Presentation: default
(2, 5, 1.00); -- UX/UI: included for prototype round

-- Round 3 (Final): All criteria, balanced weights
INSERT INTO round_criteria (round_id, criteria_id, weight_override) VALUES
(3, 1, NULL),
(3, 2, NULL),
(3, 3, 1.50),  -- Business Impact: boosted for final round
(3, 4, 1.00),
(3, 5, 1.00);

-- ============================================================================
-- 19. SUBMISSIONS (Round 1 - all approved teams submitted)
-- ============================================================================
INSERT INTO submissions (submission_id, team_id, round_id, project_name, description) VALUES
(1, 1, 1, 'AI-StudyBuddy',   'A personalized learning assistant that uses RAG and GPT-4 to help Vietnamese college students study more effectively.'),
(2, 2, 1, 'SmartRecruiter',  'AI-powered resume screening and candidate matching platform for Vietnamese tech companies.'),
(3, 3, 1, 'PayShield',       'Blockchain-based fraud detection system for Vietnamese mobile payment platforms.');

-- ============================================================================
-- 20. SUBMISSION ASSETS
-- ============================================================================
-- Team 1: AI-StudyBuddy
INSERT INTO submission_assets (submission_id, asset_type, asset_url) VALUES
(1, 'GITHUB_REPO',  'https://github.com/tech-wizards/ai-studybuddy'),
(1, 'SLIDE_DECK',   'https://docs.google.com/presentation/d/ai-studybuddy-pitch'),
(1, 'DEMO_VIDEO',   'https://www.youtube.com/watch?v=ai-studybuddy-demo');

-- Team 2: SmartRecruiter
INSERT INTO submission_assets (submission_id, asset_type, asset_url) VALUES
(2, 'GITHUB_REPO',  'https://github.com/ai-dreamers/smart-recruiter'),
(2, 'SLIDE_DECK',   'https://docs.google.com/presentation/d/smart-recruiter-pitch');

-- Team 3: PayShield
INSERT INTO submission_assets (submission_id, asset_type, asset_url) VALUES
(3, 'GITHUB_REPO',  'https://github.com/fincode-masters/payshield'),
(3, 'SLIDE_DECK',   'https://canva.com/design/payshield-deck'),
(3, 'FIGMA_DESIGN', 'https://www.figma.com/file/payshield-ui-mockup');

-- ============================================================================
-- 21. SCORES (Round 1 - Judges have finalized scores)
-- ============================================================================
-- Judge 4 (Binh) scores for Round 1
INSERT INTO scores (submission_id, judge_id, criteria_id, score_value, is_draft) VALUES
(1, 4, 1, 9.00, 0),   -- Team 1, Innovation
(1, 4, 2, 8.50, 0),   -- Team 1, Technical
(1, 4, 3, 7.50, 0),   -- Team 1, Business
(1, 4, 4, 8.00, 0),   -- Team 1, Presentation
(2, 4, 1, 8.00, 0),   -- Team 2, Innovation
(2, 4, 2, 7.50, 0),   -- Team 2, Technical
(2, 4, 3, 8.50, 0),   -- Team 2, Business
(2, 4, 4, 7.00, 0),   -- Team 2, Presentation
(3, 4, 1, 7.00, 0),   -- Team 3, Innovation
(3, 4, 2, 9.00, 0),   -- Team 3, Technical
(3, 4, 3, 8.00, 0),   -- Team 3, Business
(3, 4, 4, 7.50, 0);   -- Team 3, Presentation

-- Judge 5 (Linh) scores for Round 1
INSERT INTO scores (submission_id, judge_id, criteria_id, score_value, is_draft) VALUES
(1, 5, 1, 9.50, 0),   -- Team 1, Innovation
(1, 5, 2, 8.00, 0),   -- Team 1, Technical
(1, 5, 3, 7.00, 0),   -- Team 1, Business
(1, 5, 4, 8.50, 0),   -- Team 1, Presentation
(2, 5, 1, 7.50, 0),   -- Team 2, Innovation
(2, 5, 2, 8.00, 0),   -- Team 2, Technical
(2, 5, 3, 9.00, 0),   -- Team 2, Business
(2, 5, 4, 7.50, 0),   -- Team 2, Presentation
(3, 5, 1, 7.50, 0),   -- Team 3, Innovation
(3, 5, 2, 8.50, 0),   -- Team 3, Technical
(3, 5, 3, 8.50, 0),   -- Team 3, Business
(3, 5, 4, 8.00, 0);   -- Team 3, Presentation

-- Judge 6 (Guest) scores for Round 1
INSERT INTO scores (submission_id, judge_id, criteria_id, score_value, is_draft) VALUES
(1, 6, 1, 8.50, 0),
(1, 6, 2, 8.00, 0),
(1, 6, 3, 7.50, 0),
(1, 6, 4, 9.00, 0),
(2, 6, 1, 8.00, 0),
(2, 6, 2, 7.00, 0),
(2, 6, 3, 8.00, 0),
(2, 6, 4, 7.00, 0),
(3, 6, 1, 6.50, 0),
(3, 6, 2, 9.50, 0),
(3, 6, 3, 7.50, 0),
(3, 6, 4, 7.00, 0);

-- ============================================================================
-- 22. ROUND RANKINGS (Round 1 - Pre-calculated)
-- ============================================================================
INSERT INTO round_rankings (team_id, round_id, total_score, position, is_advanced) VALUES
(1, 1, 41.50, 1, 1),   -- Tech Wizards: 1st place, advances
(3, 1, 39.75, 2, 1),   -- FinCode Masters: 2nd place, advances
(2, 1, 38.25, 3, 1);   -- AI Dreamers: 3rd place, advances

-- ============================================================================
-- 23. PRIZES
-- ============================================================================
INSERT INTO prizes (event_id, prize_name, description, rank_position, cash_value) VALUES
(1, 'Grand Champion',           'Overall first place winner of SEAL Hackathon Summer 2026.',   1, 50000000.00),
(1, 'First Runner-Up',          'Second place winner.',                                        2, 30000000.00),
(1, 'Second Runner-Up',         'Third place winner.',                                         3, 15000000.00),
(1, 'Best Innovation Award',    'Highest innovation score across all rounds.',                  4, 10000000.00),
(1, 'Best Technical Implementation', 'Best code quality and architecture.',                     5, 10000000.00);

-- ============================================================================
-- 24. NOTIFICATIONS
-- ============================================================================
INSERT INTO notifications (user_id, title, message, is_read) VALUES
(9,  'Team Approved',              'Your team "Tech Wizards" has been approved for SEAL Hackathon Summer 2026. Good luck!',              1),
(9,  'Round 1 Submission Received', 'Your submission "AI-StudyBuddy" for Round 1 has been received successfully.',                         1),
(9,  'Round 1 Results Published',   'Congratulations! Your team ranked #1 in Round 1 and advances to Round 2.',                          0),
(10, 'Round 1 Results Published',   'Your team "AI Dreamers" ranked #3 in Round 1 and advances to Round 2.',                             0),
(11, 'Round 1 Results Published',   'Your team "FinCode Masters" ranked #2 in Round 1 and advances to Round 2.',                         0),
(12, 'Team Registration Pending',   'Your team "HealthHack VN" registration is pending organizer approval.',                              0),
(17, 'Account Under Review',        'Your account registration is being reviewed by our team. You will be notified once approved.',       0);

-- ============================================================================
-- 25. AUDIT LOGS
-- ============================================================================
INSERT INTO audit_logs (performed_by, action_type, entity_type, entity_id, details, ip_address) VALUES
(1, 'INSERT', 'Event',       1, '{"event_name":"SEAL Hackathon Summer 2026","status":"DRAFT"}',                           '192.168.1.100'),
(1, 'UPDATE', 'Event',       1, '{"field":"status","old":"DRAFT","new":"OPEN"}',                                          '192.168.1.100'),
(1, 'UPDATE', 'User',        9, '{"field":"status","old":"PENDING","new":"ACTIVE","reason":"Student ID verified"}',        '192.168.1.100'),
(2, 'INSERT', 'Track',       1, '{"track_name":"Generative AI Solutions","event_id":1}',                                  '10.0.0.50'),
(9, 'INSERT', 'Team',        1, '{"team_name":"Tech Wizards","track_id":1}',                                              '172.16.0.22'),
(1, 'UPDATE', 'Team',        1, '{"field":"status","old":"PENDING","new":"APPROVED"}',                                    '192.168.1.100'),
(9, 'INSERT', 'Submission',  1, '{"project_name":"AI-StudyBuddy","round_id":1}',                                          '172.16.0.22'),
(4, 'INSERT', 'Score',       NULL, '{"submission_id":1,"judge_id":4,"criteria_count":4,"action":"finalized_all_scores"}',  '10.0.1.15'),
(1, 'INSERT', 'Ranking',     NULL, '{"round_id":1,"teams_ranked":3,"action":"rankings_calculated"}',                      '192.168.1.100');

SELECT '=== Seed data inserted successfully! ===' AS message;
SELECT '=== Total: 17 users, 2 events, 3 tracks, 4 teams, 3 rounds, 36 scores ===' AS message;

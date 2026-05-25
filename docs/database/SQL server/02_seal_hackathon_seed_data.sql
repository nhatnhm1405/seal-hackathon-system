-- ============================================================================
-- SEAL HACKATHON MANAGEMENT SYSTEM
-- Seed / Sample Data Script
-- Target: Microsoft SQL Server 2016+ / SSMS 19
-- ============================================================================
-- PREREQUISITES:
--   Execute 01_seal_hackathon_ddl.sql first to create all tables.
-- INSTRUCTIONS:
--   Open this file in SSMS 19 and execute (F5).
-- ============================================================================

-- ============================================================================
-- 1. GLOBAL ROLES
-- ============================================================================
SET IDENTITY_INSERT roles ON;
INSERT INTO roles (role_id, role_name, description) VALUES
(1, N'ADMIN',      N'Full system access, platform configuration, and user management'),
(2, N'ORGANIZER',  N'Event management, round setup, judge/mentor assignments'),
(3, N'USER',       N'General users: participants, mentors, judges (event-role via assignment tables)');
SET IDENTITY_INSERT roles OFF;
GO

-- ============================================================================
-- 2. SYSTEM PERMISSIONS
-- ============================================================================
SET IDENTITY_INSERT permissions ON;
INSERT INTO permissions (permission_id, permission_key, description) VALUES
(1,  N'event:create',      N'Create new hackathon events'),
(2,  N'event:edit',         N'Modify event details, dates, and status'),
(3,  N'event:delete',       N'Soft-delete hackathon events'),
(4,  N'team:create',        N'Create and lead a hackathon team'),
(5,  N'team:manage',        N'Approve/reject team registrations'),
(6,  N'submission:create',  N'Submit project deliverables'),
(7,  N'submission:view',    N'View all submissions (judges/organizers)'),
(8,  N'score:write',        N'Grade team submissions'),
(9,  N'score:view_all',     N'View all scores and rankings'),
(10, N'user:approve',       N'Approve external user registrations'),
(11, N'user:manage',        N'Manage user accounts and roles'),
(12, N'audit:view',         N'View audit logs');
SET IDENTITY_INSERT permissions OFF;
GO

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
GO

-- ============================================================================
-- 4. USERS (password hashes are bcrypt placeholders)
-- ============================================================================
SET IDENTITY_INSERT users ON;
INSERT INTO users (user_id, role_id, email, password_hash, status) VALUES
-- Admins
(1,  1, N'admin@sealhackathon.com',      N'$2b$12$AdminSecureHashStringValueHereXX', N'ACTIVE'),
-- Organizers / Coordinators
(2,  2, N'coordinator1@sealhackathon.com', N'$2b$12$Coord1SecureHashStringValueHere', N'ACTIVE'),
(3,  2, N'coordinator2@sealhackathon.com', N'$2b$12$Coord2SecureHashStringValueHere', N'ACTIVE'),
-- Judges
(4,  3, N'judge.binh@techcorp.vn',         N'$2b$12$Judge1SecureHashStringValueHere', N'ACTIVE'),
(5,  3, N'judge.linh@innovate.vn',          N'$2b$12$Judge2SecureHashStringValueHere', N'ACTIVE'),
(6,  3, N'judge.guest@external.com',        N'$2b$12$Judge3SecureHashStringValueHere', N'ACTIVE'),
-- Mentors
(7,  3, N'mentor.minh@vng.vn',             N'$2b$12$Mentor1SecureHashStringValueHer', N'ACTIVE'),
(8,  3, N'mentor.tuan@fpt.edu.vn',         N'$2b$12$Mentor2SecureHashStringValueHer', N'ACTIVE'),
-- Participants (Team Leaders)
(9,  3, N'an.nguyen@fpt.edu.vn',           N'$2b$12$Leader1SecureHashStringValueHer', N'ACTIVE'),
(10, 3, N'huong.le@fpt.edu.vn',            N'$2b$12$Leader2SecureHashStringValueHer', N'ACTIVE'),
(11, 3, N'david.chen@hust.edu.vn',         N'$2b$12$Leader3SecureHashStringValueHer', N'ACTIVE'),
-- Participants (Team Members)
(12, 3, N'bao.tran@fpt.edu.vn',            N'$2b$12$Member1SecureHashStringValueHer', N'ACTIVE'),
(13, 3, N'chi.pham@fpt.edu.vn',            N'$2b$12$Member2SecureHashStringValueHer', N'ACTIVE'),
(14, 3, N'dung.vo@fpt.edu.vn',             N'$2b$12$Member3SecureHashStringValueHer', N'ACTIVE'),
(15, 3, N'emily.wang@rmit.edu.vn',         N'$2b$12$Member4SecureHashStringValueHer', N'ACTIVE'),
(16, 3, N'fong.li@hust.edu.vn',            N'$2b$12$Member5SecureHashStringValueHer', N'ACTIVE'),
-- Pending user (for account approval testing)
(17, 3, N'pending.user@gmail.com',          N'$2b$12$PendingSecureHashStringValueHer', N'PENDING');
SET IDENTITY_INSERT users OFF;
GO

-- ============================================================================
-- 5. USER PROFILES (Vietnamese names with diacritics)
-- ============================================================================
INSERT INTO user_profiles (user_id, first_name, last_name, phone_number, student_id, student_type, university_name) VALUES
(1,  N'Hoàng',   N'Nguyễn',  N'0912345678', NULL,        N'NONE',     N'SEAL Hackathon Board'),
(2,  N'Nhật',    N'Đào',     N'0987654321', NULL,        N'NONE',     N'FPT University'),
(3,  N'Lan',     N'Phạm',    N'0901111111', NULL,        N'NONE',     N'FPT University'),
(4,  N'Bình',    N'Trần',    N'0901234567', NULL,        N'NONE',     N'TechCorp Research'),
(5,  N'Linh',    N'Vũ',      N'0902345678', NULL,        N'NONE',     N'Innovate Labs'),
(6,  N'Guest',   N'Judge',   N'0903456789', NULL,        N'NONE',     N'External Organization'),
(7,  N'Minh',    N'Lê',      N'0934567890', NULL,        N'NONE',     N'VNG Corporation'),
(8,  N'Tuấn',    N'Ngô',     N'0945678901', N'SE140001', N'FPT',      N'FPT University HCM'),
(9,  N'An',      N'Nguyễn',  N'0956789012', N'SE150123', N'FPT',      N'FPT University Đà Nẵng'),
(10, N'Hương',   N'Lê',      N'0967890123', N'SE150456', N'FPT',      N'FPT University HCM'),
(11, N'David',   N'Chen',    N'0978901234', N'IT200789', N'EXTERNAL', N'HUST Hanoi'),
(12, N'Bảo',     N'Trần',    N'0989012345', N'SE150789', N'FPT',      N'FPT University Đà Nẵng'),
(13, N'Chi',     N'Phạm',    N'0990123456', N'SE151000', N'FPT',      N'FPT University HCM'),
(14, N'Dũng',    N'Võ',      N'0911234567', N'SE151111', N'FPT',      N'FPT University Đà Nẵng'),
(15, N'Emily',   N'Wang',    N'0922345678', N'IT300100', N'EXTERNAL', N'RMIT Vietnam'),
(16, N'Fong',    N'Li',      N'0933456789', N'IT200800', N'EXTERNAL', N'HUST Hanoi'),
(17, N'Pending', N'User',    N'0944567890', NULL,        N'NONE',     NULL);
GO

-- ============================================================================
-- 6. ACCOUNT APPROVALS
-- ============================================================================
INSERT INTO account_approvals (user_id, reviewed_by, status, note) VALUES
(9,  1, N'APPROVED', N'FPT student verified via student ID card.'),
(10, 1, N'APPROVED', N'FPT student verified.'),
(11, 1, N'APPROVED', N'External student from HUST. University confirmation letter received.'),
(15, 2, N'APPROVED', N'RMIT student. Verified via enrollment letter.'),
(17, NULL, N'PENDING', NULL);
GO

-- ============================================================================
-- 7. HACKATHON EVENTS
-- ============================================================================
SET IDENTITY_INSERT events ON;
INSERT INTO events (event_id, event_name, season, academic_year, start_date, end_date, status) VALUES
(1, N'SEAL Hackathon Summer 2026',  N'SUMMER', 2026, '2026-06-01', '2026-06-03', N'OPEN'),
(2, N'SEAL Hackathon Fall 2026',    N'FALL',   2026, '2026-10-15', '2026-10-17', N'DRAFT');
SET IDENTITY_INSERT events OFF;
GO

-- ============================================================================
-- 8. EVENT COORDINATORS
-- ============================================================================
INSERT INTO event_coordinators (event_id, user_id) VALUES
(1, 2),  -- Coordinator 1 manages Summer 2026
(1, 3),  -- Coordinator 2 also manages Summer 2026
(2, 2);  -- Coordinator 1 manages Fall 2026
GO

-- ============================================================================
-- 9. EVENT ACTIVITIES (Workshops, Webinars, etc.)
-- ============================================================================
INSERT INTO event_activities (event_id, organizer_id, title, description, activity_type, scheduled_start, scheduled_end, location_url) VALUES
(1, 2, N'Kickoff Webinar',          N'Introduction to hackathon rules, APIs, and judging criteria.',                  N'WEBINAR',       '2026-06-01 09:00:00', '2026-06-01 10:30:00', N'https://zoom.us/j/seal-kickoff-2026'),
(1, 7, N'AI Mentoring Session #1',  N'Hands-on guidance on integrating LLMs into your project.',                      N'MENTORING',     '2026-06-01 14:00:00', '2026-06-01 15:30:00', N'https://meet.google.com/seal-ai-mentor'),
(1, 3, N'Midpoint Check-in',        N'Mandatory progress report. Teams must show working prototype.',                  N'WORKSHOP',      '2026-06-02 10:00:00', '2026-06-02 12:00:00', N'FPT University - Room A301'),
(1, 2, N'Final Results Announcement', N'Awards ceremony and closing remarks.',                                          N'ANNOUNCEMENT',  '2026-06-03 16:00:00', '2026-06-03 17:00:00', N'https://zoom.us/j/seal-closing-2026');
GO

-- ============================================================================
-- 10. TRACKS
-- ============================================================================
SET IDENTITY_INSERT tracks ON;
INSERT INTO tracks (track_id, event_id, track_name, description, max_teams) VALUES
(1, 1, N'Generative AI Solutions',   N'Building production-grade applications powered by GenAI, LLMs, and multi-modal models.', 20),
(2, 1, N'FinTech Innovation',        N'Disrupting financial services with blockchain, payments, or banking solutions.',           15),
(3, 1, N'HealthTech for Good',       N'Technology solutions addressing healthcare challenges in Southeast Asia.',                 10);
SET IDENTITY_INSERT tracks OFF;
GO

-- ============================================================================
-- 11. TEAMS
-- ============================================================================
SET IDENTITY_INSERT teams ON;
INSERT INTO teams (team_id, track_id, leader_id, team_name, status) VALUES
(1, 1, 9,  N'Tech Wizards',     N'APPROVED'),
(2, 1, 10, N'AI Dreamers',      N'APPROVED'),
(3, 2, 11, N'FinCode Masters',  N'APPROVED'),
(4, 3, 12, N'HealthHack VN',    N'PENDING');
SET IDENTITY_INSERT teams OFF;
GO

-- ============================================================================
-- 12. TEAM MEMBERS
-- ============================================================================
-- Team 1: Tech Wizards (Track: GenAI)
INSERT INTO team_members (team_id, user_id, role_in_team) VALUES
(1, 9,  N'LEADER'),    -- An Nguyen (leader)
(1, 12, N'MEMBER'),    -- Bao Tran
(1, 13, N'MEMBER');    -- Chi Pham

-- Team 2: AI Dreamers (Track: GenAI)
INSERT INTO team_members (team_id, user_id, role_in_team) VALUES
(2, 10, N'LEADER'),    -- Huong Le (leader)
(2, 14, N'MEMBER');    -- Dung Vo

-- Team 3: FinCode Masters (Track: FinTech)
INSERT INTO team_members (team_id, user_id, role_in_team) VALUES
(3, 11, N'LEADER'),    -- David Chen (leader)
(3, 15, N'MEMBER'),    -- Emily Wang
(3, 16, N'MEMBER');    -- Fong Li

-- Team 4: HealthHack VN (Track: HealthTech) - Pending approval
INSERT INTO team_members (team_id, user_id, role_in_team) VALUES
(4, 12, N'LEADER');    -- Bao Tran (also in Team 1 as member - cross-track scenario)
GO

-- ============================================================================
-- 13. TEAM INVITATIONS
-- ============================================================================
INSERT INTO team_invitations (team_id, inviter_id, invitee_email, status, expires_at) VALUES
(1, 9,  N'newmember@fpt.edu.vn',     N'PENDING',  '2026-06-01 23:59:59'),
(2, 10, N'potential@fpt.edu.vn',      N'EXPIRED',  '2026-05-20 23:59:59'),
(3, 11, N'another@hust.edu.vn',       N'DECLINED', '2026-05-25 23:59:59');
GO

-- ============================================================================
-- 14. MENTOR ASSIGNMENTS
-- ============================================================================
INSERT INTO mentor_assignments (mentor_id, track_id, team_id) VALUES
(7, 1,    NULL),    -- Mentor Minh assigned to entire GenAI track
(8, NULL, 3);       -- Mentor Tuan assigned specifically to Team 3 (FinCode Masters)
GO

-- ============================================================================
-- 15. ROUNDS
-- ============================================================================
SET IDENTITY_INSERT rounds ON;
INSERT INTO rounds (round_id, event_id, round_name, round_order, submission_deadline, top_n_advance, status) VALUES
(1, 1, N'Round 1: Idea Pitch',       1, '2026-06-01 23:59:59', 10, N'CLOSED'),
(2, 1, N'Round 2: Prototype Demo',   2, '2026-06-02 20:00:00', 5,  N'ACTIVE'),
(3, 1, N'Round 3: Final Presentation', 3, '2026-06-03 14:00:00', NULL, N'UPCOMING');
SET IDENTITY_INSERT rounds OFF;
GO

-- ============================================================================
-- 16. JUDGE ASSIGNMENTS
-- ============================================================================
-- Round 1: All 3 judges
INSERT INTO judge_assignments (judge_id, round_id, judge_type) VALUES
(4, 1, N'INTERNAL'),   -- Judge Binh - Round 1
(5, 1, N'INTERNAL'),   -- Judge Linh - Round 1
(6, 1, N'GUEST');      -- Guest Judge - Round 1

-- Round 2: Internal judges only
INSERT INTO judge_assignments (judge_id, round_id, judge_type) VALUES
(4, 2, N'INTERNAL'),   -- Judge Binh - Round 2
(5, 2, N'INTERNAL');   -- Judge Linh - Round 2

-- Round 3: All judges for final
INSERT INTO judge_assignments (judge_id, round_id, judge_type) VALUES
(4, 3, N'INTERNAL'),
(5, 3, N'INTERNAL'),
(6, 3, N'GUEST');
GO

-- ============================================================================
-- 17. CRITERIA SETS & SCORING CRITERIA
-- ============================================================================
SET IDENTITY_INSERT criteria_sets ON;
INSERT INTO criteria_sets (set_id, event_id, set_name, description) VALUES
(1, 1, N'General Rubric v1', N'Standard grading rubric for SEAL Hackathon Summer 2026');
SET IDENTITY_INSERT criteria_sets OFF;
GO

SET IDENTITY_INSERT scoring_criteria ON;
INSERT INTO scoring_criteria (criteria_id, set_id, criteria_name, description, max_score, default_weight) VALUES
(1, 1, N'Innovation & Originality',    N'Uniqueness of the problem solved and the approach taken.',                10.00, 1.50),
(2, 1, N'Technical Feasibility',       N'Quality of implementation, code stability, and architecture.',            10.00, 1.00),
(3, 1, N'Business Impact',             N'Potential market viability and real-world impact of the solution.',        10.00, 1.00),
(4, 1, N'Presentation & Demo Quality', N'Clarity, professionalism, and effectiveness of the team''s pitch.',       10.00, 0.75),
(5, 1, N'UX/UI Design',                N'User experience design, accessibility, and visual polish.',               10.00, 0.75);
SET IDENTITY_INSERT scoring_criteria OFF;
GO

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
GO

-- ============================================================================
-- 19. SUBMISSIONS (Round 1 - all approved teams submitted)
-- ============================================================================
SET IDENTITY_INSERT submissions ON;
INSERT INTO submissions (submission_id, team_id, round_id, project_name, description) VALUES
(1, 1, 1, N'AI-StudyBuddy',   N'A personalized learning assistant that uses RAG and GPT-4 to help Vietnamese college students study more effectively.'),
(2, 2, 1, N'SmartRecruiter',  N'AI-powered resume screening and candidate matching platform for Vietnamese tech companies.'),
(3, 3, 1, N'PayShield',       N'Blockchain-based fraud detection system for Vietnamese mobile payment platforms.');
SET IDENTITY_INSERT submissions OFF;
GO

-- ============================================================================
-- 20. SUBMISSION ASSETS
-- ============================================================================
-- Team 1: AI-StudyBuddy
INSERT INTO submission_assets (submission_id, asset_type, asset_url) VALUES
(1, N'GITHUB_REPO',  N'https://github.com/tech-wizards/ai-studybuddy'),
(1, N'SLIDE_DECK',   N'https://docs.google.com/presentation/d/ai-studybuddy-pitch'),
(1, N'DEMO_VIDEO',   N'https://www.youtube.com/watch?v=ai-studybuddy-demo');

-- Team 2: SmartRecruiter
INSERT INTO submission_assets (submission_id, asset_type, asset_url) VALUES
(2, N'GITHUB_REPO',  N'https://github.com/ai-dreamers/smart-recruiter'),
(2, N'SLIDE_DECK',   N'https://docs.google.com/presentation/d/smart-recruiter-pitch');

-- Team 3: PayShield
INSERT INTO submission_assets (submission_id, asset_type, asset_url) VALUES
(3, N'GITHUB_REPO',  N'https://github.com/fincode-masters/payshield'),
(3, N'SLIDE_DECK',   N'https://canva.com/design/payshield-deck'),
(3, N'FIGMA_DESIGN', N'https://www.figma.com/file/payshield-ui-mockup');
GO

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
GO

-- ============================================================================
-- 22. ROUND RANKINGS (Round 1 - Pre-calculated)
-- ============================================================================
INSERT INTO round_rankings (team_id, round_id, total_score, position, is_advanced) VALUES
(1, 1, 41.50, 1, 1),   -- Tech Wizards: 1st place, advances
(3, 1, 39.75, 2, 1),   -- FinCode Masters: 2nd place, advances
(2, 1, 38.25, 3, 1);   -- AI Dreamers: 3rd place, advances
GO

-- ============================================================================
-- 23. PRIZES
-- ============================================================================
INSERT INTO prizes (event_id, prize_name, description, rank_position, cash_value) VALUES
(1, N'Grand Champion',           N'Overall first place winner of SEAL Hackathon Summer 2026.',   1, 50000000.00),
(1, N'First Runner-Up',          N'Second place winner.',                                        2, 30000000.00),
(1, N'Second Runner-Up',         N'Third place winner.',                                         3, 15000000.00),
(1, N'Best Innovation Award',    N'Highest innovation score across all rounds.',                  4, 10000000.00),
(1, N'Best Technical Implementation', N'Best code quality and architecture.',                     5, 10000000.00);
GO

-- ============================================================================
-- 24. NOTIFICATIONS
-- ============================================================================
INSERT INTO notifications (user_id, title, message, is_read) VALUES
(9,  N'Team Approved',              N'Your team "Tech Wizards" has been approved for SEAL Hackathon Summer 2026. Good luck!',              1),
(9,  N'Round 1 Submission Received', N'Your submission "AI-StudyBuddy" for Round 1 has been received successfully.',                         1),
(9,  N'Round 1 Results Published',   N'Congratulations! Your team ranked #1 in Round 1 and advances to Round 2.',                          0),
(10, N'Round 1 Results Published',   N'Your team "AI Dreamers" ranked #3 in Round 1 and advances to Round 2.',                             0),
(11, N'Round 1 Results Published',   N'Your team "FinCode Masters" ranked #2 in Round 1 and advances to Round 2.',                         0),
(12, N'Team Registration Pending',   N'Your team "HealthHack VN" registration is pending organizer approval.',                              0),
(17, N'Account Under Review',        N'Your account registration is being reviewed by our team. You will be notified once approved.',       0);
GO

-- ============================================================================
-- 25. AUDIT LOGS
-- ============================================================================
INSERT INTO audit_logs (performed_by, action_type, entity_type, entity_id, details, ip_address) VALUES
(1, N'INSERT', N'Event',       1, N'{"event_name":"SEAL Hackathon Summer 2026","status":"DRAFT"}',                           N'192.168.1.100'),
(1, N'UPDATE', N'Event',       1, N'{"field":"status","old":"DRAFT","new":"OPEN"}',                                          N'192.168.1.100'),
(1, N'UPDATE', N'User',        9, N'{"field":"status","old":"PENDING","new":"ACTIVE","reason":"Student ID verified"}',        N'192.168.1.100'),
(2, N'INSERT', N'Track',       1, N'{"track_name":"Generative AI Solutions","event_id":1}',                                  N'10.0.0.50'),
(9, N'INSERT', N'Team',        1, N'{"team_name":"Tech Wizards","track_id":1}',                                              N'172.16.0.22'),
(1, N'UPDATE', N'Team',        1, N'{"field":"status","old":"PENDING","new":"APPROVED"}',                                    N'192.168.1.100'),
(9, N'INSERT', N'Submission',  1, N'{"project_name":"AI-StudyBuddy","round_id":1}',                                          N'172.16.0.22'),
(4, N'INSERT', N'Score',       NULL, N'{"submission_id":1,"judge_id":4,"criteria_count":4,"action":"finalized_all_scores"}',  N'10.0.1.15'),
(1, N'INSERT', N'Ranking',     NULL, N'{"round_id":1,"teams_ranked":3,"action":"rankings_calculated"}',                      N'192.168.1.100');
GO

PRINT '=== Seed data inserted successfully! ===';
PRINT '=== Total: 17 users, 2 events, 3 tracks, 4 teams, 3 rounds, 36 scores ===';
GO

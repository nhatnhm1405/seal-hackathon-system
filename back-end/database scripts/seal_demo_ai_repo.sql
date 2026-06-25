-- =====================================================
-- AI JUDGE ASSISTANT — REPOSITORY ANALYSIS DEMO (overlay)
-- =====================================================
-- WHAT THIS DOES
--   Points a few Spring-2026 (event 1) submissions at REAL public GitHub repos so
--   the AI Judge Assistant's "REPOSITORY ANALYSIS" block has real data to show
--   (tech stack, signals, red flags). The base seed uses placeholder repo URLs
--   (github.com/team-*/seal) that 404, which makes the block report "not analyzed".
--
--   It sets up a TWO-SIDED demo, both in the WEB track of round 1, so ONE judge
--   login sees both cases:
--     • sub 1 (MATCH)    — description + repo agree → AI stays on-topic and praises.
--     • sub 2 (MISMATCH) — description says a Node.js online-learning platform but the
--                          repo is Flask (a Python web framework) → AI flags the
--                          mismatch under "POINTS TO PROBE" (wrong domain + wrong tech).
--     • sub 4 (BONUS)    — AI track, FastAPI template; extra example if you want one.
--
-- WHEN TO RUN
--   Run this BEFORE each demo. Safe to re-run (idempotent: UPDATE by submission_id).
--   Prerequisites: seal_schema.sql -> seal_seed.sql -> seal_seed_ai_demo.sql first.
--   This file is self-contained for subs 1, 2, 4 (it sets their descriptions too),
--   so the repo demo works even if you only glance at those submissions.
--
--   mysql -u root -p seal_hackathon < seal_demo_ai_repo.sql
--
-- BACKEND CONFIG NEEDED (back-end/src/seal-api/.env)
--   GEMINI_API_KEY=...            (required — enables the AI feature)
--   GEMINI_MODEL=gemini-3.1-flash-lite   (recommended — has free-tier quota; 2.x models
--                                         may be 429 limit:0 or 503 overloaded)
--   GITHUB_TOKEN=...              (optional — raises GitHub rate limit 60->5000/hour and
--                                  allows private repos; blank still works for public repos)
--   Restart the backend after editing .env.
--
-- DEMO SCRIPT
--   1. Login as a Web-track judge:  judge.binh@fpt.edu.vn  /  Test@1234
--   2. Go to scoring -> round 1 (Preliminary) -> Web track.
--   3. Open sub 1 (Team Phoenix), click "AI ASSIST":
--        -> REPOSITORY ANALYSIS shows Java/Spring tech stack, tests/CI signals,
--           on-topic notes (repo matches the clinic-management description).
--   4. Open sub 2 (Team Dragon), click "AI ASSIST":
--        -> AI flags that the repo (Flask, Python) does NOT match the described
--           Node.js online-learning platform — a "points to probe" warning.
--   Emphasize: the AI is ADVISORY — it warns/suggests ranges, it never sets a score.
-- =====================================================

USE seal_hackathon;

-- ── sub 1 · MATCH (Web track, round 1) ─────────────────────────────
-- Description rewritten to match spring-petclinic's real domain (a Spring Boot
-- pet-clinic management app), so the AI sees repo and pitch agree.
UPDATE Submission SET description =
'PetClinic Manager là hệ thống web quản lý phòng khám thú y. Chức năng gồm quản lý hồ sơ chủ nuôi và thú cưng, đặt và theo dõi lịch hẹn khám, quản lý thông tin bác sĩ thú y theo chuyên khoa, và ghi nhận lịch sử khám chữa của từng thú cưng. Backend Spring Boot (Java) với cơ sở dữ liệu quan hệ, giao diện web theo mô hình MVC. Bản nộp vòng sơ khảo đã chạy được CRUD chủ nuôi/thú cưng và luồng đặt lịch khám; phần thống kê báo cáo còn đang phát triển.'
WHERE submission_id = 1;
UPDATE Submission SET repo_url = 'https://github.com/spring-projects/spring-petclinic'
WHERE submission_id = 1;

-- ── sub 2 · MISMATCH (Web track, round 1) ──────────────────────────
-- Description says a Node.js online-learning platform; repo is Flask (Python).
UPDATE Submission SET description =
'EduDragon là nền tảng học tập trực tuyến cho phép giảng viên tạo khoá học, tải video bài giảng và ra quiz tự chấm. Sinh viên theo dõi tiến độ học và nhận gợi ý bài tiếp theo. Stack Node.js + PostgreSQL + React, đã có xác thực JWT và phân quyền giảng viên/sinh viên. Vòng sơ khảo demo được tạo khoá học và làm quiz; tính năng thanh toán khoá học trả phí chưa hoàn thiện.'
WHERE submission_id = 2;
UPDATE Submission SET repo_url = 'https://github.com/pallets/flask'
WHERE submission_id = 2;

-- ── sub 4 · BONUS (AI track, round 1) ──────────────────────────────
-- AutoGrade pitched as Python FastAPI -> FastAPI full-stack template.
UPDATE Submission SET description =
'AutoGrade dùng AI để chấm điểm bài tập lập trình và bài luận ngắn tự động. Hệ thống chạy test case cho bài code và dùng mô hình NLP đánh giá bài luận theo rubric, sinh nhận xét gợi ý cho sinh viên. Backend Python FastAPI + mô hình fine-tune, dashboard cho giảng viên xem phân bố điểm. Vòng sơ khảo demo chấm code khá tốt; phần NLP chấm luận đôi khi lệch với giảng viên và chưa có báo cáo tổng hợp.'
WHERE submission_id = 4;
UPDATE Submission SET repo_url = 'https://github.com/fastapi/full-stack-fastapi-template'
WHERE submission_id = 4;

-- ── Verify ─────────────────────────────────────────────────────────
SELECT submission_id, repo_url, LEFT(description, 45) AS mota_dau
FROM Submission
WHERE submission_id IN (1, 2, 4)
ORDER BY submission_id;

-- Done. Subs 1/2/4 now point at real public repos for the repo-analysis demo.

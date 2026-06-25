-- =====================================================
-- AI DEMO BACKFILL — Submission descriptions (event 1: Spring 2026)
-- =====================================================
-- Purpose: the base seed (seal_seed.sql) creates Spring submissions 1–12 with
-- only URLs and NO description. The AI Judge Assistant reads a submission's
-- description (+ links) to produce its advisory notes, so it needs real text.
--
-- This script backfills rich Vietnamese descriptions onto those 12 submissions.
-- Spring is already fully wired (tracks + criteria + judge assignments), so a
-- judge can open any of these and click "AI ASSIST" immediately.
--
-- Safe to re-run (idempotent UPDATE by submission_id). Does NOT touch the Summer
-- event, so the draw-tracks demo stays intact.
--
-- Run AFTER seal_seed.sql:  mysql -u root -p seal_hackathon < seal_seed_ai_demo.sql
-- =====================================================

-- ── Preliminary (round 1) ──────────────────────────────────────────

-- sub 1 · Team Phoenix · Web app quản lý ký túc xá thông minh
UPDATE Submission SET description =
'SmartDorm là web app quản lý ký túc xá thông minh cho sinh viên FPT. Hệ thống số hoá quy trình đăng ký phòng, báo hỏng cơ sở vật chất, thanh toán phí và điểm danh ra/vào bằng QR. Backend Spring Boot + MySQL, frontend React, có phân quyền cho quản lý KTX và sinh viên. Bản nộp vòng sơ khảo đã chạy được luồng đăng ký phòng và báo hỏng; thanh toán mới ở mức mô phỏng.'
WHERE submission_id = 1;

-- sub 2 · Team Dragon · Nền tảng học tập trực tuyến
UPDATE Submission SET description =
'EduDragon là nền tảng học tập trực tuyến cho phép giảng viên tạo khoá học, tải video bài giảng và ra quiz tự chấm. Sinh viên theo dõi tiến độ học và nhận gợi ý bài tiếp theo. Stack Node.js + PostgreSQL + React, đã có xác thực JWT và phân quyền giảng viên/sinh viên. Vòng sơ khảo demo được tạo khoá học và làm quiz; tính năng thanh toán khoá học trả phí chưa hoàn thiện.'
WHERE submission_id = 2;

-- sub 3 · Team Tiger · App theo dõi sức khoẻ sinh viên (mobile)
UPDATE Submission SET description =
'HealthTiger là ứng dụng di động theo dõi sức khoẻ sinh viên: ghi nhận số bước chân, giấc ngủ, nhịp tim và nhắc nhở uống nước. App native (Kotlin/Swift) kết nối cảm biến điện thoại, hiển thị biểu đồ tuần/tháng và đặt mục tiêu cá nhân. Vòng sơ khảo chạy mượt phần thu thập dữ liệu và biểu đồ; chưa có đồng bộ dữ liệu lên cloud nên đổi máy sẽ mất lịch sử.'
WHERE submission_id = 3;

-- sub 4 · Team Eagle · AI chấm điểm bài tập tự động
UPDATE Submission SET description =
'AutoGrade dùng AI để chấm điểm bài tập lập trình và bài luận ngắn tự động. Hệ thống chạy test case cho bài code và dùng mô hình NLP đánh giá bài luận theo rubric, sinh nhận xét gợi ý cho sinh viên. Backend Python FastAPI + mô hình fine-tune, dashboard cho giảng viên xem phân bố điểm. Vòng sơ khảo demo chấm code khá tốt; phần NLP chấm luận đôi khi lệch với giảng viên và chưa có báo cáo tổng hợp.'
WHERE submission_id = 4;

-- sub 5 · Team Falcon · Web marketplace trao đổi sách cũ
UPDATE Submission SET description =
'BookFalcon là sàn trao đổi và mua bán sách cũ giữa sinh viên trong trường. Người dùng đăng sách, tìm theo môn học, nhắn tin thoả thuận và đánh giá người bán. Web full-stack React + Express + MongoDB, có tìm kiếm và lọc theo danh mục. Vòng sơ khảo mới hoàn thiện đăng tin và tìm kiếm; phần chat và đánh giá còn dở dang, UI cần trau chuốt thêm.'
WHERE submission_id = 5;

-- ── Semi-final (round 2) — refined v2 builds ───────────────────────

-- sub 6 · Team Phoenix (semi)
UPDATE Submission SET description =
'SmartDorm bản vòng bán kết: bổ sung thanh toán phí KTX qua cổng giả lập, dashboard thống kê tỉ lệ lấp đầy phòng cho ban quản lý, và thông báo realtime khi yêu cầu báo hỏng được xử lý. Đã viết unit test cho module phòng và tích hợp CI. Trải nghiệm người dùng được làm lại gọn gàng hơn so với vòng sơ khảo.'
WHERE submission_id = 6;

-- sub 7 · Team Dragon (semi)
UPDATE Submission SET description =
'EduDragon bản vòng bán kết: thêm lộ trình học cá nhân hoá gợi ý bài tiếp theo dựa trên kết quả quiz, diễn đàn hỏi đáp theo khoá học và xuất chứng chỉ hoàn thành. Tối ưu truy vấn báo cáo tiến độ và bổ sung phân trang. Pitch deck trình bày rõ mô hình doanh thu freemium.'
WHERE submission_id = 7;

-- sub 8 · Team Tiger (semi)
UPDATE Submission SET description =
'HealthTiger bản vòng bán kết: đã thêm đồng bộ dữ liệu lên cloud (Firebase), đăng nhập đa thiết bị và tính năng thử thách nhóm để bạn bè cùng vận động. Cải thiện hiệu năng vẽ biểu đồ và giảm hao pin khi chạy nền. Giao diện mobile được đánh giá tự nhiên, mượt.'
WHERE submission_id = 8;

-- sub 9 · Team Eagle (semi)
UPDATE Submission SET description =
'AutoGrade bản vòng bán kết: bổ sung dashboard phân tích cho giảng viên (phân bố điểm, câu sai nhiều nhất), cho phép giảng viên ghi đè điểm AI và lưu lại lịch sử chỉnh sửa. Mô hình NLP được hiệu chỉnh lại rubric nên bám sát giảng viên hơn. Vẫn cần thêm dữ liệu huấn luyện cho môn tự luận dài.'
WHERE submission_id = 9;

-- ── Final (round 3) ────────────────────────────────────────────────

-- sub 10 · Team Phoenix (final)
UPDATE Submission SET description =
'SmartDorm bản chung kết: sản phẩm gần như hoàn chỉnh — quản lý phòng, báo hỏng, thanh toán, điểm danh QR và báo cáo cho ban quản lý đều hoạt động ổn định. Đã triển khai thử nghiệm cho một toà KTX với dữ liệu thật, có tài liệu hướng dẫn và phân tích khả năng nhân rộng ra nhiều cơ sở.'
WHERE submission_id = 10;

-- sub 11 · Team Tiger (final)
UPDATE Submission SET description =
'HealthTiger bản chung kết: hoàn thiện đồng bộ cloud, thử thách nhóm và tích hợp nhắc nhở sức khoẻ thông minh theo thói quen người dùng. Có khảo sát người dùng thật cho thấy mức độ giữ chân tốt. Định hướng mở rộng sang hợp tác với phòng y tế trường để theo dõi sức khoẻ tổng thể.'
WHERE submission_id = 11;

-- sub 12 · Team Eagle (final)
UPDATE Submission SET description =
'AutoGrade bản chung kết: nền tảng chấm tự động cho cả code và tự luận, kèm dashboard phân tích và cơ chế giám sát của giảng viên để đảm bảo công bằng. Đã đo độ đồng thuận giữa AI và giảng viên trên tập bài thật và trình bày hướng cải thiện. Tiềm năng áp dụng cho các môn lập trình quy mô lớn.'
WHERE submission_id = 12;

-- Done. 12 Spring submissions now carry descriptions for the AI Judge Assistant.
--
-- NOTE: to demo the REPOSITORY ANALYSIS block (AI reading a real GitHub repo),
-- run seal_demo_ai_repo.sql AFTER this file — it points a few submissions at real
-- public repos. See that file's header for the demo script.

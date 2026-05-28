USE seal_hackathon;

-- =====================================================
-- USEFUL SELECT QUERIES
-- =====================================================

-- -------------------------------------------------------
-- 1. Danh sách tất cả user kèm role trong event
-- -------------------------------------------------------
SELECT
  u.user_id,
  u.full_name,
  u.email,
  u.user_type,
  r.role_name,
  e.name        AS event_name,
  t.name        AS track_name,
  ro.name       AS round_name,
  uer.judge_type
FROM UserEventRole uer
JOIN User           u  ON uer.user_id  = u.user_id
JOIN Role           r  ON uer.role_id  = r.role_id
LEFT JOIN HackathonEvent e  ON uer.event_id = e.event_id
LEFT JOIN Track     t  ON uer.track_id = t.track_id
LEFT JOIN Round     ro ON uer.round_id = ro.round_id
ORDER BY u.full_name, r.role_name;

-- -------------------------------------------------------
-- 2. Danh sách team kèm số thành viên và tên leader
-- -------------------------------------------------------
SELECT
  t.team_id,
  t.name        AS team_name,
  tk.name       AS track_name,
  t.status,
  leader.full_name  AS leader_name,
  COUNT(tm.id)      AS total_members
FROM Team t
JOIN Track      tk     ON t.track_id  = tk.track_id
JOIN TeamMember tm     ON t.team_id   = tm.team_id
JOIN TeamMember lm     ON t.team_id   = lm.team_id AND lm.member_role = 'LEADER'
JOIN User       leader ON lm.user_id  = leader.user_id
GROUP BY t.team_id, t.name, tk.name, t.status, leader.full_name
ORDER BY tk.name, t.name;

-- -------------------------------------------------------
-- 3. Bảng điểm chi tiết: từng judge × từng tiêu chí × từng bài nộp
-- -------------------------------------------------------
SELECT
  e.name        AS event_name,
  ro.name       AS round_name,
  tk.name       AS track_name,
  t.name        AS team_name,
  u.full_name   AS judge_name,
  uer.judge_type,
  sc.name       AS criteria_name,
  sc.weight,
  s.value       AS raw_score,
  ROUND(s.value * sc.weight, 2) AS weighted_score,
  s.comment,
  s.is_draft
FROM Score s
JOIN Submission       sub ON s.submission_id  = sub.submission_id
JOIN Team             t   ON sub.team_id      = t.team_id
JOIN Track            tk  ON t.track_id       = tk.track_id
JOIN Round            ro  ON sub.round_id     = ro.round_id
JOIN HackathonEvent   e   ON ro.event_id      = e.event_id
JOIN User             u   ON s.judge_user_id  = u.user_id
JOIN ScoringCriteria  sc  ON s.criteria_id    = sc.criteria_id
LEFT JOIN UserEventRole uer ON uer.user_id = s.judge_user_id
                           AND uer.event_id = e.event_id
                           AND uer.round_id = ro.round_id
WHERE s.is_draft = FALSE
ORDER BY ro.order_number, tk.name, t.name, u.full_name, sc.order_number;

-- -------------------------------------------------------
-- 4. Tổng điểm mỗi team (tính có trọng số) theo round
-- -------------------------------------------------------
SELECT
  ro.name               AS round_name,
  tk.name               AS track_name,
  t.name                AS team_name,
  COUNT(DISTINCT s.judge_user_id)             AS judge_count,
  ROUND(
    SUM(s.value * sc.weight) /
    COUNT(DISTINCT s.judge_user_id), 2
  )                     AS avg_weighted_score
FROM Score s
JOIN Submission      sub ON s.submission_id = sub.submission_id
JOIN Team            t   ON sub.team_id     = t.team_id
JOIN Track           tk  ON t.track_id      = tk.track_id
JOIN Round           ro  ON sub.round_id    = ro.round_id
JOIN ScoringCriteria sc  ON s.criteria_id   = sc.criteria_id
WHERE s.is_draft = FALSE
GROUP BY ro.round_id, ro.name, tk.track_id, tk.name, t.team_id, t.name
ORDER BY ro.order_number, tk.name, avg_weighted_score DESC;

-- -------------------------------------------------------
-- 5. Bảng xếp hạng đã finalize kèm trạng thái thăng vòng
-- -------------------------------------------------------
SELECT
  ro.name           AS round_name,
  tk.name           AS track_name,
  t.name            AS team_name,
  rr.total_score,
  rr.rank_position,
  IF(rr.advanced, 'Lên vòng tiếp', 'Dừng lại') AS advancement,
  IF(rr.is_published, 'Đã công bố', 'Chưa công bố') AS publish_status
FROM RoundResult rr
JOIN Team   t  ON rr.team_id  = t.team_id
JOIN Track  tk ON t.track_id  = tk.track_id
JOIN Round  ro ON rr.round_id = ro.round_id
ORDER BY ro.order_number, tk.name, rr.rank_position;

-- -------------------------------------------------------
-- 6. Phân tích độ lệch điểm giữa các judge (RBL)
-- -------------------------------------------------------
SELECT
  tk.name           AS track_name,
  t.name            AS team_name,
  sc.name           AS criteria_name,
  COUNT(s.score_id)           AS judge_count,
  ROUND(AVG(s.value), 2)      AS avg_score,
  ROUND(MAX(s.value), 2)      AS max_score,
  ROUND(MIN(s.value), 2)      AS min_score,
  ROUND(MAX(s.value) - MIN(s.value), 2) AS score_range,
  ROUND(STDDEV(s.value), 2)   AS std_deviation
FROM Score s
JOIN Submission      sub ON s.submission_id = sub.submission_id
JOIN Team            t   ON sub.team_id     = t.team_id
JOIN Track           tk  ON t.track_id      = tk.track_id
JOIN ScoringCriteria sc  ON s.criteria_id   = sc.criteria_id
WHERE s.is_draft = FALSE
GROUP BY tk.track_id, t.team_id, sc.criteria_id
HAVING judge_count > 1
ORDER BY std_deviation DESC;

-- -------------------------------------------------------
-- 7. Kiểm tra team nào chưa nộp bài ở 1 round cụ thể
-- -------------------------------------------------------
SELECT
  t.team_id,
  t.name    AS team_name,
  tk.name   AS track_name,
  t.status  AS team_status
FROM Team t
JOIN Track tk ON t.track_id = tk.track_id
WHERE t.event_id = 1
  AND t.status = 'APPROVED'
  AND t.team_id NOT IN (
    SELECT sub.team_id
    FROM Submission sub
    WHERE sub.round_id = 1
  )
ORDER BY tk.name, t.name;

-- -------------------------------------------------------
-- 8. Lịch sử audit log kèm tên actor
-- -------------------------------------------------------
SELECT
  al.created_at,
  u.full_name       AS actor,
  al.action,
  al.target_type,
  al.target_id,
  al.reason,
  al.metadata_json
FROM AuditLog al
JOIN User u ON al.actor_user_id = u.user_id
ORDER BY al.created_at DESC;

-- -------------------------------------------------------
-- 9. Notification chưa đọc của 1 user
-- -------------------------------------------------------
SELECT
  n.notification_id,
  n.title,
  n.type,
  e.name    AS event_name,
  n.created_at
FROM Notification n
LEFT JOIN HackathonEvent e ON n.related_event_id = e.event_id
WHERE n.recipient_user_id = 5
  AND n.is_read = FALSE
ORDER BY n.created_at DESC;

-- -------------------------------------------------------
-- 10. Tổng hợp thống kê event
-- -------------------------------------------------------
SELECT
  e.name            AS event_name,
  e.status,
  COUNT(DISTINCT tk.track_id)   AS total_tracks,
  COUNT(DISTINCT ro.round_id)   AS total_rounds,
  COUNT(DISTINCT t.team_id)     AS total_teams,
  COUNT(DISTINCT tm.user_id)    AS total_participants,
  COUNT(DISTINCT sub.submission_id) AS total_submissions
FROM HackathonEvent e
LEFT JOIN Track      tk  ON e.event_id = tk.event_id
LEFT JOIN Round      ro  ON e.event_id = ro.event_id
LEFT JOIN Team       t   ON e.event_id = t.event_id  AND t.status = 'APPROVED'
LEFT JOIN TeamMember tm  ON t.team_id  = tm.team_id
LEFT JOIN Submission sub ON t.team_id  = sub.team_id
WHERE e.event_id = 1
GROUP BY e.event_id, e.name, e.status;

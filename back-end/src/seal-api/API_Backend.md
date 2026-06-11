# 📋 API Backend — Implementation List

> **Convention chung:** Tất cả response wrap trong `{ data: ..., message: "...", status: 200 }`.
> Auth module (đã done) dùng làm baseline.

---

## PHASE 1 — CRUD cơ bản + Dashboard data

---

### 1. EVENTS

| Method | Endpoint | Dùng ở | Body / Params |
|--------|----------|--------|---------------|
| `GET` | `/api/events` | CoordEventsPage, ParticipantDashboard | `?status=OPEN` (optional) |
| `GET` | `/api/events/{eventId}` | Detail views | — |
| `POST` | `/api/events` | CoordEventsPage → addEvent | `{ event_name, season, start_date, end_date }` |
| `PATCH` | `/api/events/{eventId}/status` | CoordEventsPage → toggleEventStatus | `{ status: "OPEN" \| "CLOSED" \| "DRAFT" }` |

> ⚡ **Dashboard cần gấp:** `GET /api/events` trả `status=OPEN` để CoordinatorDashboard hiện `activeEvents` count và ParticipantDashboard hiện danh sách event để join.

---

### 2. TRACKS

| Method | Endpoint | Dùng ở | Body |
|--------|----------|--------|------|
| `GET` | `/api/events/{eventId}/tracks` | CoordEventsPage, ParticipantDashboard, JudgePage | — |
| `POST` | `/api/events/{eventId}/tracks` | CoordEventsPage → addTrack | `{ name, description, max_teams }` |
| `GET` | `/api/tracks/{trackId}` | TeamViewPage, MentorTracksPage | — |

---

### 3. ROUNDS

| Method | Endpoint | Dùng ở | Body |
|--------|----------|--------|------|
| `GET` | `/api/events/{eventId}/rounds` | CoordEventsPage, ParticipantDashboard, JudgeDashboard | — |
| `POST` | `/api/events/{eventId}/rounds` | CoordEventsPage → addRound | `{ name, order_number, submission_deadline, top_n_advance }` |
| `PATCH` | `/api/rounds/{roundId}/status` | CoordEventsPage → changeRoundStatus | `{ status: "UPCOMING" \| "ACTIVE" \| "CLOSED" }` |

> ⚡ **Dashboard cần gấp:** `GET /api/events/{eventId}/rounds` để CoordinatorDashboard hiện round progress (closed/total) và Participant hiện deadline + round status.

---

### 4. SCORING CRITERIA

| Method | Endpoint | Dùng ở | Body |
|--------|----------|--------|------|
| `GET` | `/api/events/{eventId}/criteria` | CoordEventsPage, JudgeScoringPage | — |
| `GET` | `/api/rounds/{roundId}/criteria` | JudgeScoringPage (criteria per round) | — |
| `POST` | `/api/criteria` | CoordEventsPage → createCriteria | `{ name, description, max_score, weight, event_id? }` |
| `POST` | `/api/rounds/{roundId}/criteria` | CoordEventsPage → assign criteria to round | `{ criteria_id }` |

---

### 5. TEAMS

| Method | Endpoint | Dùng ở | Body / Params |
|--------|----------|--------|---------------|
| `GET` | `/api/teams` | CoordTeamsPage | `?eventId=&trackId=&status=` |
| `GET` | `/api/teams/my` | ParticipantDashboard, TeamManagePage | — (lấy team của current user) |
| `GET` | `/api/teams/{teamId}` | TeamViewPage, CoordTeamsPage (expanded) | — |
| `POST` | `/api/teams` | CreateTeamScreen | `{ name, eventId, trackId }` |
| `PUT` | `/api/teams/{teamId}/approve` | CoordTeamsPage | — |
| `PUT` | `/api/teams/{teamId}/reject` | CoordTeamsPage | — |
| `PUT` | `/api/teams/{teamId}/disqualify` | CoordTeamsPage | `{ reason }` |

> ⚡ **Dashboard cần gấp:**
> - `GET /api/teams` → CoordinatorDashboard: `approvedTeams` count + `pendingTeams` list
> - `GET /api/teams/my` → ParticipantDashboard: status, track/event

---

### 6. TEAM MEMBERS

| Method | Endpoint | Dùng ở | Body |
|--------|----------|--------|------|
| `GET` | `/api/teams/{teamId}/members` | TeamManagePage (expanded), MentorTracksPage | — |
| `DELETE` | `/api/teams/{teamId}/members/{userId}` | TeamManagePage → removeMember | — |
| `POST` | `/api/teams/{teamId}/invitations` | TeamManagePage → sendInvite | `{ email }` hoặc `{ student_id }` |

---

### 7. SUBMISSIONS

| Method | Endpoint | Dùng ở | Body |
|--------|----------|--------|------|
| `GET` | `/api/teams/{teamId}/submissions` | TeamSubmitPage (history tab), ParticipantDashboard | — |
| `GET` | `/api/rounds/{roundId}/submissions` | JudgeScoringPage, CoordScoringPage | — |
| `POST` | `/api/submissions` | TeamSubmitPage → SUBMIT FINAL | `{ team_id, round_id, repo_url, demo_url, slide_url }` |
| `PUT` | `/api/submissions/{submissionId}` | TeamSubmitPage → UPDATE | `{ repo_url, demo_url, slide_url, status: "DRAFT"\|"SUBMITTED" }` |

> ⚡ **Dashboard cần gấp:**
> - `GET /api/teams/{teamId}/submissions` → ParticipantDashboard: hiện "Round 2 Submission" stat card
> - `GET /api/rounds/{roundId}/submissions` → CoordScoringPage: submissions count

---

### 8. JUDGE ASSIGNMENTS

| Method | Endpoint | Dùng ở | Body |
|--------|----------|--------|------|
| `GET` | `/api/rounds/{roundId}/judge-assignments` | CoordJudgesPage | — |
| `GET` | `/api/judge/assignments` | JudgeDashboard → myAssignments | — (current judge's assignments) |
| `POST` | `/api/judge-assignments` | CoordJudgesPage → assign | `{ judge_id, round_id, judge_type: "INTERNAL"\|"GUEST" }` |
| `DELETE` | `/api/judge-assignments/{assignmentId}` | CoordJudgesPage → remove | — |

> ⚡ **Dashboard cần gấp:** `GET /api/judge/assignments` → JudgeDashboard hiện số submissions cần score theo round.

---

### 9. MENTOR ASSIGNMENTS

| Method | Endpoint | Dùng ở | Body |
|--------|----------|--------|------|
| `GET` | `/api/mentor/assignments` | MentorDashboard, MentorTracksPage | — (current mentor's tracks) |
| `GET` | `/api/tracks/{trackId}/teams` | MentorTracksPage | — |
| `POST` | `/api/mentor-assignments` | CoordMentorsPage → assign | `{ mentor_id, track_id }` |
| `DELETE` | `/api/mentor-assignments/{assignmentId}` | CoordMentorsPage → remove | — |

> ⚡ **Dashboard cần gấp:** `GET /api/mentor/assignments` → MentorDashboard hiện tracks, myTeams count.

---

## PHASE 2 — Scoring & Results (complex operations)

---

### 10. SCORES

| Method | Endpoint | Dùng ở | Body |
|--------|----------|--------|------|
| `GET` | `/api/submissions/{submissionId}/scores` | JudgeScoringPage (load existing scores) | `?judgeId=` (optional) |
| `POST` | `/api/submissions/{submissionId}/scores` | JudgeScoringPage → SAVE DRAFT | `[ { criteria_id, value, comment } ]` |
| `POST` | `/api/submissions/{submissionId}/scores/finalize` | JudgeScoringPage → SUBMIT | `[ { criteria_id, value, comment } ]` |

> 📝 **Lưu ý:** Frontend tính weighted score ở client side dựa vào `criteria.weight`. Backend chỉ cần lưu raw scores + `is_draft` flag.

---

### 11. RANKINGS / RESULTS

| Method | Endpoint | Dùng ở | Body |
|--------|----------|--------|------|
| `GET` | `/api/rounds/{roundId}/rankings` | LeaderboardPage, ParticipantDashboard (round1Rank) | — |
| `POST` | `/api/rounds/{roundId}/rankings/calculate` | CoordScoringPage → CALCULATE | — (server tính từ scores) |
| `POST` | `/api/rounds/{roundId}/rankings/advance` | CoordScoringPage → ADVANCE TOP N | `{ top_n }` (optional, fallback về `Round.top_n_advance`) |
| `POST` | `/api/rounds/{roundId}/rankings/publish` | CoordScoringPage → PUBLISH RESULTS | — |

---

### 12. LEADERBOARD

| Method | Endpoint | Dùng ở | Params |
|--------|----------|--------|--------|
| `GET` | `/api/leaderboard` | LeaderboardPage | `?eventId=&trackId=&category=overall\|innovation\|technical` |

> 📝 **Response cần:**
> ```json
> {
>   "rank": 1,
>   "team_id": "...",
>   "team_name": "...",
>   "total_score": 95.5,
>   "score_delta": +2.3,
>   "member_count": 4,
>   "criteria_scores": {
>     "innovation": 90,
>     "technical": 88,
>     "design": 95,
>     "impact": 92
>   },
>   "status": "ADVANCED"
> }
> ```

---

### 13. PRIZES

| Method | Endpoint | Dùng ở | Body |
|--------|----------|--------|------|
| `GET` | `/api/events/{eventId}/prizes` | CoordPrizesPage, LeaderboardPage | — |
| `POST` | `/api/events/{eventId}/prizes` | CoordPrizesPage → createPrize | `{ name, description, rank_position, track_id? }` |
| `PUT` | `/api/prizes/{prizeId}` | CoordPrizesPage → assign to team | `{ team_id, awarded_at }` |

---

### 14. AUDIT LOG

| Method | Endpoint | Dùng ở | Params |
|--------|----------|--------|--------|
| `GET` | `/api/audit-logs` | CoordAuditPage, ParticipantDashboard (activity feed) | `?from=&to=&action_type=&entity_type=&page=&size=` |

> 📝 ParticipantDashboard dùng 3 log gần nhất → `sort=created_at,desc`

---

## 🗓️ Tóm tắt theo thứ tự ưu tiên implement

### Sprint 1 — Dashboard unblock
- [ ] `GET /api/events`
- [ ] `GET /api/events/{id}/rounds`
- [ ] `GET /api/teams` + `/api/teams/my`
- [ ] `GET /api/judge/assignments`
- [ ] `GET /api/mentor/assignments`
- [ ] `GET /api/account-approvals/pending` ← đã có Postman

### Sprint 2 — CRUD hoàn chỉnh
- [ ] Tracks, Rounds, Criteria CRUD
- [ ] Teams: approve / reject / disqualify
- [ ] Team Members: list, remove, invite
- [ ] Submissions: create, update, list

### Sprint 3 — Scoring flow
- [ ] Judge Assignments CRUD
- [ ] Scores: draft + finalize
- [ ] Rankings: calculate → advance → publish

### Sprint 4 — Read-heavy
- [ ] Leaderboard
- [ ] Prizes
- [ ] Audit Log

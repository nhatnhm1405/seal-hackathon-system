# SEAL Hackathon Management System — Database Redesign (MySQL)

Complete production-level database redesign for **MySQL 8.0+**.

---

## Deliverables

| File | Purpose |
|:-----|:--------|
| [01_seal_hackathon_ddl.sql](file:///d:/FPT%20Uni/kì%205/SWP391/seal-hackathon-system/docs/database/MySQL/01_seal_hackathon_ddl.sql) | **CREATE TABLE**, FK constraints, CHECK constraints, indexes, triggers |
| [02_seal_hackathon_seed_data.sql](file:///d:/FPT%20Uni/kì%205/SWP391/seal-hackathon-system/docs/database/MySQL/02_seal_hackathon_seed_data.sql) | Realistic sample data (17 users, 2 events, 3 tracks, 4 teams, 3 rounds, 36 scores) |

> [!IMPORTANT]
> **Execution order:** Run `01_seal_hackathon_ddl.sql` first, then `02_seal_hackathon_seed_data.sql`.

---

## 1. ERD Analysis — Critical Issues Identified

### Issue 1: `EventCoordinator` Table — 3NF Violation (Severity: HIGH)

**Original ERD:** `EventCoordinator` had `event_id` as PK with mixed attributes: `event_title`, `event_type` (event data) alongside `full_name`, `student_id` (user data).

**Problems:**
- Violates Third Normal Form (transitive dependency on non-key attributes).
- Limits each event to a single coordinator.
- Duplicates user profile data already stored elsewhere.

**Redesign:**
- **`event_coordinators`** — Clean M:N junction table `(event_id, user_id)`. An event can have multiple coordinators.
- **`event_activities`** — Captures workshops/webinars/mentoring/announcements that were incorrectly embedded in the coordinator entity.

---

### Issue 2: User Profile Data Duplication (Severity: HIGH)

**Original ERD:** `full_name`, `student_id`, `University_name`, `student_type` appeared in both `TeamMember` and `EventCoordinator`.

**Problem:** If a user is both a coordinator and participant, their name/student data exists in multiple places — update anomalies guaranteed.

**Redesign:** Created centralized `user_profiles` table (1:1 with `users`). All role-specific tables reference `user_id` only.

---

### Issue 3: Redundant Team Leader Logic (Severity: MEDIUM)

**Original ERD:** `Team.leader_id` pointed to `User`, while `TeamMember.is_leader` was a boolean — duplicated state.

**Redesign:** `teams.leader_id` is the single source of truth. `team_members.role_in_team` uses `VARCHAR(20)` with `'LEADER'`/`'MEMBER'` values (more extensible than boolean).

---

### Issue 4: Inflexible Submission Structure (Severity: MEDIUM)

**Original ERD:** Fixed columns: `repo_url`, `demo_url`, `slide_url`. Adding a Figma link or video demo requires DDL changes.

**Redesign:** Created `submission_assets` table (1:N from submissions). Teams submit any number of typed assets: `'GITHUB_REPO'`, `'SLIDE_DECK'`, `'DEMO_VIDEO'`, `'FIGMA_DESIGN'`, etc.

---

### Issue 5: Global-Only Role System (Severity: MEDIUM)

**Original ERD:** User had a single `role_id`. A user could not be a participant in Event A and a judge in Event B.

**Redesign:** `users.role_id` handles system-level roles (`ADMIN`, `ORGANIZER`, `USER`). Event-specific roles are handled via: `event_coordinators`, `mentor_assignments`, `judge_assignments`.

---

### Issue 6: Missing Audit & Soft Delete (Severity: LOW)

**Original ERD:** Most tables lacked `created_at`, `updated_at`, and `deleted_at`.

**Redesign:** All transactional tables include `created_at`, `updated_at` (with auto-update triggers), and `deleted_at` (soft delete).

---

## 2. Complete Schema — 27 Tables

```mermaid
erDiagram
    roles ||--o{ users : "assigns"
    roles ||--o{ role_permissions : "holds"
    permissions ||--o{ role_permissions : "contains"
    users ||--|| user_profiles : "has"
    users ||--o{ account_approvals : "applies"
    users ||--o{ account_approvals : "reviews"
    events ||--o{ event_coordinators : "managed_by"
    users ||--o{ event_coordinators : "coordinates"
    events ||--o{ event_activities : "includes"
    users ||--o{ event_activities : "organizes"
    events ||--o{ tracks : "has"
    events ||--o{ rounds : "progresses"
    events ||--o{ criteria_sets : "defines"
    events ||--o{ prizes : "offers"
    tracks ||--o{ teams : "contains"
    users ||--o{ teams : "leads"
    teams ||--o{ team_members : "comprises"
    users ||--o{ team_members : "joins"
    teams ||--o{ team_invitations : "invites"
    users ||--o{ mentor_assignments : "mentors"
    tracks ||--o{ mentor_assignments : "scoped_to"
    rounds ||--o{ judge_assignments : "evaluated_by"
    users ||--o{ judge_assignments : "judges"
    rounds ||--o{ submissions : "collects"
    teams ||--o{ submissions : "submits"
    submissions ||--o{ submission_assets : "has_assets"
    submissions ||--o{ scores : "receives"
    criteria_sets ||--o{ scoring_criteria : "groups"
    rounds ||--o{ round_criteria : "uses"
    scoring_criteria ||--o{ round_criteria : "configures"
    users ||--o{ scores : "graded_by"
    scoring_criteria ||--o{ scores : "measured_by"
    rounds ||--o{ round_rankings : "ranks"
    teams ||--o{ round_rankings : "ranked"
    teams ||--o{ prize_awards : "wins"
    prizes ||--o| prize_awards : "awarded_to"
    users ||--o{ notifications : "receives"
    users ||--o{ audit_logs : "triggers"
```

---

## 3. Table-by-Table Design Summary

### 3.1 Security & Authentication (5 tables)

| Table | PK | Key Columns | Purpose |
|:------|:---|:------------|:--------|
| `roles` | `role_id` | `role_name` (UNIQUE) | System roles: ADMIN, ORGANIZER, USER |
| `permissions` | `permission_id` | `permission_key` (UNIQUE) | Granular RBAC keys (e.g., `event:create`) |
| `role_permissions` | `(role_id, permission_id)` | — | M:N junction for RBAC |
| `users` | `user_id` | `email` (UNIQUE), `status` | Credentials + account status |
| `user_profiles` | `user_id` | `first_name`, `student_id`, `university_name` | Personal info (1:1 with users) |
| `account_approvals` | `approval_id` | `user_id`, `reviewed_by`, `status` | Registration approval workflow |

### 3.2 Event Management (4 tables)

| Table | PK | Key Columns | Purpose |
|:------|:---|:------------|:--------|
| `events` | `event_id` | `event_name`, `season`, `academic_year`, `status` | Hackathon events |
| `event_coordinators` | `(event_id, user_id)` | `assigned_at` | M:N: users as coordinators |
| `event_activities` | `activity_id` | `event_id`, `organizer_id`, `activity_type` | Workshops, webinars, announcements |
| `tracks` | `track_id` | `event_id`, `track_name`, `max_teams` | Track divisions (AI, FinTech, etc.) |

### 3.3 Team Management (4 tables)

| Table | PK | Key Columns | Purpose |
|:------|:---|:------------|:--------|
| `teams` | `team_id` | `track_id`, `leader_id`, `team_name`, `status` | Participant teams |
| `team_members` | `(team_id, user_id)` | `role_in_team` | M:N: users in teams |
| `team_invitations` | `invitation_id` | `invitee_email`, `status`, `expires_at` | Invitation workflow |
| `mentor_assignments` | `assignment_id` | `mentor_id`, `track_id`/`team_id` | Flexible mentor assignment |

### 3.4 Rounds & Submissions (4 tables)

| Table | PK | Key Columns | Purpose |
|:------|:---|:------------|:--------|
| `rounds` | `round_id` | `event_id`, `round_order`, `submission_deadline` | Evaluation rounds |
| `judge_assignments` | `assignment_id` | `judge_id`, `round_id`, `judge_type` | Judge-to-round mapping |
| `submissions` | `submission_id` | `team_id`, `round_id` (UNIQUE pair), `project_name` | Team submissions |
| `submission_assets` | `asset_id` | `submission_id`, `asset_type`, `asset_url` | Flexible asset storage |

### 3.5 Scoring & Rankings (4 tables)

| Table | PK | Key Columns | Purpose |
|:------|:---|:------------|:--------|
| `criteria_sets` | `set_id` | `event_id`, `set_name` | Reusable criteria groups |
| `scoring_criteria` | `criteria_id` | `set_id`, `max_score`, `default_weight` | Individual rubric items |
| `round_criteria` | `(round_id, criteria_id)` | `weight_override` | Criteria-to-round mapping |
| `scores` | `score_id` | `submission_id`, `judge_id`, `criteria_id` (UNIQUE triple) | Individual scores |
| `round_rankings` | `ranking_id` | `team_id`, `round_id` (UNIQUE pair), `position` | Pre-calculated rankings |

### 3.6 Rewards, Notifications & Audit (4 tables)

| Table | PK | Key Columns | Purpose |
|:------|:---|:------------|:--------|
| `prizes` | `prize_id` | `event_id`, `prize_name`, `rank_position` | Prize definitions |
| `prize_awards` | `award_id` | `team_id`, `prize_id` (UNIQUE) | Prize-to-team mapping |
| `notifications` | `notification_id` | `user_id`, `is_read` | In-app alerts |
| `audit_logs` | `log_id` | `performed_by`, `entity_type`, `entity_id` | Activity log (JSON details) |

---

## 4. MySQL Specific Adaptations

| Concern | Solution |
|:--------|:---------|
| **Unicode (Vietnamese)** | Database default charset set to `utf8mb4` with `utf8mb4_unicode_ci` collation. `VARCHAR` is standard. |
| **Boolean** | Uses native `TINYINT(1)` or `BOOLEAN` synonym |
| **Timestamps** | `DATETIME(3)` or `TIMESTAMP(3)` with `DEFAULT CURRENT_TIMESTAMP(3)` and `ON UPDATE CURRENT_TIMESTAMP(3)` |
| **Auto-increment** | `INT AUTO_INCREMENT` / `BIGINT AUTO_INCREMENT` |
| **JSON validation** | Native `JSON` column type (ensures automatic JSON structure validation) |
| **Cascade cycles** | MySQL InnoDB supports multiple cascade paths natively without cycle restrictions, allowing full `ON DELETE CASCADE` on all foreign key constraints. |
| **Auto `updated_at`** | Handled natively by column definitions using `ON UPDATE CURRENT_TIMESTAMP(3)` (no custom triggers needed) |

---

## 5. Indexing Strategy

| Category | Index Count | Strategy |
|:---------|:------------|:---------|
| **Foreign Key Indexes** | 28 | Explicit B-Tree on all FK columns (MySQL InnoDB automatically indexes foreign keys, but explicit indexing is good practice) |
| **Unique Composite** | 6 | Serve as both constraints and fast-lookup indexes |
| **Covering Indexes** | 2 | `user_profiles(last_name, first_name)`, `audit_logs(created_at DESC)` |

---

## 6. Seed Data Summary

| Entity | Count | Notes |
|:-------|:------|:------|
| Roles | 3 | ADMIN, ORGANIZER, USER |
| Permissions | 12 | Granular RBAC keys |
| Users | 17 | 1 admin, 2 coordinators, 3 judges, 2 mentors, 8 participants, 1 pending |
| Events | 2 | Summer 2026 (OPEN), Fall 2026 (DRAFT) |
| Tracks | 3 | GenAI, FinTech, HealthTech |
| Teams | 4 | 3 approved, 1 pending |
| Rounds | 3 | Idea → Prototype → Final |
| Submissions | 3 | Round 1 submissions with 8 total assets |
| Scores | 36 | 3 judges × 3 teams × 4 criteria |
| Rankings | 3 | Pre-calculated Round 1 results |
| Prizes | 5 | Including cash values in VND |
| Notifications | 7 | Mixed read/unread states |
| Audit Logs | 9 | JSON-structured change details |

---

## Verification Plan

### Automated Tests
```sql
-- After executing both scripts in MySQL, run:

-- 1. Verify all tables exist (expect 27 rows)
SELECT COUNT(*) AS table_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE();

-- 2. Verify all foreign keys (expect 35+ constraints)
SELECT COUNT(*) AS fk_count FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_NAME IS NOT NULL AND TABLE_SCHEMA = DATABASE();

-- 3. Test a cross-table query (team rankings with member info)
SELECT t.team_name, rr.position, rr.total_score,
       CONCAT(up.first_name, ' ', up.last_name) AS leader_name
FROM round_rankings rr
JOIN teams t ON rr.team_id = t.team_id
JOIN users u ON t.leader_id = u.user_id
JOIN user_profiles up ON u.user_id = up.user_id
WHERE rr.round_id = 1
ORDER BY rr.position;
```

### Manual Verification
- Open both `.sql` files in your MySQL client (e.g., DBeaver, MySQL Workbench) and execute sequentially.
- Verify no errors in the execution console.
- Confirm table list and structure matches requirements.

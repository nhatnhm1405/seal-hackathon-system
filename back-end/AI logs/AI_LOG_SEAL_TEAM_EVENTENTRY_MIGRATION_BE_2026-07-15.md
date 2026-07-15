# AI LOG — Team/TeamEventEntry Migration ("nhánh 1" của Team entity season-independence) — BE — 2026-07-15

> Tách `Team` từ một row khoá cứng vào 1 event (`event_id NOT NULL`, bất biến)
> thành một **identity ổn định tồn tại xuyên suốt nhiều mùa giải** — mirror
> đúng cách `User`/`UserEventRole` đã làm. Entity mới `TeamEventEntry` gánh
> toàn bộ dữ kiện theo-mùa (event, track, status, disqualified...). Đây là
> "nhánh 1" — nhánh lớn nhất và cuối cùng trong 3 nhánh của sáng kiến
> season-independence (nhánh 2 "leave event/coordinator removal" và nhánh 3
> "leftover-grouping manual override" đã xong từ trước, xem
> `AI_LOG_SEAL_LEAVE_EVENT_AND_COORDINATOR_REMOVAL_FULLSTACK_2026-07-15.md`).
> Nhánh: `TrangNHK-leave-event-coordinator-removal` (làm tiếp trên nhánh có
> sẵn, **chưa commit**). Phạm vi: **chỉ Backend** — 0 file frontend bị đụng
> (đã tự kiểm bằng `git status`), vì thiết kế cố tình giữ nguyên toàn bộ
> API contract hiện có.

---

## 1. Bối cảnh

Phiên trước (ghi trong memory `team-entity-season-independence`) đã chốt thiết
kế nhưng **chưa code**: `Team.event_id NOT NULL` khiến một team chỉ có thể
thi đúng 1 mùa duy nhất trong lịch sử — nếu muốn thi lại mùa sau, hệ thống
buộc phải tạo ra một `Team` hoàn toàn mới, không có liên hệ gì với team cũ.
User đánh giá việc này "không hợp lý" và yêu cầu `Team` phải tồn tại xuyên
mùa như `User` đã làm.

Phiên này bắt đầu bằng lệnh "tiếp tục nhánh 1", đọc lại memory, sau đó dùng
**Plan Mode** để khảo sát toàn bộ codebase (2 Explore agent chạy song song +
tự đọc trực tiếp các file lõi) trước khi viết bất kỳ dòng code nào, vì quy mô
đã được cảnh báo trước là rất lớn (ước tính ~12 file trong memory, thực tế khi
rà kỹ ra tới **~28 file** có chạm `.getEvent()`/`.getTrack()`/`.getStatus()`
trên `Team`).

---

## 2. Thiết kế / các quyết định quan trọng chốt trong phiên này

Thiết kế khung (Team thin identity + TeamEventEntry) đã có sẵn từ memory.
Phiên này phải tự quyết thêm mấy điểm mà memory chưa nói rõ:

| Vấn đề | Quyết định | Vì sao |
|---|---|---|
| Route coordinator/leader hiện tại chỉ có `teamId`, không có `eventId` (`PUT /{teamId}/approve`, `/reject`, `/disqualify`, `/track-assignment`, `/members/{userId}/coordinator-remove`, `GET /{teamId}`, `PUT /{teamId}/track`) | **Không đổi API, không đổi FE.** `TeamService` tự resolve "entry hiện tại" = `TeamEventEntry` mới nhất của team (`findTopByTeam_TeamIdOrderByIdDesc`) | Một team chỉ đang "mid-review" ở đúng 1 mùa tại 1 thời điểm trong thực tế — rejoin (thứ duy nhất có thể tạo entry thứ 2 đang sống) chưa được xây. Nhờ vậy **0 thay đổi hợp đồng API, 0 thay đổi frontend** |
| `TeamInvite`/`JoinRequest` trước giờ suy ra "thuộc event nào" qua `team.getEvent()` — giờ `Team` không còn field đó | Thêm cột `event_id` (Integer thường, không FK-relation) vào cả 2 entity, set lúc tạo dựa theo entry hiện tại của team | Mirror đúng pattern `UserEventRole.eventId` đã có sẵn trong codebase — không cần thêm quan hệ JPA mới |
| `Team.isActive` nên hoạt động thế nào? | Mirror y hệt `User.isActive`: tự `false` khi event hoàn thành (`lockCompletedEventParticipantsReadOnly`, mở rộng thêm để loop cả team), tự `true` lại khi event reopen (`reactivateEventParticipants`, mở rộng tương tự) — **trừ** `DISQUALIFIED` luôn set `false` ngay lập tức bất kể event đang ở phase nào (theo đúng refinement #2 đã chốt trong memory), và reopen **không được** hồi sinh 1 team đã bị disqualify | Diễn giải lại đúng câu chữ trong memory: "isActive nên flip false ngay lập tức khi DISQUALIFIED, **không đợi** event complete" — nghĩa là hành vi mặc định (không disqualify) vốn dĩ ĐÃ PHẢI đợi event complete mới flip, y hệt User |
| "Team rỗng" (solo leader rời đi) xoá gì? | Chỉ xoá `TeamEventEntry` của mùa hiện tại, **không bao giờ** xoá row `Team` | Đã chốt trong memory (refinement #1) — Team giờ có thể đã từng thi các mùa trước, xoá cả `Team` sẽ xoá luôn lịch sử |
| Roster (`TeamMember`) có cần tách theo mùa không? | **Không** — giữ nguyên gắn thẳng vào `Team`, không đổi gì | Đây chính là điều làm rejoin sau này "trivial" (memory đã nói) — roster tồn tại độc lập với entry |
| `getMyHistory`/`getMyResultHistory` sẽ hơi "quá rộng" một khi rejoin ra đời (member join sau vẫn thấy được mùa cũ team từng thi trước khi họ join, vì `TeamMember` không có ranh giới theo mùa) | Biết trước, **không sửa ngay** — chỉ để lại comment cảnh báo trong code, vì rejoin chưa tồn tại nên hiện tại mỗi Team luôn chỉ có đúng 1 entry, bug này chưa thể xảy ra trên thực tế | Tránh code "phòng hờ" cho tính năng chưa được xây (matching "không thiết kế cho yêu cầu giả định") |

Phiên làm việc dùng **Plan Mode** đầy đủ (EnterPlanMode → 2 Explore agent
song song khảo sát toàn bộ service/repository/entity layer → đọc trực tiếp
`Team.java`, `User.java`/`UserEventRole.java` (mẫu tham chiếu),
`TeamService.java`, `TeamRepository.java`, `TeamMemberRepository.java`,
`LeftoverGroupingService.java`, `TeamController.java`,
`JoinRequestController.java`, `TeamInviteController.java`, các đoạn
completion/reactivation trong `HackathonEventService.java`, entity
`TeamInvite`/`JoinRequest`, schema SQL, seed SQL → viết kế hoạch chi tiết ra
file plan → `ExitPlanMode` xin duyệt → user duyệt → mới bắt đầu code).

---

## 3. Triển khai — theo 5 bước đã lên kế hoạch

### Bước 1 — Entity & Repository layer

- `entity/Team.java`: bỏ `event`, `track`, `status`, `disqualifiedReason`,
  `disqualifiedAt`; thêm `isActive` (Boolean, default `true`).
- **Entity mới** `entity/TeamEventEntry.java`: `id`, `team` (ManyToOne),
  `event` (ManyToOne), `track` (ManyToOne, nullable), `status` (default
  `PENDING`), `disqualifiedReason`, `disqualifiedAt`, `createdAt`. Unique
  `(team_id, event_id)`.
- **Repository mới** `repository/TeamEventEntryRepository.java`: gom toàn bộ
  query theo event/status/track vốn nằm ở `TeamRepository` (di chuyển
  nguyên vẹn), cộng thêm: `findByTeam_TeamIdAndEvent_EventId`,
  `existsByTeam_TeamIdAndEvent_EventId`,
  `findTopByTeam_TeamIdOrderByIdDesc` (bộ giải "entry hiện tại"),
  `findByIdForUpdate` (pessimistic lock), JPQL kiểm tra tên trùng theo event
  (`existsByEventIdAndNormalizedName`, thay cho bản cũ trên `TeamRepository`).
- `repository/TeamRepository.java`: co lại chỉ còn identity-thuần
  (`JpaRepository` mặc định) + giữ lại `findByIdForUpdate` — lock này vẫn
  còn ý nghĩa vì nó khoá **roster** (đang mutate `TeamMember`), không phải
  state theo-mùa.
- `entity/TeamInvite.java`, `entity/JoinRequest.java`: thêm cột `eventId`.
- `repository/TeamMemberRepository.java`: viết lại 4 derived-query từng đi
  qua `Team.event`/`Team.status`/`Team.track` thành JPQL join tường minh
  qua `TeamEventEntry` (JPA cho phép `JOIN OtherEntity ON ...` giữa 2 entity
  không có quan hệ mapped, từ JPA 2.1).
- `repository/JoinRequestRepository.java`,
  `repository/TeamInviteRepository.java`: 2 method mỗi bên đơn giản hoá
  thành query phẳng trên cột `eventId` mới, không cần join nữa.
- `database scripts/seal_schema.sql`: thêm bảng `TeamEventEntry`; sửa bảng
  `Team` (bỏ cột event/track/status/disqualified, thêm `is_active`); sửa
  `TeamInvite`/`JoinRequest` (thêm cột `event_id` + FK).
- `database scripts/seal_seed.sql`: tách insert `Team` (17 team) thành 2 bước
  — insert `Team` (chỉ name/description) rồi insert `TeamEventEntry` tương
  ứng theo đúng `team_id` cũ; sửa 2 dòng insert `TeamInvite` thêm cột
  `event_id`.

### Bước 2 — Viết lại `TeamService.java`

Gần như toàn bộ method của service này đều đổi (đúng như memory đã cảnh
báo trước): `createTeam` giờ tạo cả `Team` lẫn `TeamEventEntry` cùng lúc;
mọi method coordinator-facing (`approveTeam`, `rejectTeam`, `disqualifyTeam`,
`assignTeamToTrack`, `getTeamById`, `coordinatorRemoveMember`, `selectTrack`)
dùng helper riêng `requireCurrentEntry(Team)` để lấy entry đang sống; 4 helper
map response (`mapToTeamResponse`, `mapToMyTeamResponse`, `mapToDetailResponse`,
`mapToTeamHistoryResponse`) đều nhận thêm tham số `TeamEventEntry` để lấy field
event/track/status/disqualified từ đó thay vì từ `Team`. `leaveTeam` nhánh
solo-leader giờ chỉ `teamEventEntryRepository.delete(entry)`, không đụng
`teamRepository.delete(team)` nữa. `disqualifyTeam` và
`coordinatorRemoveMember` (nhánh hết người) đều set thêm
`team.setIsActive(false)` bên cạnh việc set `entry.status=DISQUALIFIED`.

### Bước 3 — Sửa các service phụ thuộc

Tổng cộng chạm tới các service sau (theo đúng bản kiểm kê 2 Explore agent
tổng hợp, cộng thêm 2 file phát hiện thêm khi rà lại lần cuối — xem mục 4):

- `LeftoverGroupingService.java` — 2 chỗ `Team.builder()` (tạo team mới lúc
  gom leftover) giờ tách thành cặp `Team.builder()` + `TeamEventEntry.builder()`;
  `dissolve(Team)` đổi thành `dissolve(Team, Integer eventId)` — xoá đúng
  `TeamEventEntry` của mùa đang xử lý, không đụng identity `Team` (khớp
  refinement #1); `Source` record trong file thêm field `TeamEventEntry entry`.
- `TeamInviteService.java`, `JoinRequestService.java` — resolve entry hiện
  tại lúc tạo invite/request để set cột `eventId` mới; mọi chỗ đọc
  `team.getEvent()/getStatus()/getTrack()` đổi thành đọc từ entry (resolve
  theo `invite.getEventId()`/`request.getEventId()` khi accept, không phải
  "entry hiện tại" — vì invite/request đã gắn cứng với mùa lúc tạo).
- `SubmissionService.java` — thay idiom "tìm team hiện tại của user trong
  event" bằng `teamEventEntryRepository.existsByTeam_TeamIdAndEvent_EventId`.
- `PrizeService.java` — `resolveTeam` đổi từ so sánh `team.getEvent()` sang
  kiểm tra tồn tại `TeamEventEntry`; `mapToResponse` resolve entry theo
  `(team, prize.getEvent())` để lấy tên track.
- `HackathonEventService.java` — mở rộng `lockCompletedEventParticipantsReadOnly`/
  `reactivateEventParticipants` để cũng loop qua team (mirror User, xem
  bảng quyết định ở mục 2); `hasNonCompletedMembership` đổi ngữ nghĩa từ
  "1 event duy nhất của team" sang "duyệt qua **mọi** entry của team".
- `MentorSupportRequestService.java` — thêm helper `currentEntry(Team)` để
  lấy track hiện tại (trước đây đọc thẳng `team.getTrack()`).
- `AuthService.isCurrentEventMembership` — đổi từ đọc 1 event duy nhất sang
  duyệt qua mọi entry của team, kiểm tra có entry nào event đang OPEN/SETUP/
  IN_PROGRESS không.
- `AssignmentService.java`, `RoundTimerService.java`, `RoundResultService.java`,
  `JudgeScoringCompletenessService.java` — đều đã có sẵn context event (qua
  `round.getEvent()`/`assignment.getRound().getEvent()`) nên **không cần
  đổi signature**, chỉ đổi cách resolve track/status từ `TeamEventEntry`
  thay vì `Team` trực tiếp.
- `TrackProblemService` — không cần sửa gì (kế thừa tự động từ việc
  `TeamMemberRepository` được viết lại ở Bước 1).

### Bước 4 — Seed data

- `DemoFixtures.team(...)` — build cặp `Team` + `TeamEventEntry` thay vì 1
  `Team.builder()...event()...status()`.
- `DemoFixtures.deactivateCompletedEventUsers` — đổi sang
  `teamEventEntryRepository.findAllByEvent_EventId`.
- `DemoScenario.java` — record `Slot` (dùng để build kịch bản demo theo
  track/strength) thêm field `Track track` (trước đây suy ra qua
  `s.team.getTrack()`, giờ Team không còn track nữa nên phải truyền thẳng
  lúc tạo `Slot`).

### Bước 5 — Compile, sửa test, chạy toàn bộ suite

Xem chi tiết ở mục 5 (bug tìm thấy) và mục 6 (kết quả cuối).

---

## 4. Bug/lỗ hổng phát hiện thêm ngoài kế hoạch ban đầu

Bản kế hoạch (từ 2 Explore agent + tự đọc code) chỉ bắt được các lệnh gọi
Java kiểu `.getEvent()`/`.getTrack()`/`.getStatus()`. Khi build thật, lộ ra
thêm mấy chỗ mà cách rà bằng grep-theo-method-call không thấy được:

1. **`AnnouncementService.java`, `TrackService.java`** — 2 service này gọi
   `teamRepository.findAllByTrack_Track...`/`findAllByEvent_...` nhưng
   không nằm trong danh sách 2 Explore agent báo cáo (có lẽ bị bỏ sót khi
   khảo sát). Phát hiện được nhờ 1 lượt `grep` quét lại toàn bộ
   `teamRepository.findAllBy|countBy|existsBy` trên cả codebase **sau khi**
   tưởng đã xong Bước 3 — sửa bổ sung trước khi compile lần đầu.
2. **2 câu JPQL thô** — không bị grep theo `.getEvent()` bắt được vì nằm
   trong chuỗi `@Query(...)`, không phải lệnh gọi method Java:
   - `UserRepository.findGroupableFreeAgents` — `WHERE tm.team.event.eventId
     = :eventId` → phải join tường minh qua `TeamEventEntry`. Lỗi này khiến
     **toàn bộ Spring context load thất bại lúc khởi động** (bean
     `dataSeeder`→`userRepository` không tạo được), bắt được nhờ chạy
     `HackathonApplicationTests.contextLoads`.
   - `SubmissionRepository.findBySubmissionIdAndJudgeId` /
     `findAllByRoundIdAndJudgeId` — `JOIN s.team t LEFT JOIN t.track
     teamTrack` → cũng phải join qua `TeamEventEntry` trước khi lấy `track`.
     Lỗi này **chỉ lộ ra sau khi đã sửa xong lỗi #1 ở trên** (context load
     tiếp tục thất bại ở 1 bean khác), vì Hibernate validate từng named
     query một, không báo hết lỗi cùng lúc.
3. **`RoundResultService.finalizeRound`** — sau khi sửa để resolve track
   qua `TeamEventEntry`, khai báo trùng tên biến `eventId` (method đã có
   sẵn tham số `eventId`) → lỗi compile "variable already defined", sửa
   bằng cách bỏ khai báo local thừa, dùng thẳng tham số method.
4. **Test cũ kỳ vọng sai hành vi mới** — `TeamServiceTest
   .leaveTeam_shouldDeleteTeam_whenOnlyLeaderLeaves` verify
   `teamRepository.delete(team)`, nhưng theo thiết kế mới (refinement #1)
   hành vi đúng là chỉ xoá `TeamEventEntry`. Đổi tên test thành
   `leaveTeam_shouldDeleteOnlyTheSeasonEntry_whenOnlyLeaderLeaves`, verify
   `teamEventEntryRepository.delete(entry)` + `teamRepository, never()).delete(any())`.

---

## 5. Sửa test — cách tiếp cận

10 file test cần sửa (42 lỗi compile ban đầu): `AuthServiceTest`,
`HackathonEventServiceTest`, `JoinRequestServiceTest`,
`JudgeScoringCompletenessServiceTest`, `LeftoverGroupingFreeAgentTest`,
`RoundTimerServiceTest`, `ScoringServiceTest`, `SubmissionServiceTest`,
`TeamInviteServiceTest`, `TeamServiceTest`, `TrackServiceTest`.

Với những file có 1 helper `team(...)` dùng chung ở nhiều test (đặc biệt
`TeamServiceTest` — ~50 chỗ gọi), cách sửa hiệu quả nhất là:
- Đổi helper từ `private static` thành instance method (không static nữa),
  để nó có thể truy cập mock `teamEventEntryRepository` của class test.
- Helper build cả `Team` lẫn `TeamEventEntry` tương ứng, rồi
  `lenient().when(teamEventEntryRepository.findTopByTeam_TeamIdOrderByIdDesc(...))`
  ngay trong helper — `lenient()` vì nhiều test build team nhưng không bao
  giờ thật sự chạm tới bước resolve entry (case ResourceNotFound sớm...),
  nếu dùng `when()` thường sẽ dính `UnnecessaryStubbingException` (Mockito
  strict-stubs mặc định của `MockitoExtension`).

Nhờ cách này, phần lớn các test method **không cần sửa gì thêm** — chỉ những
test **assert trực tiếp** trên `team.getTrack()`/`.getStatus()` (giờ đã
không còn tồn tại trên `Team`) hoặc **verify** `teamRepository.save(...)`
tại những chỗ mà code thật giờ save `TeamEventEntry` thay vì `Team` mới cần
sửa tay từng dòng (ví dụ 3 test `assignTeamToTrack_*`, và bỏ 4 dòng stub
`teamRepository.save(team)` không còn dùng tới ở `approveTeam`/`rejectTeam`
vì 2 method này giờ không đụng `teamRepository.save` nữa — chỉ
`disqualifyTeam` còn đụng, vì đó là chỗ set `isActive=false`).

`TeamRepository` không còn cần thiết trong `TrackServiceTest` nữa (đã xoá
hẳn khỏi `TrackService`) — xoá luôn mock, không giữ mock thừa không dùng.

---

## 6. Kết quả kiểm thử cuối cùng

```
./mvnw -o clean test-compile     → BUILD SUCCESS (242 file main + 17 file test)
./mvnw -o test                   → Tests run: 366, Failures: 0, Errors: 0 — BUILD SUCCESS
```

`HackathonApplicationTests.contextLoads` nằm trong 366 test đó và **pass** —
nghĩa là toàn bộ entity mapping + mọi câu JPQL (kể cả những câu không có
test riêng) đã được Hibernate xác thực hợp lệ lúc khởi động thật.

Frontend: `npx tsc -p tsconfig.app.json --noEmit` — còn đúng 1 lỗi, nhưng là
lỗi **có sẵn từ trước, không liên quan** (`CoordJudgesPage.tsx`, kiểu
`ReactPortal | null` không gán được cho `Element`) — xác nhận bằng
`git status --short front-end/` cho ra rỗng, tức phiên này **không đụng file
frontend nào**, khớp đúng thiết kế "0 thay đổi API/FE" ở mục 2.

---

## 7. Việc chưa làm / để ngỏ

- [ ] **Chưa commit** — toàn bộ đang là working-tree changes trên
      `TrangNHK-leave-event-coordinator-removal`.
- [ ] **Chưa reset DB dev** — `ddl-auto=update` không tự động tách lại các
      row `Team` cũ đã tồn tại sẵn thành `Team`+`TeamEventEntry`; cần drop
      schema `seal_hackathon` và khởi động lại app với 1 `SEED_SCENARIO` để
      áp dụng đúng cấu trúc mới. Chưa tự làm bước này vì cần MySQL local
      đang chạy và là 1 thao tác có tính phá huỷ (dù dữ liệu dev không cần
      giữ) — để user tự quyết định lúc nào làm.
- [ ] **Chưa verify end-to-end qua trình duyệt/Postman thật** — khác với
      nhánh 2/3 (đã verify bằng Playwright thật), nhánh 1 mới chỉ được xác
      nhận qua unit/integration test (366/366 pass, kể cả context-load) và
      đọc code kỹ, **chưa** thật sự bấm qua UI thật hay gọi Postman request
      mới. Cần làm sau khi DB được reset.
- [ ] `getMyHistory`/`getMyResultHistory` có 1 lỗ hổng ngữ nghĩa lý thuyết
      (mục 2, hàng cuối bảng) — chưa fix, chỉ để comment cảnh báo trong
      code, vì tính năng rejoin (thứ duy nhất kích hoạt được lỗ hổng này)
      chưa tồn tại.
- [ ] Rejoin (leader request → coordinator approve → 1 `TeamEventEntry` mới
      cho `Team` đã có sẵn) — vẫn là tính năng riêng, chưa xây, đúng như
      memory đã nói từ đầu.

---

## 8. Danh sách file

**Backend — mới (2 file):**
```
entity/TeamEventEntry.java
repository/TeamEventEntryRepository.java
```

**Backend — sửa, entity/repository (9 file):**
```
entity/Team.java                        (bỏ event/track/status/disqualified*, +isActive)
entity/TeamInvite.java                  (+eventId)
entity/JoinRequest.java                 (+eventId)
repository/TeamRepository.java          (co lại còn identity-only + findByIdForUpdate)
repository/TeamMemberRepository.java    (4 query viết lại qua TeamEventEntry)
repository/JoinRequestRepository.java   (1 query đơn giản hoá theo cột eventId mới)
repository/TeamInviteRepository.java    (1 query đơn giản hoá theo cột eventId mới)
repository/UserRepository.java          (findGroupableFreeAgents — JPQL join qua TeamEventEntry)
repository/SubmissionRepository.java    (2 JPQL — join qua TeamEventEntry để lấy track)
```

**Backend — sửa, service layer (14 file):**
```
service/TeamService.java                 (gần như viết lại toàn bộ)
service/LeftoverGroupingService.java     (Team.builder() → cặp Team+TeamEventEntry; dissolve theo entry)
service/TeamInviteService.java
service/JoinRequestService.java
service/SubmissionService.java
service/PrizeService.java
service/HackathonEventService.java       (+isActive mirroring team lúc complete/reopen)
service/MentorSupportRequestService.java
service/AuthService.java
service/AssignmentService.java
service/RoundTimerService.java
service/RoundResultService.java
service/JudgeScoringCompletenessService.java
service/TrackService.java
service/AnnouncementService.java
```

**Backend — sửa, seed & schema snapshot (4 file):**
```
config/seed/DemoFixtures.java
config/seed/DemoScenario.java
database scripts/seal_schema.sql
database scripts/seal_seed.sql
```

**Backend — sửa, test (11 file):**
```
test/.../service/TeamServiceTest.java
test/.../service/TeamInviteServiceTest.java
test/.../service/JoinRequestServiceTest.java
test/.../service/HackathonEventServiceTest.java
test/.../service/AuthServiceTest.java
test/.../service/JudgeScoringCompletenessServiceTest.java
test/.../service/LeftoverGroupingFreeAgentTest.java
test/.../service/RoundTimerServiceTest.java
test/.../service/ScoringServiceTest.java
test/.../service/SubmissionServiceTest.java
test/.../service/TrackServiceTest.java
```

**Frontend:** không có file nào bị đụng.

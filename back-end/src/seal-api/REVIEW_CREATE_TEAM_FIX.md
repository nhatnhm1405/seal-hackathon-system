# Review sua Create Team

File nay ghi lai cac thay doi lien quan den chuc nang create team va cac API ho tro quanh team. Muc tieu la dong bo API theo camelCase, dong bo logic status voi quyet dinh hien tai, va giu DB mapping rieng voi JSON API.

## Ket luan nhanh

- DB van giu ten cot kieu snake_case nhu `event_id`, `track_id`.
- Java DTO, Java entity response, Swagger va FE dung camelCase nhu `eventId`, `trackId`.
- Create team chi cho phep khi event dang o status `PUBLISHED`.
- `GET /api/teams/my` lay team moi nhat cua member bang cach sort theo `Team.createdAt DESC`.
- Build da duoc verify bang `mvn -DskipTests compile`: `BUILD SUCCESS`.

## File da sua

| STT | File | Noi dung sua | Ly do |
| --- | --- | --- | --- |
| 1 | `src/main/java/com/seal/hackathon/dto/request/CreateTeamRequest.java` | Bo `@JsonAlias("event_id")`, `@JsonAlias("track_id")`, `@JsonAlias("team_name")` | Chuan hoa JSON API ve camelCase: `eventId`, `trackId`, `name` |
| 2 | `src/main/java/com/seal/hackathon/controller/TeamController.java` | Tra `201 Created` khi tao team thanh cong | `POST /api/teams` tao resource moi, nen dung HTTP 201 thay vi 200 |
| 3 | `src/main/java/com/seal/hackathon/service/TeamService.java` | Doi status cho phep tao team sang `PUBLISHED` | Theo quyet dinh hien tai: participant tao team khi event da published/mo dang ky |
| 4 | `src/main/java/com/seal/hackathon/service/TeamService.java` | `getActiveEventsWithTracks()` lay event status `PUBLISHED` | Endpoint nay phuc vu man hinh tao team, nen phai tra cac event dang cho phep tao team |
| 5 | `src/main/java/com/seal/hackathon/service/TeamService.java` | `getMyTeam()` lay team moi nhat cua member | Khong can check event status; team moi nhat duoc xac dinh bang `Team.createdAt DESC` |
| 6 | `src/main/java/com/seal/hackathon/repository/TeamMemberRepository.java` | Them `findByUser_UserIdOrderByTeam_CreatedAtDesc(Integer userId)` | Lay cac membership cua user theo team moi nhat truoc |
| 7 | `API_Backend.md` | Doi body create team thanh `{ name, eventId, trackId }` | Dong bo doc voi Swagger/DTO/backend |

## Chuan request moi

Endpoint:

```http
POST /api/teams
```

Body dung trong Swagger/FE:

```json
{
  "name": "Team Alpha",
  "eventId": 1,
  "trackId": 2,
  "description": "Optional"
}
```

Khong dung nua:

```json
{
  "team_name": "Team Alpha",
  "event_id": 1,
  "track_id": 2
}
```

## Flow create team sau khi sua

1. FE goi `POST /api/teams` voi body camelCase.
2. `TeamController.createTeam()` nhan `CreateTeamRequest`.
3. Backend lay `userId` tu JWT principal.
4. `TeamService.createTeam(userId, request)` duoc goi.
5. Service kiem tra user ton tai.
6. Service kiem tra event ton tai.
7. Service chi cho tao team neu `event.status = PUBLISHED`.
8. Service kiem tra thoi gian registration start/end neu co cau hinh.
9. Service kiem tra track ton tai.
10. Service kiem tra track thuoc dung event.
11. Service kiem tra ten team chua trung trong event.
12. Service kiem tra user chua co team trong event do.
13. Service tao `Team` voi status `PENDING`.
14. Service tao `TeamMember` voi role `LEADER`.
15. Controller tra `201 Created` kem `TeamResponse`.

## Flow lay team moi nhat cua user

Endpoint:

```http
GET /api/teams/my
```

Flow:

1. Backend lay `userId` tu JWT principal.
2. Service goi `teamMemberRepository.findByUser_UserIdOrderByTeam_CreatedAtDesc(userId)`.
3. Repository tim tat ca `TeamMember` cua user do.
4. Repository sort theo `Team.createdAt DESC`.
5. Service lay phan tu dau tien trong danh sach.
6. Service load danh sach member cua team do.
7. Service tra `MyTeamResponse`.

Logic nay khong check `event.status`, vi requirement hien tai la lay team moi nhat cua user dua tren thoi diem tao team.

## Luu y ve DB va JSON

Viec DB dung `event_id`, `track_id` nhung API dung `eventId`, `trackId` la dung va rat binh thuong.

Quy uoc hien tai nen giu:

| Tang | Naming |
| --- | --- |
| Database column | `event_id`, `track_id`, `team_id` |
| Java field | `eventId`, `trackId`, `teamId` |
| JSON API / Swagger / FE | `eventId`, `trackId`, `teamId` |

## Verify

Da chay:

```powershell
mvn -DskipTests compile
```

Ket qua:

```text
BUILD SUCCESS
```

Lan chay dau bi sandbox chan network khi Maven resolve dependency. Sau khi cap quyen network cho Maven, build compile thanh cong.

## Diem can nho khi test Swagger

Muon tao team thanh cong can co:

- User dang login co role `PARTICIPANT`.
- Event ton tai va co status `PUBLISHED`.
- Track ton tai va thuoc dung event do.
- User chua co team trong event do.
- Ten team chua trung trong event.

Neu event khong phai `PUBLISHED`, API se tra loi:

```text
This event is not currently open for registration.
```

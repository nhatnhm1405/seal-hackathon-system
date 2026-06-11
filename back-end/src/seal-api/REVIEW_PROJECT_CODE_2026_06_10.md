# Project Code Review - 2026-06-10

Pham vi review:
- Doc toan bo source chinh trong `src/main/java/com/seal/hackathon`.
- Kiem tra controller, service, repository, entity, DTO, security, exception handler.
- Chay compile va test suite hien co.
- Khong sua code trong lan review nay.

Ket qua kiem tra:
- `mvn -DskipTests compile`: PASS.
- `mvn -Dtest=TeamServiceTest test`: PASS, 7 tests.
- `mvn -Dtest=HackathonApplicationTests test`: PASS, Spring context khoi dong duoc voi MySQL local.
- `mvn test`: PASS, 10 tests.

## Findings

### P1 - JWT cu van dung duoc sau khi user bi deactivate/reject

File:
- `src/main/java/com/seal/hackathon/security/JwtAuthenticationFilter.java:55-65`
- `src/main/java/com/seal/hackathon/security/JwtService.java:72-75`

Hien tai JWT filter load user moi nhat tu DB, nhung `JwtService.validateToken(...)` chi check email va token het han hay chua. Sau do filter van set authentication vao `SecurityContext`.

Van de:
- Neu user da login, sau do bi reject/deactivate, token cu van co the tiep tuc goi API protected cho toi khi token het han.
- `UserPrincipal` co `isEnabled()` va `isAccountNonLocked()`, nhung filter/JwtService khong check 2 dieu kien nay khi validate token.

Huong sua de xuat:
- Trong `JwtAuthenticationFilter`, sau khi load `UserDetails`, chi set authentication neu:
  - token hop le
  - `userDetails.isEnabled() == true`
  - `userDetails.isAccountNonLocked() == true`
- Hoac dua check nay vao `JwtService.validateToken(...)`.

### P2 - GET /api/teams mat event/track info khi khong co team

File:
- `src/main/java/com/seal/hackathon/service/TeamService.java:253-257`
- `src/main/java/com/seal/hackathon/dto/response/TeamListResponse.java:16-24`

Hien tai `getTeams(eventId, trackId, status)` da validate va tim duoc event/track, nhung neu `teamResponses.isEmpty()` thi response chi tra:
- `total`
- `teams`

Van de:
- FE khong nhan duoc `eventId`, `eventName`, `trackId`, `trackName` khi danh sach rong.
- Trong khi response list team dang gom group info o dau, nen empty state cung nen giu cung shape.

Huong sua de xuat:
- Luon build `TeamListResponse` voi `eventId`, `eventName`, `trackId`, `trackName`, `total`, `teams`.
- Khong can tach branch rieng cho empty list.

### P2 - Tao staff/assign role chua validate day du scope theo role

File:
- `src/main/java/com/seal/hackathon/service/UserRoleService.java:42-48`
- `src/main/java/com/seal/hackathon/service/UserRoleService.java:70-76`
- `src/main/java/com/seal/hackathon/service/UserRoleService.java:92-120`
- `src/main/java/com/seal/hackathon/dto/request/CreateStaffRequest.java:35-45`
- `src/main/java/com/seal/hackathon/dto/request/AssignRoleRequest.java:17-27`

Hien tai code chi bat `judgeType` khi role la `JUDGE`, nhung chua bat cac scope bat buoc theo comment/request:
- `MENTOR` nen co `eventId` va `trackId`.
- `JUDGE` nen co `eventId`, `roundId`, va `judgeType` hop le.
- `judgeType` nen gioi han `INTERNAL` hoac `GUEST`.

Van de:
- Coordinator co the tao/assign MENTOR khong co track, JUDGE khong co round, hoac judgeType sai gia tri.
- Du lieu role assignment co the hop le ve DB nhung sai nghia business, lam cac query assignment sau nay kho doc/khong tim dung.

Huong sua de xuat:
- Them helper validate role scope trong `UserRoleService`.
- Normalize `roleName` va `judgeType` bang `trim().toUpperCase()`.
- Check `eventId/trackId/roundId` la positive neu duoc gui len.
- Neu can chinh xac hon, verify event/track/round ton tai va track/round thuoc event.

### P2 - Duplicate role check dang qua rong cho mentor/judge scoped role

File:
- `src/main/java/com/seal/hackathon/service/UserRoleService.java:96-104`

Hien tai duplicate check chi theo user + role + eventId. No khong xet `trackId` va `roundId`.

Van de:
- Neu cung mot user co the lam MENTOR cho nhieu track trong cung event, hoac JUDGE cho nhieu round trong cung event, logic hien tai se chan.
- Neu business that su muon 1 mentor/judge chi co 1 scope moi event thi khong phai bug, nhung can ghi ro.

Huong sua de xuat:
- Chot rule voi business.
- Neu cho phep nhieu scope, duplicate check nen xet day du: userId + roleName + eventId + trackId + roundId.

### P3 - GET /api/users phu thuoc open-in-view va co nguy co N+1 query

File:
- `src/main/java/com/seal/hackathon/controller/UserController.java:56-59`
- `src/main/java/com/seal/hackathon/service/AuthService.java:156-161`

`GET /api/users` dang goi `userRepository.findAll()` roi map `user.getUserEventRoles()` trong `AuthService.mapToUserResponse(...)`.

Van de:
- `userEventRoles` la LAZY. Hien tai app dang bat `spring.jpa.open-in-view` mac dinh nen co the chua loi, nhung endpoint nay phu thuoc vao OSIV.
- Co the gay N+1 queries khi list nhieu user.
- Neu tat open-in-view ve sau, endpoint nay co nguy co `LazyInitializationException`.

Huong sua de xuat:
- Tao repository method fetch roles cho list user, vi du `findAllWithRoles()`.
- Hoac dua logic list user vao service co `@Transactional(readOnly = true)` va fetch join.

### P3 - CommandLineRunner debug chay moi lan start app

File:
- `src/main/java/com/seal/hackathon/HackathonApplication.java:16-31`

App co `CommandLineRunner` in hash password demo moi lan khoi dong.

Van de:
- Lam log production/dev bi nhieu.
- Test context cung in doan demo nay.
- Day la code thu nghiem, khong phai logic app.

Huong sua de xuat:
- Xoa runner nay, hoac chi bat qua profile/dev flag neu can demo BCrypt.

### P3 - JwtAuthenticationEntryPoint tra response shape khac ApiResponse

File:
- `src/main/java/com/seal/hackathon/security/JwtAuthenticationEntryPoint.java`

Phan lon loi cua app dung `ApiResponse.error(message)`, nhung 401 unauthenticated lai tra map gom `status`, `error`, `message`, `path`.

Van de:
- FE phai handle 2 format loi khac nhau.
- Khong phai loi compile/runtime, nhung lam API contract kem nhat quan.

Huong sua de xuat:
- Can nhac tra cung shape voi `ApiResponse.error(...)` cho 401.

## Ghi chu ve test

Da chay:
- Compile pass.
- Spring context pass.
- Full test suite pass 10/10.

Khoang trong test hien tai:
- Chua co test cho `PATCH /api/teams/{teamId}/approve`.
- Chua co test cho `PATCH /api/teams/{teamId}/reject`.
- Chua co test cho `PATCH /api/teams/{teamId}/disqualify`.
- Chua co test cho JWT cu sau khi user bi deactivate/reject.
- Chua co test cho response `GET /api/teams` khi danh sach rong.
- Chua co test cho role scope validation cua MENTOR/JUDGE.

## Ket luan

Code hien tai build va test pass. Cac API team moi ve co ban da dung huong va khong gay loi compile/startup.

Van de nen uu tien sua truoc:
1. JWT cu van dung duoc sau deactivate/reject user.
2. Empty response cua `GET /api/teams` mat event/track info.
3. Role assignment chua validate day du scope theo role.


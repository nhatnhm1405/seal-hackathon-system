# Review - UserRoleService eventId validation

Ngay tao: 2026-06-10

## Muc tieu

Bo sung validate co dieu kien cho `eventId` khi coordinator tao staff account hoac gan role:

- `MENTOR` bat buoc co `eventId`.
- `JUDGE` bat buoc co `eventId`.
- `EVENT_COORDINATOR` van co the de `eventId = null`.

Khong them `@NotNull` vao request DTO vi `eventId` khong bat buoc cho moi role.

## File da sua

- `src/main/java/com/seal/hackathon/service/UserRoleService.java`

## Noi dung da sua

Trong helper `validateRoleScope(...)`, them rule:

```java
if ("MENTOR".equals(roleName) && eventId == null) {
    throw new BadRequestException("eventId is required when roleName is MENTOR.");
}
if ("JUDGE".equals(roleName) && eventId == null) {
    throw new BadRequestException("eventId is required when roleName is JUDGE.");
}
```

## Flow sau khi sua

### createStaffAccount

1. Nhan request tao staff.
2. Normalize `roleName`.
3. Normalize `judgeType`.
4. Goi `validateRoleScope(...)`.
5. Neu role la `MENTOR` ma thieu `eventId` thi tra loi 400.
6. Neu role la `JUDGE` ma thieu `eventId` thi tra loi 400.
7. Neu hop le thi tao user va luu `UserEventRole`.

### assignRole

1. Tim target user.
2. Normalize `roleName`.
3. Normalize `judgeType`.
4. Goi `validateRoleScope(...)`.
5. Neu role la `MENTOR` hoac `JUDGE` ma thieu `eventId` thi tra loi 400.
6. Neu hop le thi gan role.

## Ket qua test

- `mvn -DskipTests compile`: PASS.
- `mvn test`: PASS, 10 tests.

## Ghi chu

Thay doi nay chi bat buoc `eventId` cho `MENTOR` va `JUDGE`.
Chua bat buoc `trackId` cho `MENTOR` hay `roundId` cho `JUDGE`, vi hien tai ban dang co `TeamAssignment` de phan cong chi tiet team/round rieng.


# Review cac thay doi Codex da tung sua cho Track update/delete

Muc dich file nay la ghi lai nhung thay doi Codex da thuc hien trong luot test truoc do, truoc khi duoc yeu cau hoan tac. Cac thay doi nay da duoc revert lai sau do. File nay khong tinh cac thay doi chi la them/xoa space, xuong dong, hoac sap xep format nho.

## Tom tat

Codex da tung sua cac file lien quan den update/delete Track de lam code compile va dung flow hon:

| STT | File | Noi dung da tung sua | Ly do sua |
| --- | --- | --- | --- |
| 1 | `src/main/java/com/seal/hackathon/service/TrackService.java` | Sua loi cu phap trong `updateTrack()` va `deleteTrack()` | Code cu khong compile duoc do dung dau `.` sai sau `findById()` va gan `Optional<Track>` vao `Track` |
| 2 | `src/main/java/com/seal/hackathon/service/TrackService.java` | Them check `request == null` trong `updateTrack()` | Neu body PATCH rong/null thi tranh `NullPointerException`, tra `BadRequestException` ro rang |
| 3 | `src/main/java/com/seal/hackathon/service/TrackService.java` | Cho phep update `description` thanh chuoi rong sau khi trim | De FE co the xoa mo ta track neu muon, thay vi bi chan bang loi blank |
| 4 | `src/main/java/com/seal/hackathon/service/TrackService.java` | Chuan hoa message delete thanh `Cannot delete track because it already has teams.` | Message ngan gon va dung tieng Anh hon |
| 5 | `src/main/java/com/seal/hackathon/controller/TrackController.java` | Don cac import bi trung lap | File co import `PreAuthorize`, `DeleteMapping`, `PatchMapping`, `PathVariable`, `RequestBody` bi lap voi wildcard import |
| 6 | `src/main/java/com/seal/hackathon/config/SecurityConfig.java` | Doi public `/api/tracks/**` thanh chi public `GET /api/tracks/**` | Tranh mo public ca `PATCH` va `DELETE`; update/delete van can `EVENT_COORDINATOR` |
| 7 | `src/test/java/com/seal/hackathon/service/TrackServiceTest.java` | Tao unit test cho update/delete Track bang Mockito | Test service logic ma khong can MySQL local |

## Chi tiet tung file

### 1. `TrackService.java`

#### Sua `updateTrack()`

Truoc khi sua, doan code co loi cu phap:

```java
Track track = trackRepo.findById(trackId).
.orElseThrow(() -> new ResourceNotFoundException("Track not found with id: " + trackId));
```

Codex da sua thanh:

```java
Track track = trackRepo.findById(trackId)
        .orElseThrow(() -> new ResourceNotFoundException("Track not found with id: " + trackId));
```

Ly do: `findById()` tra ve `Optional<Track>`, nen phai chain `.orElseThrow(...)` truc tiep sau Optional. Dau cham nam rieng sau mot dau cham khac lam Java khong compile.

Codex cung da them check:

```java
if (request == null || request.isEmpty()) {
    throw new BadRequestException("At least one field must be provided for update.");
}
```

Ly do: Neu FE gui body rong hoac body null, service nen tra loi 400 ro rang thay vi bi `NullPointerException`.

Voi `name`, Codex giu logic:

```java
if (request.getName() != null) {
    String trimmedName = request.getName().trim();
    if (trimmedName.isBlank()) {
        throw new BadRequestException("Track name must not be blank.");
    }
    track.setName(trimmedName);
}
```

Ly do: `name` la field bat buoc ve mat nghiep vu, nen neu update name thi khong duoc de blank.

Voi `description`, Codex da tung sua thanh:

```java
if (request.getDescription() != null) {
    track.setDescription(request.getDescription().trim());
}
```

Ly do: `description` co the nullable/empty. Neu FE muon xoa mo ta bang chuoi rong thi nen cho phep.

#### Sua `deleteTrack()`

Truoc khi sua, doan code co loi:

```java
Track track = trackRepo.findById(trackId);
.orElseThrow(() -> new ResourceNotFoundException("Track not found with id: " + trackId));
```

Loi o day co hai phan:

- `trackRepo.findById(trackId)` tra ve `Optional<Track>`, khong phai `Track`.
- Dong `.orElseThrow(...)` bi tach ra sau dau `;`, nen khong con chain voi Optional.

Codex da sua thanh:

```java
Track track = trackRepo.findById(trackId)
        .orElseThrow(() -> new ResourceNotFoundException("Track not found with id: " + trackId));
```

Sau do giu dung flow check team truoc khi xoa:

```java
if (teamRepo.existsByTrack_TrackId(trackId)) {
    throw new BadRequestException("Cannot delete track because it already has teams.");
}

trackRepo.delete(track);
```

Ly do: Chi hard delete track khi track chua co team nao. Neu da co team, xoa cung se gay loi khoa ngoai hoac mat du lieu lich su.

### 2. `TrackController.java`

Codex da tung don cac import bi trung:

- `PreAuthorize` bi import hai lan.
- `DeleteMapping`, `PatchMapping`, `PathVariable`, `RequestBody` da nam trong `org.springframework.web.bind.annotation.*` nhung van import rieng.

Day la thay doi ve code hygiene, khong thay doi behavior API.

### 3. `SecurityConfig.java`

Truoc khi sua:

```java
.requestMatchers("/api/tracks/**").permitAll()
```

Codex da tung sua thanh:

```java
.requestMatchers(HttpMethod.GET, "/api/tracks/**").permitAll()
```

Va them import:

```java
import org.springframework.http.HttpMethod;
```

Ly do: Neu permitAll toan bo `/api/tracks/**`, thi URL-level security dang mo public ca:

- `GET /api/tracks/{trackId}`
- `PATCH /api/tracks/{trackId}`
- `DELETE /api/tracks/{trackId}`

Du controller co `@PreAuthorize("hasRole('EVENT_COORDINATOR')")`, cau hinh ro rang hon nen chi public GET, con PATCH/DELETE khong nen public o URL-level.

### 4. `TrackServiceTest.java`

Codex da tung tao file:

```text
src/test/java/com/seal/hackathon/service/TrackServiceTest.java
```

Muc dich: test rieng `TrackService` bang Mockito, khong phu thuoc MySQL local.

Nhung test da tung them:

| Test | Muc dich |
| --- | --- |
| `updateTrack_shouldUpdateNameAndDescription` | Kiem tra update thanh cong `name` va `description` |
| `updateTrack_withEmptyBody_shouldThrowBadRequest` | Body khong co field nao thi tra `BadRequestException` |
| `updateTrack_withBlankName_shouldThrowBadRequest` | `name` blank thi khong cho update |
| `updateTrack_whenTrackNotFound_shouldThrowResourceNotFound` | Track khong ton tai thi tra 404 logic |
| `deleteTrack_withoutTeams_shouldDeleteTrack` | Track khong co team thi goi `trackRepo.delete(track)` |
| `deleteTrack_withTeams_shouldThrowBadRequestAndNotDelete` | Track da co team thi khong xoa |
| `deleteTrack_whenTrackNotFound_shouldThrowResourceNotFound` | Track khong ton tai thi khong check team, khong delete |

## Lenh da chay

Codex da chay compile bang Maven sau khi sua:

```powershell
mvn -DskipTests compile
```

Ket qua luc do: `BUILD SUCCESS`.

Sau do Codex co thu start app de test API runtime, nhung app khong start duoc do MySQL local khong ket noi duoc:

```text
Communications link failure
```

Viec nay khong phai loi cua Track update/delete, ma do moi truong DB local chua san sang hoac sai ket noi.

## Ket luan review

Nhung sua doi Codex da tung lam tap trung vao viec:

- Sua loi compile trong `TrackService.updateTrack()`.
- Sua loi compile trong `TrackService.deleteTrack()`.
- Giu flow delete dung: tim track truoc, check team sau, roi moi delete.
- Lam security ro hon: chi public GET `/api/tracks/**`, khong public PATCH/DELETE.
- Them unit test de verify logic service ma khong can DB.

Theo yeu cau sau do, cac sua doi tren da duoc hoan tac. File nay chi ghi lai lich su nhung gi Codex da tung sua, khong phai trang thai code hien tai.

# 🐞 Báo cáo Lỗi (BUG Report)

> [!NOTE]  
> Sau khi đọc kỹ toàn bộ mã nguồn của dự án (mã nguồn có thể biên dịch thành công mà không có lỗi cú pháp - `BUILD SUCCESS`), tôi đã phát hiện một số **lỗi logic tiềm ẩn** rất nghiêm trọng. Các lỗi này có thể dẫn đến crash ứng dụng (`NullPointerException`) trong quá trình vận hành, đặc biệt là ở phần xử lý logic của `HackathonEventService`.

Dưới đây là chi tiết các lỗi:

## 1. Lỗi Cú pháp (Syntax Errors)

> [!TIP]  
> **Không có lỗi cú pháp nào được tìm thấy.** Toàn bộ code compile thành công. 
> *Lưu ý nhỏ:* Có một cảnh báo (Warning) về việc sử dụng API đã Deprecated trong file `JwtAuthenticationFilter.java` (ví dụ: `new WebAuthenticationDetailsSource().buildDetails(request)`), tuy nhiên điều này không làm cản trở quá trình build hay chạy app.

---

## 2. Lỗi Logic (Logic Errors)

### 2.1. Lỗi `NullPointerException` (NPE) tại `HackathonEventService.validateEventRules`

> [!CAUTION]  
> **File:** [HackathonEventService.java](file:///d:/FPT%20Uni/k%C3%AC%205/test/seal-hackathon-system/back-end/src/seal-api/src/main/java/com/seal/hackathon/service/HackathonEventService.java#L141-L149) (Dòng 141)  
> **Chi tiết lỗi:** Đoạn code hiện tại thực hiện gọi `.toUpperCase()` trên `event.getSeason()` **trước khi** kiểm tra xem nó có `null` hay không. Điều này sẽ ném ra NPE nếu `getSeason()` trả về `null`.

```java
// 4. Validate and normalize season
String normalizedSeason = event.getSeason().toUpperCase(); // <-- NPE ném ra ở đây nếu getSeason() trả về null
if (event.getSeason() != null) {
    // ...
}
```

**✅ Cách khắc phục:** Di chuyển dòng khởi tạo `normalizedSeason` vào bên trong block `if (event.getSeason() != null)`:

```diff
- String normalizedSeason = event.getSeason().toUpperCase();
  if (event.getSeason() != null) {
+     String normalizedSeason = event.getSeason().toUpperCase();
      if (!normalizedSeason.equals("SPRING") && !normalizedSeason.equals("FALL") && !normalizedSeason.equals("SUMMER")) {
          throw new BadRequestException("Invalid season. Allowed values are SPRING, SUMMER and FALL.");
      }
      event.setSeason(normalizedSeason);
  }
```

### 2.2. Lỗi NPE khi kiểm tra `normalizedSeason` với `startMonth`

> [!WARNING]  
> **File:** [HackathonEventService.java](file:///d:/FPT%20Uni/k%C3%AC%205/test/seal-hackathon-system/back-end/src/seal-api/src/main/java/com/seal/hackathon/service/HackathonEventService.java#L152-L155) (Dòng 154)  
> **Chi tiết lỗi:** Nếu bạn đã sửa lỗi 2.1 bằng cách kiểm tra `null`, thì biến `normalizedSeason` sẽ không được khởi tạo (hoặc bị `null`). Khi đó, lời gọi `.equals()` trực tiếp trên `normalizedSeason` sẽ gây ra `NullPointerException`.

```java
int startMonth = event.getStartDate().getMonthValue();
boolean isMatch = false;
if (normalizedSeason.equals("SPRING") && startMonth >= 1 && startMonth <= 4)
```

**✅ Cách khắc phục:** Đảo ngược chuỗi để tránh NPE, hoặc bọc trong khối kiểm tra `null`:

```diff
- if (normalizedSeason.equals("SPRING") && startMonth >= 1 && startMonth <= 4)
+ if ("SPRING".equals(normalizedSeason) && startMonth >= 1 && startMonth <= 4)
```

### 2.3. Lỗi NPE tại hàm `updateHackathonEvent` (Kiểm tra Status)

> [!WARNING]  
> **File:** [HackathonEventService.java](file:///d:/FPT%20Uni/k%C3%AC%205/test/seal-hackathon-system/back-end/src/seal-api/src/main/java/com/seal/hackathon/service/HackathonEventService.java#L189-L193) (Dòng 190)  
> **Chi tiết lỗi:** Trong quá trình Partial Update bằng PATCH, nếu dữ liệu trong Database bị sai sót khiến `status` của Event là `null`, hàm sẽ Crash vì gọi `.toUpperCase()` trên object `null`.

```java
if (request.getYear() != null && !request.getYear().equals(event.getYear())) {
    if (!"DRAFT".equals(event.getStatus().toUpperCase())) { // <-- NPE nếu event.getStatus() bị null
        throw new BadRequestException("Year cannot be changed after event is published");
    }
}
```

**✅ Cách khắc phục:** Dùng `equalsIgnoreCase` để xử lý `null` một cách an toàn mà không bị crash.

```diff
- if (!"DRAFT".equals(event.getStatus().toUpperCase())) {
+ if (!"DRAFT".equalsIgnoreCase(event.getStatus())) {
```

### 2.4. Vấn đề thiết kế validation tại `TrackService.updateTrack`

> [!IMPORTANT]  
> **File:** [TrackService.java](file:///d:/FPT%20Uni/k%C3%AC%205/test/seal-hackathon-system/back-end/src/seal-api/src/main/java/com/seal/hackathon/service/TrackService.java#L76-L78) (Dòng 76)  
> Tuy code có đoạn bắt lỗi update rỗng: `if (request.isEmpty()) { throw new BadRequestException(...) }`. Tuy nhiên trong class `UpdateTrackRequest.java` hàm `isEmpty()` được đánh dấu `@JsonIgnore`. Việc kiểm tra rỗng này là hợp lý, nhưng hãy cẩn thận khi sử dụng `@Valid` ở Controller nếu sau này bạn định thêm Annotation vào DTO, bởi vì việc update từng phần (PATCH) có thể sẽ bị chặn lại bởi các config validate chặt chẽ.

---

> [!NOTE]  
> **Tổng kết:** Dự án hoàn toàn không có lỗi về mặt cú pháp biên dịch, nhưng hệ thống xử lý API chứa các lỗi rủi ro về NPE (`NullPointerException`) rất rõ rệt ở service xử lý nghiệp vụ của `HackathonEvent`. Việc gọi `.toUpperCase()` một cách trực tiếp mà không check null trước là lý do chính gây ra các lỗi tiềm ẩn này.

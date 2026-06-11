# Báo cáo tổng kết triển khai CRUD cho module Track (AI_LOG_TrackCRUD)

## 1. Tổng quan CRUD Track
Thực thể `Track` trong hệ thống hiện tại bao gồm các thuộc tính sau:
- `trackId` (Integer): Khóa chính tự tăng.
- `eventId` (Integer): ID của sự kiện Hackathon mà Track này thuộc về (thông qua relation ManyToOne với `HackathonEvent`).
- `name` (String): Tên của Track (bắt buộc).
- `description` (String): Mô tả chi tiết về Track.
- `createdAt` (LocalDateTime): Thời gian tạo Track.

**Đặc biệt lưu ý**, thiết kế hiện tại của Track **không** có các trường sau (để giữ thiết kế tối giản và tuân thủ chặt chẽ DB schema hiện tại):
- Không có `maxTeams`.
- Không có `status`.
- Không có `empty` (đây chỉ là hàm phụ trợ trong DTO).
- Không có `isDeleted` (sử dụng cơ chế hard delete thay vì soft delete).

## 2. Danh sách API Track đã làm
Dưới đây là danh sách toàn bộ 5 API quản lý Track đã được triển khai:

| Method | Endpoint | Chức năng | Request body | Response | Phân quyền (Ai được gọi) |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/events/{eventId}/tracks` | Lấy danh sách Tracks của một Event | (Trống) | `ApiResponse<List<TrackResponse>>` | Tham chiếu theo SecurityConfig |
| `POST` | `/api/events/{eventId}/tracks` | Tạo mới Track cho một Event | `CreateTrackRequest` | `ApiResponse<TrackResponse>` | `EVENT_COORDINATOR` |
| `GET` | `/api/tracks/{trackId}` | Lấy thông tin chi tiết một Track | (Trống) | `ApiResponse<TrackResponse>` | Tham chiếu theo SecurityConfig |
| `PATCH` | `/api/tracks/{trackId}` | Cập nhật thông tin Track | `UpdateTrackRequest` | `ApiResponse<TrackResponse>` | `EVENT_COORDINATOR` |
| `DELETE`| `/api/tracks/{trackId}` | Xóa cứng một Track | (Trống) | `ApiResponse<Void>` | `EVENT_COORDINATOR` |

## 3. File đã tạo hoặc chỉnh sửa

| File | Loại | Vai trò | Nội dung chính |
| --- | --- | --- | --- |
| `UpdateTrackRequest.java` | Tạo mới | DTO | Định nghĩa payload cho API PATCH update Track. Chỉ chứa `name` và `description`. Cung cấp helper method `isEmpty()`. |
| `TeamRepository.java` | Chỉnh sửa | Repository | Cung cấp giao tiếp với bảng Team trong Database. | Thêm method `existsByTrack_TrackId(Integer trackId)` để kiểm tra xem Track đã có đội đăng ký chưa. |
| `TrackService.java` | Chỉnh sửa | Service | Xử lý logic nghiệp vụ lõi (Business logic) của Track. | Implement thêm `updateTrack()` và `deleteTrack()`. Inject `TeamRepository` để check logic trước khi xóa. |
| `TrackController.java` | Chỉnh sửa | Controller | Tiếp nhận HTTP Request và điều phối luồng xử lý. | Thêm 2 endpoints `@PatchMapping` và `@DeleteMapping`. Định nghĩa bảo mật bằng `@PreAuthorize("hasRole('EVENT_COORDINATOR')")`. |

## 4. Flow từng API
Luồng xử lý chung của các API từ Controller -> Service -> Repository -> Response:

- **Create Track (`POST /api/events/{eventId}/tracks`)**:
  - FE gửi request chứa `eventId` (trên URL) và body là `CreateTrackRequest`.
  - Controller tiếp nhận, gọi `trackService.createTrack(eventId, request)`.
  - Service gọi `eventRepo.findById(eventId)` để kiểm tra Event tồn tại, nếu không ném lỗi 404.
  - Khởi tạo Entity `Track` mới, gán event, name (đã trim) và description.
  - Gọi `trackRepo.save(track)` để lưu xuống DB.
  - Gọi hàm helper `mapToResponse(track, event)` để map sang `TrackResponse`.
  - Controller bọc kết quả vào `ApiResponse.success` trả về mã 201 CREATED.

- **List Tracks (`GET /api/events/{eventId}/tracks`)**:
  - FE gọi API kèm `eventId` trên URL.
  - Service kiểm tra Event tồn tại qua `eventRepo.findById(eventId)`.
  - Gọi `trackRepo.findAllByEvent_EventIdOrderByCreatedAtDesc(eventId)` để lấy danh sách.
  - Dùng Stream API lặp qua các Track, gọi `mapToResponse` chuyển sang DTO.
  - Controller trả về danh sách `List<TrackResponse>` với HTTP 200 OK.

- **Get Detail (`GET /api/tracks/{trackId}`)**:
  - FE truyền `trackId` qua URL.
  - Service tìm Track bằng `trackRepo.findById(trackId)`. Ném lỗi 404 nếu không thấy.
  - Gọi `mapToResponse` và trả về `TrackResponse`.
  - Controller bọc bằng `ApiResponse.success` và trả về.

- **Update Track (`PATCH /api/tracks/{trackId}`)**:
  - FE truyền `trackId` và JSON body chỉ chứa các trường cần sửa.
  - Controller gọi `trackService.updateTrack(trackId, request)`.
  - Service kiểm tra Track tồn tại bằng `trackRepo.findById(trackId)`.
  - Kiểm tra nếu Request không có trường nào (`request.isEmpty()`) thì ném lỗi 400.
  - Nếu `name` khác null: Thực hiện trim khoảng trắng, check blank. Nếu trống ném lỗi 400. Nếu hợp lệ, gọi `track.setName()`.
  - Nếu `description` khác null: Thực hiện trim và gán thẳng bằng `track.setDescription()`. Việc này cho phép cập nhật thành string rỗng khi người dùng muốn xóa mô tả.
  - `trackRepo.save(track)` và map sang `TrackResponse` trả về.

- **Delete Track (`DELETE /api/tracks/{trackId}`)**:
  - FE truyền `trackId` qua URL.
  - Controller gọi `trackService.deleteTrack(trackId)`.
  - Service lấy Track từ DB, nếu không có ném 404.
  - Gọi `teamRepo.existsByTrack_TrackId(trackId)`. Nếu bằng `true` (Track đã có Team tham gia), ném lỗi 400 BadRequest để chặn.
  - Nếu `false`, tiến hành xóa cứng qua `trackRepo.delete(track)`.
  - Controller trả về kết quả thành công.

## 5. Giải thích Update Track
Logic nghiệp vụ của hàm Update (PATCH) được thiết kế có chủ đích nhằm thắt chặt tính nhất quán dữ liệu:
- **Vì sao chỉ update `name` và `description`**: Thông tin cơ bản của Track chỉ bao gồm tên và mô tả. Đây là 2 thuộc tính duy nhất an toàn để người điều phối (Coordinator) thay đổi mà không gây xáo trộn tổ chức thi đấu.
- **Vì sao không update `eventId`**: Việc chuyển một Track từ Event này sang Event khác là một thao tác rủi ro và có khả năng phá vỡ kiến trúc ràng buộc dữ liệu (các Teams thuộc về Event hiện tại sẽ bị lỗi nếu Track của họ nhảy sang Event khác).
- **Vì sao không update `trackId`**: Khóa chính do DB tự động sinh (`IDENTITY`), mang tính bất biến.
- **Vì sao không update `createdAt`**: Đây là timestamp ghi lại lịch sử tạo trên hệ thống, dùng để sắp xếp/audit, tuyệt đối không được phép chỉnh sửa.
- **Vì sao cần check request rỗng**: Vì API là PATCH (Partial Update), FE có thể gửi body hoàn toàn trống `{}`. Hàm `isEmpty()` giúp chặn từ xa và báo lỗi `BadRequestException("At least one field must be provided for update.")` thay vì để DB chạy lệnh lưu dữ liệu vô nghĩa.
- **Xử lý field `empty` trên Swagger**: Hàm helper `public boolean isEmpty()` trong Request DTO vô tình bị Swagger/Jackson nhận diện thành một thuộc tính tên là `empty`. Hiện tượng này đã được sửa lỗi dứt điểm bằng cách thêm `@JsonIgnore` và `@Schema(hidden = true)`.

## 6. Giải thích Delete Track
Quyết định kiến trúc cho phần Delete Track:
- **Đang là Hard Delete**: Bản ghi Track sẽ bị xóa vật lý hoàn toàn khỏi Database.
- **Vì sao không thêm cột `empty`/`status`/`isDeleted`**: Database schema hiện tại không có các cột này, và thiết kế đang ưu tiên sự tinh gọn. Việc tự ý thêm cột trạng thái vào sẽ phá vỡ quy ước cấu trúc DB chung của dự án ở giai đoạn này.
- **Vì sao cần `TeamRepository.existsByTrack_TrackId(trackId)`**: Theo luồng nghiệp vụ thực tế, Track là hạng mục thi đấu. Nếu Track đã có bất kỳ Team nào đăng ký tham gia (mapping ở bảng `Team`), hệ thống tuyệt đối không được cho phép xóa để bảo toàn tính toàn vẹn dữ liệu (Data Integrity). Do đó bắt buộc phải check thông qua Repository của Team trước khi thực hiện xóa cứng.

## 7. Các validation đã làm
Hệ thống sử dụng các tầng validation nghiêm ngặt:
- Tên Track (`name`) không được để blank khi Create.
- Tên Track (`name`) không được để blank nếu có truyền lên khi Update (sử dụng logic `trim()` và `isBlank()` trong `TrackService`).
- Sự kiện (`eventId`) bắt buộc phải tồn tại khi tạo Track.
- Bản thân Track bắt buộc phải tồn tại (`findById() -> orElseThrow`) khi thực hiện xem chi tiết, cập nhật hoặc xóa.
- Tuyệt đối không được Delete track nếu `existsByTrack_TrackId()` trả về `true`.

## 8. Security
Các endpoint được phân quyền rõ ràng qua Spring Security:
- **Cần `EVENT_COORDINATOR`**: Tất cả các thao tác thay đổi dữ liệu Track (POST, PATCH, DELETE) đều bị khóa chặt bằng annotation `@PreAuthorize("hasRole('EVENT_COORDINATOR')")`. Chức năng này chỉ dành riêng cho BTC hoặc người quản lý sự kiện.
- Đối với API lấy dữ liệu (GET), hệ thống không mở public toàn bộ ở Controller mà đang tuân theo quy tắc bảo mật chung đã được cài đặt sẵn trong `SecurityConfig` của dự án.

## 9. Những quyết định thiết kế đã thống nhất
- **Quy ước đặt tên (Naming Convention)**: Database giữ nguyên chuẩn `snake_case` (ví dụ: `event_id`, `track_id`). Nhưng toàn bộ các tầng Java (DTO, Controller) và API trả về FE qua Swagger đều bắt buộc đồng bộ sử dụng `camelCase` (`eventId`, `trackId`). Tuyệt đối không trộn lẫn `snake_case` ở phía Java/API.
- **Sự tối giản của Track**: Quyết định không nhồi nhét thuộc tính `maxTeams` cho Track vì Database chưa thiết kế cột đó, thay vào đó logic số lượng có thể được quản lý tập trung ở cấp độ `HackathonEvent`.
- **Cơ chế Delete**: Lựa chọn chiến lược **Hard Delete có điều kiện chặn (Conditionally Blocked Hard Delete)** thay cho Soft Delete. Đây là giải pháp phù hợp nhất hiện tại để giữ database sạch sẽ mà vẫn bảo vệ an toàn cho dữ liệu Team.

## 10. Những lỗi hoặc vấn đề từng gặp
Trong quá trình triển khai, đã phát sinh và khắc phục các vấn đề sau:
- **Lỗi hiển thị Swagger (Field `empty`)**: Việc định nghĩa method `isEmpty()` trong Request DTO làm Jackson/Swagger tự động gen ra thuộc tính thừa là `empty` trên tài liệu API. Vấn đề này đã được fix hoàn toàn bằng cặp annotation `@JsonIgnore` và `@Schema(hidden = true)`.
- **Lỗi cú pháp (Syntax Error) do gõ nhầm**: Quá trình gõ code có gặp lỗi chain Optional sai do thừa dấu chấm (`.`) và ngắt câu sai vị trí (`findById;`). Đã được review và sửa lại chuẩn xác (`trackRepo.findById().orElseThrow()`).
- **Lỗi logic khi cập nhật description**: Logic ban đầu áp dụng `.isBlank()` cho trường description khiến việc xóa mô tả bằng chuỗi rỗng bị báo lỗi. Lỗi này đã được điều chỉnh thành công để cho phép gán thẳng chuỗi rỗng `trim()` nếu cần.

## 11. Kết luận
- **Trạng thái hiện tại**: Module CRUD của Track đã hoàn thành và bao phủ đầy đủ **5 thao tác API cốt lõi** (Create, List, Detail, Update, Delete) tuân thủ hoàn toàn nghiệp vụ và kiến trúc chung của toàn dự án.
- **Phần đã ổn định**: Logic kiểm tra điều kiện xóa dựa trên Team, phân quyền theo Role, cấu trúc DTO đầu vào/đầu ra, và xử lý Exception. Quá trình biên dịch mã nguồn (Compile) đã thành công.
- **Việc cần làm tiếp theo**: Test trực tiếp thông qua Swagger UI hoặc Postman để đảm bảo luồng hoạt động mượt mà (chú trọng test case chặn xóa Track khi đã có Team, chặn update name bằng chuỗi rỗng), sau đó có thể tích hợp với Frontend. Các API nâng cao hơn sẽ được xem xét phát triển ở giai đoạn sau nếu có yêu cầu nghiệp vụ mới.

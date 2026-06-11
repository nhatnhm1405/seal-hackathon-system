# Nhật ký triển khai CRUD cho Hackathon Event (AI_LOG_EventCRUD)

Tài liệu này ghi nhận lại toàn bộ quá trình giao tiếp, phân tích và lập trình để xây dựng các chức năng CRUD cho thực thể `HackathonEvent` trong dự án Hệ thống quản lý Hackathon.

## 1. Yêu cầu ban đầu
Người dùng yêu cầu thực hiện lần lượt các chức năng quản lý sự kiện (Event CRUD) với các điều kiện nghiệp vụ thực tế cực kỳ chặt chẽ:
- **Khởi đầu:** Đề xuất bắt đầu từ chức năng `Read All/List` (Lấy danh sách) để làm quen với luồng dữ liệu, sau đó chuyển sang lấy chi tiết một sự kiện (`GET /api/events/{eventId}`).
- **Create Event:** FE sẽ gửi thông tin (không kèm ID), hệ thống tự sinh ID. Cần validation các ngày tháng (Registration Start < Registration End < Start Date < End Date). Người tạo phải có quyền `EVENT_COORDINATOR`. Trạng thái mặc định là `DRAFT`.
- **Update Event (PATCH):** FE chỉ gửi các trường cần update (Partial Update). Yêu cầu thêm các validation phức tạp dùng chung cho cả Create và Update:
    - Bắt buộc các mốc thời gian nằm trong cùng một năm (`year`) của sự kiện.
    - Không cho phép nhập ngày trong quá khứ so với thời gian của server (Realtime/Past date check). Đối với Update, chỉ check các mốc thời gian *thực sự được sửa*.
    - Validate `Season` phải khớp với tháng của `Start Date` (SPRING, SUMMER, FALL).
    - Validate `Status` theo danh sách cho phép.
    - Không cho phép cập nhật `Year` nếu sự kiện không còn ở trạng thái `DRAFT`.

## 2. Các bước phân tích trước khi code
- **Logic List Event:** Tư vấn sử dụng cơ chế Phân trang (Pagination) để tránh quá tải server. Đối với Public View, đề xuất chỉ lấy các sự kiện đang `OPEN` hoặc `IN_COMING` thay vì lấy toàn bộ.
- **DTO Design:** 
    - Đề xuất tạo `CreateEventRequest` chứa các annotation `@NotNull`, `@NotBlank` để ép buộc FE gửi đủ dữ liệu khi tạo mới.
    - Đề xuất tạo riêng `UpdateEventRequest` cho hàm PATCH, không chứa `@NotNull` để cho phép cập nhật một phần.
- **Centralized Validation:** Phân tích thấy logic kiểm tra ngày tháng quá cồng kềnh, đề xuất rút trích toàn bộ logic vào một helper method `validateEventRules()` dùng chung để tránh duplicate code giữa luồng Create và Update.
- **Security/Auth:** Thống nhất sử dụng `@PreAuthorize("hasRole('EVENT_COORDINATOR')")` và lấy thông tin người dùng từ `SecurityContextHolder` qua `UserPrincipal` để gán vào thuộc tính `createdBy`.

## 3. Các file đã tạo mới và chỉnh sửa
- **[Tạo mới]** `com/seal/hackathon/dto/request/CreateEventRequest.java`
- **[Tạo mới]** `com/seal/hackathon/dto/request/UpdateEventRequest.java`
- **[Chỉnh sửa]** `com/seal/hackathon/service/HackathonEventService.java`
- **[Chỉnh sửa]** `com/seal/hackathon/controller/HackathonEventController.java`

## 4. Các chức năng Event CRUD đã implement
- **Read/List Event:** Đã thảo luận về logic phân trang và filter status, cấu trúc cơ bản đã có sẵn.
- **Get Event Detail:** Hoàn tất. Lấy thông tin dựa vào `eventId`, ném lỗi 404 nếu không tìm thấy.
- **Create Event:** Hoàn tất. Lưu sự kiện mới với các quy tắc validation nghiệm ngặt. Tự động lấy `userId` của người gọi API làm người tạo (`createdBy`).
- **Update Event (PATCH):** Hoàn tất. Cho phép cập nhật từng phần, có cơ chế merge dữ liệu cũ-mới trước khi chạy qua helper validation chung.
- **Delete Event:** Chờ người dùng quyết định (Chưa implement).

## 5. API Endpoints và Thành phần liên quan
- `GET /api/events` (Đã có sẵn framework)
- `GET /api/events/{eventId}`: Endpoint xem chi tiết.
- `POST /api/events`: Endpoint tạo mới, nhận payload `CreateEventRequest`.
- `PATCH /api/events/{eventId}/update`: Endpoint cập nhật, nhận payload `UpdateEventRequest`.
- **Repository:** Gọi lệnh `findById` trên `HackathonEventRepository` và `UserRepository`.
- **Response:** Dùng chung chuẩn `ApiResponse` wrap `HackathonEventResponse`.

## 6. Thay đổi về Validation logic
Hàm `validateEventRules()` được tạo ra trong Service xử lý triệt để các rule sau:
1. `Registration Start < Registration End < Start Date < End Date`.
2. Kiểm tra `getYear()` của 4 mốc thời gian phải khớp với giá trị `year` của sự kiện.
3. Check `isBefore(LocalDateTime.now())` (tùy thuộc vào cờ boolean để chỉ check các trường được gửi lên trong Update).
4. Chuẩn hóa `Season` (UPPERCASE) và so sánh khoảng tháng của `Start Date`.
5. Chuẩn hóa `Status` (UPPERCASE) và validate giá trị hợp lệ.

## 7. Các lỗi đã gặp và cách xử lý
- **Lỗi 1 (Scope Biến):** `normalizedSeason cannot be resolved`.
    - *Nguyên nhân:* Biến `normalizedSeason` được khai báo bên trong khối `if(event.getSeason() != null)`, nhưng lại được mang ra ngoài sử dụng để so sánh tháng.
    - *Xử lý:* Đưa toàn bộ logic kiểm tra tháng vào chung một khối `if` kiểm tra Season.
- **Lỗi 2 (NullPointerException):**
    - *Nguyên nhân:* Gọi `event.getSeason().toUpperCase()` ngay trên đầu đoạn code mà chưa kiểm tra `event.getSeason() != null`. Ở luồng Update, nếu FE không gửi Season thì gọi hàm này sẽ gây chết hệ thống.
    - *Xử lý:* Đẩy hàm `.toUpperCase()` vào lại bên trong khối `if(event.getSeason() != null)`.
- **Lỗi 3 (Typo Method Name):**
    - *Nguyên nhân:* Định nghĩa hàm là `validateEventRule` nhưng lại gọi bằng lệnh `validateEventRules`.
    - *Xử lý:* Sửa tên hàm định nghĩa bằng cách thêm chữ `s`.

## 8. Lệnh đã chạy để test
- Lệnh: `.\mvnw clean compile`
- Kết quả: **BUILD SUCCESS**. Toàn bộ code không gặp lỗi cú pháp hay thiếu import nào, đảm bảo an toàn về mặt biên dịch (Type-safe).

## 9. Tóm tắt trạng thái hiện tại
- **Đã hoàn thành:** Logic Create, Update (PATCH) và Get Detail, tích hợp hoàn chỉnh Validation Helper. Code compile thành công.
- **Chưa hoàn thành:** Chức năng Delete (Xóa sự kiện).
- **Cần làm tiếp:** Tiến hành gọi thử các API từ Frontend (hoặc Postman) với các kịch bản đúng/sai để kiểm chứng lại các logic validation đang hoạt động hoàn hảo trên thực tế.

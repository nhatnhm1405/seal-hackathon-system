package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.RegisterRequest;
import com.seal.hackathon.dto.response.AuthResponse;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class AuthServiceTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void testRegister_Success() {
        // 1. Chuẩn bị dữ liệu đầu vào sử dụng Setters
        RegisterRequest request = new RegisterRequest();
        request.setEmail("testrunner@gmail.com");
        request.setPassword("password123");
        request.setFullName("Test Runner User");
        request.setUserType("FPT_STUDENT");
        request.setStudentId("SE123456");

        // 2. Gọi trực tiếp hàm xử lý trong Service
        AuthResponse response = authService.register(request);

        // 3. Xác thực kết quả trả về
        assertNotNull(response);
        assertNotNull(response.getUserId());
        assertEquals("testrunner@gmail.com", response.getEmail());
        assertEquals("Test Runner User", response.getFullName());
        assertTrue(response.getMessage().contains("successful"));

        // 4. Kiểm tra chéo xem dữ liệu đã được ghi vào Database chưa
        boolean exists = userRepository.existsByEmail("testrunner@gmail.com");
        assertTrue(exists, "User đáng lẽ phải được lưu vào Database");
    }

    @Test
    void testRegister_DuplicateEmail_ShouldThrowException() {
        // 1. Tạo trước 1 tài khoản trùng email
        RegisterRequest firstRequest = new RegisterRequest();
        firstRequest.setEmail("duplicate@gmail.com");
        firstRequest.setPassword("password123");
        firstRequest.setFullName("User One");
        firstRequest.setUserType("STAFF");
        authService.register(firstRequest);

        // 2. Chuẩn bị request thứ hai với email trùng
        RegisterRequest secondRequest = new RegisterRequest();
        secondRequest.setEmail("duplicate@gmail.com"); // Trùng email
        secondRequest.setPassword("password999");
        secondRequest.setFullName("User Two");
        secondRequest.setUserType("STAFF");

        // 3. Kiểm tra xem hệ thống có quăng ra lỗi BadRequestException như mong đợi hay
        // không
        assertThrows(BadRequestException.class, () -> {
            authService.register(secondRequest);
        }, "Same email");
    }
}

package com.seal.hackathon.controller;

import com.seal.hackathon.dto.request.LoginRequest;
import com.seal.hackathon.dto.request.RegisterRequest;
import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.AuthResponse;
import com.seal.hackathon.dto.response.UserResponse;
import com.seal.hackathon.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/auth/register
     * Public. Creates a new account pending coordinator approval.
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Registration successful. Please await approval.", response));
    }

    /**
     * POST /api/auth/login
     * Public. Returns a JWT on success.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful.", response));
    }

    /**
     * GET /api/auth/me
     * Requires valid JWT. Returns the current user's profile.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(Authentication authentication) {
        String email = ((UserDetails) authentication.getPrincipal()).getUsername();
        UserResponse user = authService.getCurrentUser(email);
        return ResponseEntity.ok(ApiResponse.success("User profile retrieved.", user));
    }

    /**
     * POST /api/auth/logout
     * JWT is stateless — logout is handled client-side by discarding the token.
     * This endpoint exists so the frontend has a consistent pattern to call.
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<?>> logout() {
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully. Please discard your token."));
    }
}

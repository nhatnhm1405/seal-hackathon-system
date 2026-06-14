package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.LoginRequest;
import com.seal.hackathon.dto.request.RegisterRequest;
import com.seal.hackathon.dto.response.AuthResponse;
import com.seal.hackathon.dto.response.UserResponse;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ForbiddenException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.exception.UnauthorizedException;
import com.seal.hackathon.repository.UserRepository;
import com.seal.hackathon.security.JwtService;
import com.seal.hackathon.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    // ---------------------------------------------------------------
    // Register
    // ---------------------------------------------------------------

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // 1. Email uniqueness
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("An account with this email already exists.");
        }

        // 2. UserType-specific field validation
        validateUserTypeFields(request);

        // 3. Create and save the User.
        // No role assignment here — participants are identified by user_type.
        // Staff roles (COORDINATOR, MENTOR, JUDGE) are assigned later by a coordinator
        // via UserEventRole.
        User user = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .userType(request.getUserType().toUpperCase())
                .studentId(request.getStudentId())
                .university(request.getUniversity())
                .isApproved(false)
                .isActive(true)
                .provider("LOCAL")
                .build();

        user = userRepository.save(user);

        return AuthResponse.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .message("Registration successful. Please wait for an Event Coordinator to approve your account.")
                .build();
    }

    // ---------------------------------------------------------------
    // Login
    // ---------------------------------------------------------------

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        // 1. Find user by email
        User user = userRepository.findByEmailWithRoles(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password."));

        // 2. Check password
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password.");
        }

        // 3. Check is_active
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ForbiddenException("Your account has been deactivated. Please contact an administrator.");
        }

        // 4. Check is_approved
        if (!Boolean.TRUE.equals(user.getIsApproved())) {
            throw new ForbiddenException(
                    "Your account is pending approval. Please wait for an Event Coordinator to review your registration.");
        }

        // 5. Generate JWT
        UserPrincipal principal = new UserPrincipal(user);
        List<String> roles = principal.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .collect(Collectors.toList());

        String token = jwtService.generateToken(principal, user.getUserId(), roles);

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getUserId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .roles(roles)
                .message("Login successful.")
                .build();
    }

    // ---------------------------------------------------------------
    // Get current user info (for /api/auth/me)
    // ---------------------------------------------------------------

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmailWithRoles(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        return mapToUserResponse(user);
    }

    /** A user patches their own profile (fullName / studentId / university). */
    @Transactional
    public UserResponse updateOwnProfile(String email, com.seal.hackathon.dto.request.UpdateProfileRequest request) {
        User user = userRepository.findByEmailWithRoles(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getStudentId() != null) {
            user.setStudentId(request.getStudentId().isBlank() ? null : request.getStudentId().trim());
        }
        if (request.getUniversity() != null) {
            user.setUniversity(request.getUniversity().isBlank() ? null : request.getUniversity().trim());
        }
        userRepository.save(user);
        return mapToUserResponse(user);
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private void validateUserTypeFields(RegisterRequest request) {
        String userType = request.getUserType().toUpperCase();
        switch (userType) {
            case "FPT_STUDENT" -> {
                if (request.getStudentId() == null || request.getStudentId().isBlank()) {
                    throw new BadRequestException("Student ID is required for FPT students.");
                }
            }
            case "EXTERNAL_STUDENT" -> {
                if (request.getStudentId() == null || request.getStudentId().isBlank()) {
                    throw new BadRequestException("Student ID is required for external students.");
                }
                if (request.getUniversity() == null || request.getUniversity().isBlank()) {
                    throw new BadRequestException("University name is required for external students.");
                }
            }
            case "STAFF" -> {
                // No extra required fields for staff (coordinators, mentors, judges)
            }
            default -> throw new BadRequestException(
                    "Invalid user type: " + request.getUserType() +
                            ". Must be one of: FPT_STUDENT, EXTERNAL_STUDENT, STAFF.");
        }
    }

    public UserResponse mapToUserResponse(User user) {
        List<String> roles = user.getUserEventRoles().stream()
                .map(uer -> uer.getRole().getRoleName())
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        return UserResponse.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .userType(user.getUserType())
                .studentId(user.getStudentId())
                .university(user.getUniversity())
                .judgeType(user.getJudgeType())
                .isApproved(user.getIsApproved())
                .isActive(user.getIsActive())
                .expiredAt(user.getExpiredAt())
                .provider(user.getProvider())
                .avatarUrl(user.getAvatarUrl())
                .roles(roles)
                .createdAt(user.getCreatedAt())
                .build();
    }
}

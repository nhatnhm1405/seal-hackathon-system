package com.seal.hackathon.controller;

import com.seal.hackathon.dto.request.AssignRoleRequest;
import com.seal.hackathon.dto.request.CreateStaffRequest;
import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.UserResponse;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.UserRepository;
import com.seal.hackathon.service.AccountApprovalService;
import com.seal.hackathon.service.AuthService;
import com.seal.hackathon.service.UserRoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final AccountApprovalService approvalService;
    private final UserRoleService userRoleService;

    /**
     * POST /api/users/staff
     * Coordinator creates a staff account (guest judge, mentor, or another coordinator).
     * The account is pre-approved and the role is assigned in one step.
     * Covers requirements §6.5: coordinator creates temporary accounts for guest judges.
     */
    @PostMapping("/staff")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<UserResponse>> createStaffAccount(
            @Valid @RequestBody CreateStaffRequest request,
            Authentication authentication
    ) {
        UserResponse user = userRoleService.createStaffAccount(request, authentication);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Staff account created successfully.", user));
    }

    /**
     * GET /api/users
     * Returns all users. EVENT_COORDINATOR only.
     */
    @GetMapping
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
        List<UserResponse> users = userRepository.findAll().stream()
                .map(authService::mapToUserResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Users retrieved.", users));
    }

    /**
     * GET /api/users/{id}
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable Integer id) {
        UserResponse user = userRepository.findByIdWithRoles(id)
                .map(authService::mapToUserResponse)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        return ResponseEntity.ok(ApiResponse.success("User retrieved.", user));
    }

    /**
     * PUT /api/users/{id}/activate
     * Re-activates a previously deactivated/rejected account.
     */
    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<UserResponse>> activateUser(@PathVariable Integer id) {
        UserResponse user = approvalService.activateUser(id);
        return ResponseEntity.ok(ApiResponse.success("User activated.", user));
    }

    /**
     * PUT /api/users/{id}/deactivate
     */
    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<UserResponse>> deactivateUser(@PathVariable Integer id) {
        UserResponse user = approvalService.deactivateUser(id);
        return ResponseEntity.ok(ApiResponse.success("User deactivated.", user));
    }

    /**
     * POST /api/users/{id}/roles
     * Assigns a role to a user. Can be scoped to event/track/round.
     *
     * Example request body:
     * {
     *   "roleName": "JUDGE",
     *   "eventId": 1,
     *   "roundId": 2,
     *   "judgeType": "INTERNAL"
     * }
     */
    @PostMapping("/{id}/roles")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<UserResponse>> assignRole(
            @PathVariable Integer id,
            @Valid @RequestBody AssignRoleRequest request,
            Authentication authentication
    ) {
        UserResponse user = userRoleService.assignRole(id, request, authentication);
        return ResponseEntity.ok(ApiResponse.success("Role assigned successfully.", user));
    }
}

package com.seal.hackathon.controller;

import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.UserResponse;
import com.seal.hackathon.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Account approval endpoints — only accessible by EVENT_COORDINATOR.
 * Security is enforced both at the path level (SecurityConfig) and method level (@PreAuthorize).
 */
@RestController
@RequestMapping("/api/account-approvals")
@RequiredArgsConstructor
public class AccountApprovalController {

    private final AccountService approvalService;

    /**
     * GET /api/account-approvals/pending
     * Lists all users who have registered but not yet been approved or rejected.
     */
    @GetMapping("/pending")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getPendingApprovals() {
        List<UserResponse> pending = approvalService.getPendingApprovals();
        return ResponseEntity.ok(ApiResponse.success("Pending approvals retrieved.", pending));
    }

    /**
     * PUT /api/account-approvals/{userId}/approve
     * Sets is_approved = true so the user can log in.
     */
    @PutMapping("/{userId}/approve")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<UserResponse>> approveUser(@PathVariable Integer userId) {
        UserResponse user = approvalService.approveUser(userId);
        return ResponseEntity.ok(ApiResponse.success("User approved successfully.", user));
    }

    /**
     * PUT /api/account-approvals/{userId}/reject
     * Sets is_approved = false and is_active = false.
     * The user cannot log in and will not appear in pending list again.
     */
    @PutMapping("/{userId}/reject")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<UserResponse>> rejectUser(@PathVariable Integer userId) {
        UserResponse user = approvalService.rejectUser(userId);
        return ResponseEntity.ok(ApiResponse.success("User rejected and account deactivated.", user));
    }
}

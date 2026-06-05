package com.seal.hackathon.controller;

import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.JudgeAssignmentResponse;
import com.seal.hackathon.dto.response.MentorAssignmentResponse;
import com.seal.hackathon.security.UserPrincipal;
import com.seal.hackathon.service.TeamAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller cung cấp API lấy danh sách phân công cho Mentor và Judge.
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TeamAssignmentController {

    private final TeamAssignmentService teamAssignmentService;

    /**
     * GET /api/mentor/assignments
     * Hiển thị danh sách các team mà Mentor đang đăng nhập quản lý.
     */
    @GetMapping("/mentor/assignments")
    @PreAuthorize("hasRole('MENTOR')")
    public ResponseEntity<ApiResponse<MentorAssignmentResponse>> getMentorAssignments(Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        MentorAssignmentResponse response = teamAssignmentService.getMentorAssignments(principal.getUserId());
        return ResponseEntity.ok(ApiResponse.success("Mentor assignments retrieved successfully.", response));
    }

    /**
     * GET /api/judge/assignments
     * Hiển thị danh sách các team mà Judge đang đăng nhập được phân công chấm điểm.
     */
    @GetMapping("/judge/assignments")
    @PreAuthorize("hasRole('JUDGE')")
    public ResponseEntity<ApiResponse<JudgeAssignmentResponse>> getJudgeAssignments(Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        JudgeAssignmentResponse response = teamAssignmentService.getJudgeAssignments(principal.getUserId());
        return ResponseEntity.ok(ApiResponse.success("Judge assignments retrieved successfully.", response));
    }
}

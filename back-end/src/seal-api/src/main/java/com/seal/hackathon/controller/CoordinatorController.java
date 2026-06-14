package com.seal.hackathon.controller;

import com.seal.hackathon.dto.request.CreateGuestJudgeRequest;
import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.JudgeAssignmentResponse;
import com.seal.hackathon.dto.response.UserResponse;
import com.seal.hackathon.service.AssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Coordinator read-only lookups — EVENT_COORDINATOR only.
 *
 * After the platform split, the coordinator can no longer list global accounts
 * (that is /api/admin, admin-only). This endpoint gives the coordinator just the
 * approved STAFF pool they need to pick judges/mentors for their event.
 */
@RestController
@RequestMapping("/api/coordinator")
@RequiredArgsConstructor
@PreAuthorize("hasRole('EVENT_COORDINATOR')")
public class CoordinatorController {

    private final AssignmentService assignmentService;

    @GetMapping("/staff")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getStaff() {
        return ResponseEntity.ok(ApiResponse.success("Staff retrieved.", assignmentService.listApprovedStaff()));
    }

    /** Create a GUEST judge account and assign it to a round in one step. */
    @PostMapping("/guest-judges")
    public ResponseEntity<ApiResponse<JudgeAssignmentResponse>> createGuestJudge(
            @Valid @RequestBody CreateGuestJudgeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Guest judge created and assigned.",
                        assignmentService.createGuestJudge(request)));
    }
}

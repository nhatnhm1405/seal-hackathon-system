package com.seal.hackathon.controller;

import com.seal.hackathon.dto.request.AssignJudgeRequest;
import com.seal.hackathon.dto.request.AssignMentorRequest;
import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.JudgeAssignmentResponse;
import com.seal.hackathon.dto.response.MentorAssignmentResponse;
import com.seal.hackathon.service.AssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Competition work assignments — EVENT_COORDINATOR only.
 *
 * The coordinator assigns judges to rounds/tracks and mentors to tracks for the
 * event they run. Creating the global account and granting COORDINATOR is the
 * admin's job (/api/admin); here we wire judges/mentors into the competition.
 */
@RestController
@RequestMapping("/api/coordinator/assignments")
@RequiredArgsConstructor
@PreAuthorize("hasRole('EVENT_COORDINATOR')")
public class CoordinatorAssignmentController {

    private final AssignmentService assignmentService;

    @PostMapping("/mentors")
    public ResponseEntity<ApiResponse<MentorAssignmentResponse>> assignMentor(
            @Valid @RequestBody AssignMentorRequest request) {
        MentorAssignmentResponse response = assignmentService.assignMentor(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Mentor assigned successfully.", response));
    }

    @PostMapping("/judges")
    public ResponseEntity<ApiResponse<JudgeAssignmentResponse>> assignJudge(
            @Valid @RequestBody AssignJudgeRequest request) {
        JudgeAssignmentResponse response = assignmentService.assignJudge(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Judge assigned successfully.", response));
    }
}

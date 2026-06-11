package com.seal.hackathon.controller;

import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.SubmissionListResponse;
import com.seal.hackathon.service.SubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rounds")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionService submissionService;

    @GetMapping("/{roundId}/submissions")
    @PreAuthorize("hasAnyRole('JUDGE', 'EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<SubmissionListResponse>> getSubmissionsByRoundId(
            @PathVariable Integer roundId) {
        SubmissionListResponse response = submissionService.getSubmissionsByRoundId(roundId);
        return ResponseEntity.ok(ApiResponse.success("Submissions retrieved successfully.", response));
    }
}

package com.seal.hackathon.controller;

import com.seal.hackathon.dto.request.CreateCriteriaRequest;
import com.seal.hackathon.dto.request.SubmitScoresRequest;
import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.ScoreResponse;
import com.seal.hackathon.dto.response.ScoringCriteriaResponse;
import com.seal.hackathon.security.UserPrincipal;
import com.seal.hackathon.service.ScoringService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ScoringController {

    private final ScoringService scoringService;

    // ── Criteria ──────────────────────────────────────────────────────

    @GetMapping("/events/{eventId}/rounds/{roundId}/criteria")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ScoringCriteriaResponse>>> getCriteria(
            @PathVariable Integer eventId,
            @PathVariable Integer roundId) {
        return ResponseEntity.ok(ApiResponse.success("Criteria retrieved successfully.",
                scoringService.getCriteriaByRound(roundId)));
    }

    @PostMapping("/events/{eventId}/rounds/{roundId}/criteria")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<ScoringCriteriaResponse>> createCriteria(
            @PathVariable Integer eventId,
            @PathVariable Integer roundId,
            @Valid @RequestBody CreateCriteriaRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Criteria created successfully.",
                scoringService.createCriteria(eventId, roundId, request)));
    }

    // ── Scores ────────────────────────────────────────────────────────

    @PostMapping("/scores")
    @PreAuthorize("hasRole('JUDGE')")
    public ResponseEntity<ApiResponse<List<ScoreResponse>>> submitScores(
            @Valid @RequestBody SubmitScoresRequest request,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("Scores saved successfully.",
                scoringService.submitScores(principal.getUserId(), request)));
    }

    @GetMapping("/scores/submission/{submissionId}")
    @PreAuthorize("hasAnyRole('JUDGE', 'EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<List<ScoreResponse>>> getScoresBySubmission(
            @PathVariable Integer submissionId) {
        return ResponseEntity.ok(ApiResponse.success("Scores retrieved successfully.",
                scoringService.getScoresBySubmission(submissionId)));
    }

    @GetMapping("/scores/my/round/{roundId}")
    @PreAuthorize("hasRole('JUDGE')")
    public ResponseEntity<ApiResponse<List<ScoreResponse>>> getMyScoresByRound(
            @PathVariable Integer roundId,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("My scores retrieved successfully.",
                scoringService.getMyScoresByRound(principal.getUserId(), roundId)));
    }
}

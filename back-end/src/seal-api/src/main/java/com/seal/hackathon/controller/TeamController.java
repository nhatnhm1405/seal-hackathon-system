package com.seal.hackathon.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.seal.hackathon.dto.request.CreateTeamRequest;
import com.seal.hackathon.dto.request.TeamStatusReasonRequest;
import com.seal.hackathon.dto.response.ActiveEventResponse;
import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.MyTeamResponse;
import com.seal.hackathon.dto.response.TeamDetailResponse;
import com.seal.hackathon.dto.response.TeamListResponse;
import com.seal.hackathon.dto.response.TeamResponse;
import com.seal.hackathon.dto.response.TeamSubmissionsResponse;
import com.seal.hackathon.security.UserPrincipal;
import com.seal.hackathon.service.SubmissionService;
import com.seal.hackathon.service.TeamService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;
    private final SubmissionService submissionService;

    @PostMapping
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<TeamResponse>> createTeam(
            @Valid @RequestBody CreateTeamRequest request,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        TeamResponse response = teamService.createTeam(principal.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Team created successfully. You are now the Team Leader.", response));
    }

    /**
     * GET /api/teams/my Returns the team the current user belongs to in the
     * active event. Business rule: 1 participant = 1 team = 1 track per event.
     */
    @GetMapping("/my")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<MyTeamResponse>> getMyTeam(Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        MyTeamResponse myTeam = teamService.getMyTeam(principal.getUserId());
        return ResponseEntity.ok(ApiResponse.success("My team retrieved successfully.", myTeam));
    }

    @GetMapping("/active-events")
    public ResponseEntity<ApiResponse<List<ActiveEventResponse>>> getActiveEvents() {
        List<ActiveEventResponse> activeEvents = teamService.getActiveEventsWithTracks();
        return ResponseEntity.ok(ApiResponse.success("Active events retrieved successfully.", activeEvents));
    }

    @GetMapping
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<TeamListResponse>> getTeams(
            @RequestParam(required = false) Integer eventId,
            @RequestParam(required = false) Integer trackId,
            @RequestParam(required = false) String status) {

        TeamListResponse response = teamService.getTeams(eventId, trackId, status);
        return ResponseEntity.ok(ApiResponse.success("Teams retrieved successfully.", response));
    }

    @GetMapping("/{teamId}")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<TeamDetailResponse>> getTeamById(
            @PathVariable Integer teamId) {
        TeamDetailResponse response = teamService.getTeamById(teamId);
        return ResponseEntity.ok(ApiResponse.success("Team retrieved successfully.", response));
    }

    @PatchMapping("/{teamId}/approve")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<TeamDetailResponse>> approveTeam(@PathVariable Integer teamId) {
        TeamDetailResponse response = teamService.approveTeam(teamId);
        return ResponseEntity.ok(ApiResponse.success("Team approved successfully.", response));
    }

    @PatchMapping("/{teamId}/reject")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<TeamDetailResponse>> rejectTeam(
            @PathVariable Integer teamId,
            @RequestBody(required = false) TeamStatusReasonRequest request) {
        TeamDetailResponse response = teamService.rejectTeam(teamId, request);
        return ResponseEntity.ok(ApiResponse.success("Team rejected successfully.", response));
    }

    @PatchMapping("/{teamId}/disqualify")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<TeamDetailResponse>> disqualifyTeam(
            @PathVariable Integer teamId,
            @RequestBody(required = false) TeamStatusReasonRequest request) {
        TeamDetailResponse response = teamService.disqualifyTeam(teamId, request);
        return ResponseEntity.ok(ApiResponse.success("Team disqualified successfully.", response));
    }

    @GetMapping("/{teamId}/submissions")
    @PreAuthorize("hasAnyRole('PARTICIPANT', 'EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<TeamSubmissionsResponse>> getTeamSubmissions(
            @PathVariable Integer teamId,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        TeamSubmissionsResponse response = submissionService.getTeamSubmissions(
                teamId, principal.getUserId(), authentication.getAuthorities());
        return ResponseEntity.ok(ApiResponse.success("Team submissions retrieved successfully.", response));
    }
}

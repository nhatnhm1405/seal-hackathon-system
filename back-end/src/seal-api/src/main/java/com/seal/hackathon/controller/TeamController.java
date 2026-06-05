package com.seal.hackathon.controller;

import com.seal.hackathon.dto.request.CreateTeamRequest;
import com.seal.hackathon.dto.response.ActiveEventResponse;
import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.MyTeamResponse;
import com.seal.hackathon.dto.response.TeamResponse;
import com.seal.hackathon.security.UserPrincipal;
import com.seal.hackathon.service.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @PostMapping
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<TeamResponse>> createTeam(
            @Valid @RequestBody CreateTeamRequest request,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        TeamResponse response = teamService.createTeam(principal.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success("Team created successfully. You are now the Team Leader.", response));
    }

    /**
     * GET /api/teams/my
     * Returns the team the current user belongs to in the active event.
     * Business rule: 1 participant = 1 team = 1 track per event.
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
}


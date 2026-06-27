package com.seal.hackathon.controller;

import com.seal.hackathon.dto.request.AssignTeamTrackRequest;
import com.seal.hackathon.dto.request.CreateTeamRequest;
import com.seal.hackathon.dto.request.RejectTeamRequest;
import com.seal.hackathon.dto.request.SelectTrackRequest;
import com.seal.hackathon.dto.request.UpdateTeamRequest;
import com.seal.hackathon.dto.response.ActiveEventResponse;
import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.MyTeamResponse;
import com.seal.hackathon.dto.response.TeamDetailResponse;
import com.seal.hackathon.dto.response.TeamHistoryResponse;
import com.seal.hackathon.dto.response.TeamResponse;
import com.seal.hackathon.dto.response.UserResponse;
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

    // ── Participant endpoints ────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<TeamResponse>> createTeam(
            @Valid @RequestBody CreateTeamRequest request,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success(
                "Team created successfully. You are now the Team Leader.",
                teamService.createTeam(principal.getUserId(), request)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<MyTeamResponse>> getMyTeam(Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("My team retrieved successfully.",
                teamService.getMyTeam(principal.getUserId())));
    }

    @GetMapping("/my/history")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<List<TeamHistoryResponse>>> getMyHistory(Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("Team history retrieved successfully.",
                teamService.getMyHistory(principal.getUserId())));
    }

    @GetMapping("/active-events")
    public ResponseEntity<ApiResponse<List<ActiveEventResponse>>> getActiveEvents() {
        return ResponseEntity.ok(ApiResponse.success("Active events retrieved successfully.",
                teamService.getActiveEventsWithTracks()));
    }

    // SELF_SELECT events: the team leader picks the team's track during SETUP.
    @PutMapping("/{teamId}/track")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<MyTeamResponse>> selectTrack(
            @PathVariable Integer teamId,
            @Valid @RequestBody SelectTrackRequest request,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("Track selected.",
                teamService.selectTrack(principal.getUserId(), teamId, request.getTrackId())));
    }

    // ── Participant: team management ─────────────────────────────────

    @GetMapping("/search-users")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> searchUsers(@RequestParam String query) {
        return ResponseEntity.ok(ApiResponse.success("Users retrieved.",
                teamService.searchInvitableUsers(query)));
    }

    @PutMapping("/{teamId}")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<MyTeamResponse>> updateTeam(
            @PathVariable Integer teamId,
            @Valid @RequestBody UpdateTeamRequest request,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("Team updated.",
                teamService.updateTeam(principal.getUserId(), teamId, request)));
    }

    @DeleteMapping("/{teamId}/members/{userId}")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<MyTeamResponse>> removeMember(
            @PathVariable Integer teamId,
            @PathVariable Integer userId,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("Member removed.",
                teamService.removeMember(principal.getUserId(), teamId, userId)));
    }

    @PutMapping("/{teamId}/transfer/{newLeaderUserId}")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<MyTeamResponse>> transferLeadership(
            @PathVariable Integer teamId,
            @PathVariable Integer newLeaderUserId,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("Leadership transferred.",
                teamService.transferLeadership(principal.getUserId(), teamId, newLeaderUserId)));
    }

    @PostMapping("/{teamId}/leave")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<Void>> leaveTeam(
            @PathVariable Integer teamId,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        teamService.leaveTeam(principal.getUserId(), teamId);
        return ResponseEntity.ok(ApiResponse.success("You have left the team.", null));
    }

    // ── Coordinator endpoints ────────────────────────────────────────

    @GetMapping("/event/{eventId}")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<List<TeamDetailResponse>>> getTeamsByEvent(@PathVariable Integer eventId) {
        return ResponseEntity.ok(ApiResponse.success("Teams retrieved successfully.",
                teamService.getTeamsByEvent(eventId)));
    }

    @GetMapping("/{teamId}")
    @PreAuthorize("hasAnyRole('EVENT_COORDINATOR', 'MENTOR')")
    public ResponseEntity<ApiResponse<TeamDetailResponse>> getTeamById(@PathVariable Integer teamId) {
        return ResponseEntity.ok(ApiResponse.success("Team retrieved successfully.",
                teamService.getTeamById(teamId)));
    }

    @PostMapping("/event/{eventId}/draw-tracks")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<List<TeamResponse>>> drawTracks(
            @PathVariable Integer eventId,
            @RequestParam(defaultValue = "false") boolean includeAssigned,
            @RequestParam(required = false) String reason,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("Tracks drawn successfully.",
                teamService.drawTracks(eventId, includeAssigned, principal.getUserId(), reason)));
    }

    // Coordinator drag-and-drop: (re)assign a team to a track, or unassign it
    // (trackId = null). SETUP-only; capacity is intentionally NOT hard-capped here.
    @PutMapping("/{teamId}/track-assignment")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<TeamDetailResponse>> assignTeamTrack(
            @PathVariable Integer teamId,
            @RequestBody(required = false) AssignTeamTrackRequest request,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        Integer trackId = request != null ? request.getTrackId() : null;
        return ResponseEntity.ok(ApiResponse.success("Team assignment updated.",
                teamService.assignTeamToTrack(principal.getUserId(), teamId, trackId)));
    }

    @PutMapping("/{teamId}/approve")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<TeamDetailResponse>> approveTeam(@PathVariable Integer teamId) {
        return ResponseEntity.ok(ApiResponse.success("Team approved successfully.",
                teamService.approveTeam(teamId)));
    }

    @PutMapping("/{teamId}/reject")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<TeamDetailResponse>> rejectTeam(
            @PathVariable Integer teamId,
            @RequestBody(required = false) RejectTeamRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Team rejected.",
                teamService.rejectTeam(teamId, request)));
    }

    @PutMapping("/{teamId}/disqualify")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<TeamDetailResponse>> disqualifyTeam(
            @PathVariable Integer teamId,
            @RequestBody(required = false) RejectTeamRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Team disqualified.",
                teamService.disqualifyTeam(teamId, request)));
    }
}

package com.seal.hackathon.controller;

import com.seal.hackathon.dto.request.CreateJoinRequestRequest;
import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.JoinRequestResponse;
import com.seal.hackathon.dto.response.JoinableTeamResponse;
import com.seal.hackathon.security.UserPrincipal;
import com.seal.hackathon.service.JoinRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/join-requests")
@RequiredArgsConstructor
public class JoinRequestController {

    private final JoinRequestService joinRequestService;

    // ── Participant: send a request to join a team ────────────────────

    @PostMapping("/teams/{teamId}")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<JoinRequestResponse>> createRequest(
            @PathVariable Integer teamId,
            @RequestBody(required = false) CreateJoinRequestRequest request,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("Join request sent. The team leader will review it.",
                joinRequestService.createRequest(principal.getUserId(), teamId, request)));
    }

    // ── Participant: browse / search joinable teams ───────────────────

    @GetMapping("/joinable-teams")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<List<JoinableTeamResponse>>> getJoinableTeams(
            @RequestParam(required = false) Integer eventId,
            @RequestParam(required = false) String query,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("Joinable teams retrieved.",
                joinRequestService.getJoinableTeams(principal.getUserId(), eventId, query)));
    }

    // ── Participant: my sent requests ─────────────────────────────────

    @GetMapping("/my")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<List<JoinRequestResponse>>> getMyRequests(Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("Your join requests retrieved.",
                joinRequestService.getMyRequests(principal.getUserId())));
    }

    // ── Participant: withdraw a pending request ───────────────────────

    @DeleteMapping("/{requestId}")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<Void>> cancelRequest(
            @PathVariable Integer requestId,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        joinRequestService.cancelRequest(principal.getUserId(), requestId);
        return ResponseEntity.ok(ApiResponse.success("Join request withdrawn.", null));
    }

    // ── Leader: pending requests for a team they lead ─────────────────

    @GetMapping("/teams/{teamId}")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<List<JoinRequestResponse>>> getTeamRequests(
            @PathVariable Integer teamId,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("Team join requests retrieved.",
                joinRequestService.getTeamRequests(principal.getUserId(), teamId)));
    }

    // ── Leader: accept / decline ──────────────────────────────────────

    @PutMapping("/{requestId}/accept")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<JoinRequestResponse>> acceptRequest(
            @PathVariable Integer requestId,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("Request accepted. The participant has joined your team.",
                joinRequestService.acceptRequest(principal.getUserId(), requestId)));
    }

    @PutMapping("/{requestId}/decline")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<ApiResponse<JoinRequestResponse>> declineRequest(
            @PathVariable Integer requestId,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("Request declined.",
                joinRequestService.declineRequest(principal.getUserId(), requestId)));
    }
}

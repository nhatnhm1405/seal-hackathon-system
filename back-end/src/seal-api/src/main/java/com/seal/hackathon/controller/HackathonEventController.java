package com.seal.hackathon.controller;

import com.seal.hackathon.dto.request.CreateEventRequest;
import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.HackathonEventResponse;
import com.seal.hackathon.security.UserPrincipal;
import com.seal.hackathon.service.HackathonEventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PatchMapping;
import com.seal.hackathon.dto.request.UpdateEventRequest;
import java.util.List;

/**
 * REST controller for HackathonEvent resources.
 *
 * Endpoints:
 * GET /api/events — returns all hackathon events.
 */
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class HackathonEventController {

    private final HackathonEventService hackathonEventService;

    /**
     * GET /api/events
     * Returns all hackathon events sorted by creation date (newest first).
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<HackathonEventResponse>>> getAllHackathonEvents() {
        List<HackathonEventResponse> events = hackathonEventService.getAllHackathonEvents();
        return ResponseEntity.ok(
                ApiResponse.success("All hackathon events retrieved successfully.", events));
    }

    /**
     * GET /api/events/{eventId}
     * Returns a specific hackathon event by ID.
     */
    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<HackathonEventResponse>> getHackathonEventByID(@PathVariable Integer eventId) {
        HackathonEventResponse event = hackathonEventService.getHackathonEventById(eventId);
        return ResponseEntity.ok(
                ApiResponse.success("Hackathon event retrieved successfully.", event));
    }

    /**
     * POST /api/events
     * Creates a new hackathon event. EVENT_COORDINATOR only.
     */
    @PostMapping
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<HackathonEventResponse>> createHackathonEvent(
            @Valid @RequestBody CreateEventRequest request,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        HackathonEventResponse event = hackathonEventService.createHackathonEvent(request, principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success("Hackathon event created successfully.", event));
    }

    /**
     * PATCH /api/events/{eventId}/update
     * Updates an existing hackathon event partially.
     */
    @PatchMapping("/{eventId}/update")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<HackathonEventResponse>> updateHackathonEvent(
            @PathVariable Integer eventId,
            @RequestBody UpdateEventRequest request) {
        HackathonEventResponse updatedEvent = hackathonEventService.updateHackathonEvent(eventId, request);
        return ResponseEntity.ok(
                ApiResponse.success("Hackathon event updated successfully.", updatedEvent));
    }
}

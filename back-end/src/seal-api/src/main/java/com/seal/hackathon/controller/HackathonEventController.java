package com.seal.hackathon.controller;

import com.seal.hackathon.dto.request.CreateEventRequest;
import com.seal.hackathon.dto.request.UpdateEventRequest;
import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.HackathonEventResponse;
import com.seal.hackathon.service.HackathonEventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class HackathonEventController {

    private final HackathonEventService hackathonEventService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<HackathonEventResponse>>> getAllEvents() {
        return ResponseEntity.ok(ApiResponse.success("Events retrieved successfully.",
                hackathonEventService.getAllHackathonEvents()));
    }

    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<HackathonEventResponse>> getEventById(@PathVariable Integer eventId) {
        return ResponseEntity.ok(ApiResponse.success("Event retrieved successfully.",
                hackathonEventService.getEventById(eventId)));
    }

    @PostMapping
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<HackathonEventResponse>> createEvent(
            @Valid @RequestBody CreateEventRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Event created successfully.",
                hackathonEventService.createEvent(request)));
    }

    @PutMapping("/{eventId}")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<HackathonEventResponse>> updateEvent(
            @PathVariable Integer eventId,
            @RequestBody UpdateEventRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Event updated successfully.",
                hackathonEventService.updateEvent(eventId, request)));
    }
}

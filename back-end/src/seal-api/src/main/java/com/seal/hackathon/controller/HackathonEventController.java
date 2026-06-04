package com.seal.hackathon.controller;

import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.HackathonEventResponse;
import com.seal.hackathon.service.HackathonEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for HackathonEvent resources.
 *
 * Endpoints:
 *   GET /api/events — returns all hackathon events.
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
                ApiResponse.success("All hackathon events retrieved successfully.", events)
        );
    }
}

package com.seal.hackathon.controller;

import com.seal.hackathon.dto.request.CreateTrackRequest;
import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.TrackResponse;
import com.seal.hackathon.service.TrackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.seal.hackathon.dto.request.UpdateTrackRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TrackController {

    private final TrackService trackService;

    @GetMapping("/events/{eventId}/tracks")
    public ResponseEntity<ApiResponse<List<TrackResponse>>> getTracksByEventId(
            @PathVariable Integer eventId) {
        List<TrackResponse> tracks = trackService.getTracksByEventId(eventId);
        return ResponseEntity.ok(ApiResponse.success("Tracks retrieved successfully.", tracks));
    }

    @PostMapping("/events/{eventId}/tracks")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<TrackResponse>> createTrack(
            @PathVariable Integer eventId,
            @Valid @RequestBody CreateTrackRequest request) {
        TrackResponse track = trackService.createTrack(eventId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Track created successfully.", track));
    }

    @GetMapping("/tracks/{trackId}")
    public ResponseEntity<ApiResponse<TrackResponse>> getTrackById(
            @PathVariable Integer trackId) {
        TrackResponse track = trackService.getTrackById(trackId);
        return ResponseEntity.ok(ApiResponse.success("Track retrieved successfully.", track));
    }

    @PatchMapping("/tracks/{trackId}")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<TrackResponse>> updateTrack(
            @PathVariable Integer trackId,
            @RequestBody UpdateTrackRequest request) {
        TrackResponse response = trackService.updateTrack(trackId, request);
        return ResponseEntity.ok(ApiResponse.success("Track updated successfully.", response));
    }

    @DeleteMapping("/tracks/{trackId}")
    @PreAuthorize("hasRole('EVENT_COORDINATOR')")
    public ResponseEntity<ApiResponse<Void>> deleteTrack(@PathVariable Integer trackId) {
        trackService.deleteTrack(trackId);
        return ResponseEntity.ok(ApiResponse.success("Track deleted successfully."));
    }
}

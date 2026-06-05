package com.seal.hackathon.controller;

import com.seal.hackathon.dto.response.ApiResponse;
import com.seal.hackathon.dto.response.RoundDetailResponse;
import com.seal.hackathon.service.RoundService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RoundController {

    private final RoundService roundService;

    @GetMapping("/events/{eventId}/rounds/{roundId}")
    public ResponseEntity<ApiResponse<RoundDetailResponse>> getRoundDetail(
            @PathVariable Integer eventId,
            @PathVariable Integer roundId) {
        RoundDetailResponse response = roundService.getRoundDetail(eventId, roundId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin Round thành công", response));
    }
}

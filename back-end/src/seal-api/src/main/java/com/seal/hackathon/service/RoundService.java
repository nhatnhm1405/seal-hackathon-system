package com.seal.hackathon.service;

import com.seal.hackathon.dto.response.RoundDetailResponse;
import com.seal.hackathon.entity.Round;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.RoundRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RoundService {

    private final RoundRepository roundRepository;

    public RoundDetailResponse getRoundDetail(Integer eventId, Integer roundId) {
        Round round = roundRepository.findByIdAndEventId(roundId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Round ID " + roundId + " trong Event ID " + eventId));

        return RoundDetailResponse.builder()
                .roundId(round.getRoundId())
                .eventName(round.getEvent().getName())
                .roundName(round.getName())
                .orderNumber(round.getOrderNumber())
                .startTime(round.getStartTime())
                .endTime(round.getEndTime())
                .submissionDeadline(round.getSubmissionDeadline())
                .topNAdvance(round.getTopNAdvance())
                .isCalibration(round.getIsCalibration())
                .status(round.getStatus())
                .build();
    }
}

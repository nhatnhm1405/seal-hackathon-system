package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.CreateRoundRequest;
import com.seal.hackathon.dto.request.UpdateRoundRequest;
import com.seal.hackathon.dto.response.RoundDetailResponse;
import com.seal.hackathon.dto.response.RoundResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.Round;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.HackathonEventRepository;
import com.seal.hackathon.repository.RoundRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoundService {

    private final RoundRepository roundRepository;
    private final HackathonEventRepository eventRepository;

    @Transactional(readOnly = true)
    public RoundDetailResponse getRoundDetail(Integer eventId, Integer roundId) {
        Round round = roundRepository.findByIdAndEventId(roundId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Round ID " + roundId + " not found in Event ID " + eventId));
        return mapToDetailResponse(round);
    }

    @Transactional(readOnly = true)
    public List<RoundResponse> getRoundsByEvent(Integer eventId) {
        eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        return roundRepository.findAllByEvent_EventIdOrderByOrderNumber(eventId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public RoundResponse createRound(Integer eventId, CreateRoundRequest request) {
        HackathonEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        boolean orderExists = roundRepository.findAllByEvent_EventIdOrderByOrderNumber(eventId).stream()
                .anyMatch(r -> r.getOrderNumber().equals(request.getOrderNumber()));
        if (orderExists) {
            throw new BadRequestException("A round with order number " + request.getOrderNumber()
                    + " already exists in this event.");
        }

        Round round = Round.builder()
                .event(event)
                .name(request.getName().trim())
                .orderNumber(request.getOrderNumber())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .submissionDeadline(request.getSubmissionDeadline())
                .topNAdvance(request.getTopNAdvance())
                .isFinal(request.getIsFinal() != null ? request.getIsFinal() : false)
                .isCalibration(request.getIsCalibration() != null ? request.getIsCalibration() : false)
                .status("PENDING")
                .build();

        round = roundRepository.save(round);
        return mapToResponse(round);
    }

    @Transactional
    public RoundResponse updateRound(Integer eventId, Integer roundId, UpdateRoundRequest request) {
        Round round = roundRepository.findByIdAndEventId(roundId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Round ID " + roundId + " not found in Event ID " + eventId));

        if (request.getName() != null && !request.getName().isBlank()) {
            round.setName(request.getName().trim());
        }
        if (request.getOrderNumber() != null) {
            round.setOrderNumber(request.getOrderNumber());
        }
        if (request.getStartTime() != null) {
            round.setStartTime(request.getStartTime());
        }
        if (request.getEndTime() != null) {
            round.setEndTime(request.getEndTime());
        }
        if (request.getSubmissionDeadline() != null) {
            round.setSubmissionDeadline(request.getSubmissionDeadline());
        }
        if (request.getTopNAdvance() != null) {
            round.setTopNAdvance(request.getTopNAdvance());
        }
        if (request.getIsFinal() != null) {
            round.setIsFinal(request.getIsFinal());
        }
        if (request.getIsCalibration() != null) {
            round.setIsCalibration(request.getIsCalibration());
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            round.setStatus(request.getStatus().toUpperCase());
        }

        round = roundRepository.save(round);
        return mapToResponse(round);
    }

    private RoundResponse mapToResponse(Round round) {
        return RoundResponse.builder()
                .roundId(round.getRoundId())
                .eventId(round.getEvent().getEventId())
                .eventName(round.getEvent().getName())
                .name(round.getName())
                .orderNumber(round.getOrderNumber())
                .startTime(round.getStartTime())
                .endTime(round.getEndTime())
                .submissionDeadline(round.getSubmissionDeadline())
                .topNAdvance(round.getTopNAdvance())
                .isFinal(round.getIsFinal())
                .isCalibration(round.getIsCalibration())
                .status(round.getStatus())
                .build();
    }

    private RoundDetailResponse mapToDetailResponse(Round round) {
        return RoundDetailResponse.builder()
                .roundId(round.getRoundId())
                .eventName(round.getEvent().getName())
                .roundName(round.getName())
                .orderNumber(round.getOrderNumber())
                .startTime(round.getStartTime())
                .endTime(round.getEndTime())
                .submissionDeadline(round.getSubmissionDeadline())
                .topNAdvance(round.getTopNAdvance())
                .isFinal(round.getIsFinal())
                .isCalibration(round.getIsCalibration())
                .status(round.getStatus())
                .build();
    }
}

package com.seal.hackathon.service;

import com.seal.hackathon.dto.response.HackathonEventResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.repository.HackathonEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Business-logic layer for HackathonEvent operations.
 */
@Service
@RequiredArgsConstructor
public class HackathonEventService {

    private final HackathonEventRepository hackathonEventRepository;

    /**
     * Returns every HackathonEvent in the database, sorted by createdAt descending
     * (newest first).
     */
    @Transactional(readOnly = true)
    public List<HackathonEventResponse> getAllHackathonEvents() {
        List<HackathonEvent> events = hackathonEventRepository
                .findAll(Sort.by(Sort.Direction.DESC, "createdAt"));

        return events.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Maps a HackathonEvent entity to the HackathonEventResponse DTO.
     */
    private HackathonEventResponse mapToResponse(HackathonEvent event) {
        return HackathonEventResponse.builder()
                .eventId(event.getEventId())
                .name(event.getName())
                .season(event.getSeason())
                .year(event.getYear())
                .description(event.getDescription())
                .registrationStart(event.getRegistrationStart())
                .registrationEnd(event.getRegistrationEnd())
                .startDate(event.getStartDate())
                .endDate(event.getEndDate())
                .status(event.getStatus())
                .createdBy(event.getCreatedBy() != null ? event.getCreatedBy().getUserId() : null)
                .createdByName(event.getCreatedBy() != null ? event.getCreatedBy().getFullName() : null)
                .createdAt(event.getCreatedAt())
                .build();
    }
}

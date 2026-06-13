package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.CreateEventRequest;
import com.seal.hackathon.dto.request.UpdateEventRequest;
import com.seal.hackathon.dto.response.HackathonEventResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.HackathonEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HackathonEventService {

    private final HackathonEventRepository hackathonEventRepository;

    @Transactional(readOnly = true)
    public List<HackathonEventResponse> getAllHackathonEvents() {
        return hackathonEventRepository
                .findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public HackathonEventResponse getEventById(Integer eventId) {
        HackathonEvent event = hackathonEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        return mapToResponse(event);
    }

    @Transactional
    public HackathonEventResponse createEvent(CreateEventRequest request) {
        String[] validSeasons = {"SPRING", "SUMMER", "FALL"};
        boolean validSeason = false;
        for (String s : validSeasons) {
            if (s.equalsIgnoreCase(request.getSeason())) {
                validSeason = true;
                break;
            }
        }
        if (!validSeason) {
            throw new BadRequestException("Invalid season. Must be SPRING, SUMMER, or FALL.");
        }

        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("End date must be after start date.");
        }

        String status = (request.getStatus() != null && !request.getStatus().isBlank())
                ? request.getStatus().toUpperCase()
                : "DRAFT";

        HackathonEvent event = HackathonEvent.builder()
                .name(request.getName().trim())
                .season(request.getSeason().toUpperCase())
                .year(request.getYear())
                .description(request.getDescription())
                .registrationStart(request.getRegistrationStart())
                .registrationEnd(request.getRegistrationEnd())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(status)
                .build();

        event = hackathonEventRepository.save(event);
        return mapToResponse(event);
    }

    @Transactional
    public HackathonEventResponse updateEvent(Integer eventId, UpdateEventRequest request) {
        HackathonEvent event = hackathonEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        if (request.getName() != null && !request.getName().isBlank()) {
            event.setName(request.getName().trim());
        }
        if (request.getSeason() != null && !request.getSeason().isBlank()) {
            event.setSeason(request.getSeason().toUpperCase());
        }
        if (request.getYear() != null) {
            event.setYear(request.getYear());
        }
        if (request.getDescription() != null) {
            event.setDescription(request.getDescription());
        }
        if (request.getRegistrationStart() != null) {
            event.setRegistrationStart(request.getRegistrationStart());
        }
        if (request.getRegistrationEnd() != null) {
            event.setRegistrationEnd(request.getRegistrationEnd());
        }
        if (request.getStartDate() != null) {
            event.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            event.setEndDate(request.getEndDate());
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            event.setStatus(request.getStatus().toUpperCase());
        }

        event = hackathonEventRepository.save(event);
        return mapToResponse(event);
    }

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
                .createdAt(event.getCreatedAt())
                .build();
    }
}

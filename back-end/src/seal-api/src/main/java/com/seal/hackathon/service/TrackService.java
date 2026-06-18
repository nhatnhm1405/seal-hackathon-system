package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.CreateTrackRequest;
import com.seal.hackathon.dto.response.TrackResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.Track;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.HackathonEventRepository;
import com.seal.hackathon.repository.TeamRepository;
import com.seal.hackathon.repository.TrackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrackService {

    private static final int MAX_TRACK_NAME_LENGTH = 255;
    private static final int MAX_TRACK_DESCRIPTION_LENGTH = 2000;
    private static final String DRAFT_STATUS = "DRAFT";
    private static final String SET_UP_STATUS = "SET_UP";

    private final TrackRepository trackRepository;
    private final HackathonEventRepository eventRepository;
    private final TeamRepository teamRepository;

    @Transactional(readOnly = true)
    public List<TrackResponse> getTracksByEvent(Integer eventId) {
        requireId(eventId, "Event ID");
        requireEvent(eventId);
        return trackRepository.findAllByEvent_EventId(eventId).stream()
                .sorted(Comparator.comparing(Track::getName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TrackResponse getTrackById(Integer eventId, Integer trackId) {
        requireId(eventId, "Event ID");
        requireId(trackId, "Track ID");
        requireEvent(eventId);
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + trackId));
        if (!track.getEvent().getEventId().equals(eventId)) {
            throw new BadRequestException("Track does not belong to event " + eventId);
        }
        return mapToResponse(track);
    }

    @Transactional
    public TrackResponse createTrack(Integer eventId, CreateTrackRequest request) {
        requireId(eventId, "Event ID");
        HackathonEvent event = requireEvent(eventId);

        requireEventStatus(event, DRAFT_STATUS, "create tracks");

        String trackName = requiredTrackName(request);
        String description = normalizeDescription(request.getDescription());

        boolean duplicate = trackRepository.existsByEventIdAndNormalizedName(eventId, normalizeName(trackName));
        if (duplicate) {
            throw new BadRequestException("Track '" + trackName + "' already exists in this event.");
        }

        Track track = Track.builder()
                .event(event)
                .name(trackName)
                .description(description)
                .build();
        track = trackRepository.save(track);
        return mapToResponse(track);
    }

    @Transactional
    public TrackResponse updateTrack(Integer eventId, Integer trackId, CreateTrackRequest request) {
        requireId(eventId, "Event ID");
        requireId(trackId, "Track ID");
        HackathonEvent event = requireEvent(eventId);
        requireEventStatus(event, DRAFT_STATUS, "update tracks");

        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + trackId));
        if (!track.getEvent().getEventId().equals(eventId)) {
            throw new BadRequestException("Track does not belong to event " + eventId);
        }
        if (request == null) {
            throw new BadRequestException("Track update request is required.");
        }
        if (request.getName() != null) {
            String trackName = requiredTrackName(request);
            boolean duplicate = trackRepository.existsByEventIdAndNormalizedNameAndTrackIdNot(
                    eventId,
                    normalizeName(trackName),
                    trackId
            );
            if (duplicate) {
                throw new BadRequestException("Track '" + trackName + "' already exists in this event.");
            }
            track.setName(trackName);
        }
        if (request.getDescription() != null) {
            track.setDescription(normalizeDescription(request.getDescription()));
        }
        track = trackRepository.save(track);
        return mapToResponse(track);
    }

    @Transactional
    public void deleteTrack(Integer eventId, Integer trackId) {
        requireId(eventId, "Event ID");
        requireId(trackId, "Track ID");
        HackathonEvent event = requireEvent(eventId);
        requireEventStatus(event, SET_UP_STATUS, "delete tracks");

        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + trackId));
        if (!track.getEvent().getEventId().equals(eventId)) {
            throw new BadRequestException("Track does not belong to event " + eventId);
        }
        if (teamRepository.existsByTrack_TrackId(trackId)) {
            throw new BadRequestException("Cannot delete track because it already has teams.");
        }
        trackRepository.delete(track);
    }

    private HackathonEvent requireEvent(Integer eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
    }

    private TrackResponse mapToResponse(Track track) {
        return TrackResponse.builder()
                .trackId(track.getTrackId())
                .eventId(track.getEvent().getEventId())
                .name(track.getName())
                .description(track.getDescription())
                .build();
    }

    private void requireEventStatus(HackathonEvent event, String requiredStatus, String action) {
        String status = normalizeEventStatus(event.getStatus());
        if (!requiredStatus.equals(status)) {
            throw new BadRequestException("Cannot " + action + " when event status is " + status
                    + ". Event status must be " + requiredStatus + ".");
        }
    }

    private String normalizeEventStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new BadRequestException("Event status is required.");
        }
        return status.trim().toUpperCase(Locale.ROOT).replaceAll("[\\s-]+", "_");
    }

    private String requiredTrackName(CreateTrackRequest request) {
        if (request == null || request.getName() == null || request.getName().isBlank()) {
            throw new BadRequestException("Track name is required.");
        }
        String trackName = request.getName().trim();
        if (trackName.length() > MAX_TRACK_NAME_LENGTH) {
            throw new BadRequestException("Track name must not exceed " + MAX_TRACK_NAME_LENGTH + " characters.");
        }
        return trackName;
    }

    private String normalizeDescription(String description) {
        if (description == null) {
            return null;
        }
        String trimmed = description.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        if (trimmed.length() > MAX_TRACK_DESCRIPTION_LENGTH) {
            throw new BadRequestException("Track description must not exceed "
                    + MAX_TRACK_DESCRIPTION_LENGTH + " characters.");
        }
        return trimmed;
    }

    private String normalizeName(String name) {
        return name.trim().toUpperCase(Locale.ROOT);
    }

    private void requireId(Integer id, String label) {
        if (id == null) {
            throw new BadRequestException(label + " is required.");
        }
    }
}

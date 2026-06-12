package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.CreateTrackRequest;
import com.seal.hackathon.dto.response.TrackResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.Track;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.HackathonEventRepository;
import com.seal.hackathon.repository.TrackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrackService {

    private final TrackRepository trackRepository;
    private final HackathonEventRepository eventRepository;

    @Transactional(readOnly = true)
    public List<TrackResponse> getTracksByEvent(Integer eventId) {
        eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        return trackRepository.findAllByEvent_EventId(eventId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TrackResponse getTrackById(Integer eventId, Integer trackId) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + trackId));
        if (!track.getEvent().getEventId().equals(eventId)) {
            throw new BadRequestException("Track does not belong to event " + eventId);
        }
        return mapToResponse(track);
    }

    @Transactional
    public TrackResponse createTrack(Integer eventId, CreateTrackRequest request) {
        HackathonEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        boolean duplicate = trackRepository.findAllByEvent_EventId(eventId).stream()
                .anyMatch(t -> t.getName().equalsIgnoreCase(request.getName().trim()));
        if (duplicate) {
            throw new BadRequestException("Track '" + request.getName() + "' already exists in this event.");
        }

        Track track = Track.builder()
                .event(event)
                .name(request.getName().trim())
                .description(request.getDescription())
                .build();
        track = trackRepository.save(track);
        return mapToResponse(track);
    }

    @Transactional
    public TrackResponse updateTrack(Integer eventId, Integer trackId, CreateTrackRequest request) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + trackId));
        if (!track.getEvent().getEventId().equals(eventId)) {
            throw new BadRequestException("Track does not belong to event " + eventId);
        }
        if (request.getName() != null && !request.getName().isBlank()) {
            track.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            track.setDescription(request.getDescription());
        }
        track = trackRepository.save(track);
        return mapToResponse(track);
    }

    @Transactional
    public void deleteTrack(Integer eventId, Integer trackId) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + trackId));
        if (!track.getEvent().getEventId().equals(eventId)) {
            throw new BadRequestException("Track does not belong to event " + eventId);
        }
        trackRepository.delete(track);
    }

    private TrackResponse mapToResponse(Track track) {
        return TrackResponse.builder()
                .trackId(track.getTrackId())
                .eventId(track.getEvent().getEventId())
                .name(track.getName())
                .description(track.getDescription())
                .build();
    }
}

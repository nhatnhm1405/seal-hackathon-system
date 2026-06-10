package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.UpdateTrackRequest;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.repository.TeamRepository;
import com.seal.hackathon.dto.request.CreateTrackRequest;
import com.seal.hackathon.dto.response.TrackResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.Track;
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
    private final TrackRepository trackRepo;
    private final HackathonEventRepository eventRepo;
    private final TeamRepository teamRepo;

    @Transactional(readOnly = true)
    public List<TrackResponse> getTracksByEventId(Integer eventId) {
        HackathonEvent event = eventRepo.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Hackathon Event not found with id: " + eventId));

        List<Track> tracks = trackRepo.findAllByEvent_EventIdOrderByCreatedAtDesc(eventId);

        return tracks.stream()
                .map(track -> mapToResponse(track, event))
                .collect(Collectors.toList());
    }

    @Transactional
    public TrackResponse createTrack(Integer eventId, CreateTrackRequest request) {
        HackathonEvent event = eventRepo.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Hackathon Event not found with id: " + eventId));

        Track track = new Track();
        track.setEvent(event);
        track.setName(request.getName().trim());
        track.setDescription(request.getDescription());

        Track savedTrack = trackRepo.save(track);
        return mapToResponse(savedTrack, event);
    }

    @Transactional(readOnly = true)
    public TrackResponse getTrackById(Integer trackId) {
        Track track = trackRepo.findById(trackId)
                .orElseThrow(() -> new ResourceNotFoundException("Track not found with id= " + trackId));
        return mapToResponse(track, track.getEvent());
    }

    private TrackResponse mapToResponse(Track track, HackathonEvent event) {
        return TrackResponse.builder()
                .trackId(track.getTrackId())
                .eventId(event.getEventId())
                .eventName(event.getName())
                .name(track.getName())
                .description(track.getDescription())
                .createdAt(track.getCreatedAt())
                .build();
    }

    @Transactional
    public TrackResponse updateTrack(Integer trackId, UpdateTrackRequest request) {
        Track track = trackRepo.findById(trackId)
                .orElseThrow(() -> new ResourceNotFoundException("Track not found with id: " + trackId));

        if (request.isEmpty()) {
            throw new BadRequestException("At least one field must be provided for update.");
        }

        if (request.getName() != null) {
            String trimmedName = request.getName().trim();
            if (trimmedName.isBlank()) {
                throw new BadRequestException("Track name must not be blank. ");
            }
            track.setName(trimmedName);
        }

        if (request.getDescription() != null) {
            String trimmedDes = request.getDescription().trim();
            track.setDescription(trimmedDes);
        }
        Track savedTrack = trackRepo.save(track);
        return mapToResponse(savedTrack, track.getEvent());

    }

    @Transactional
    public void deleteTrack(Integer trackId) {
        Track track = trackRepo.findById(trackId)
                .orElseThrow(() -> new ResourceNotFoundException("Track not found with id: " + trackId));

        if (teamRepo.existsByTrack_TrackId(trackId)) {
            throw new BadRequestException("Can not delete this track because it already has teams.");
        }
        trackRepo.delete(track);
    }

}

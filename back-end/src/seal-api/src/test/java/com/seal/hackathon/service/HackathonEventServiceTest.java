package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.UpdateEventRequest;
import com.seal.hackathon.dto.response.HackathonEventResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.Team;
import com.seal.hackathon.entity.Track;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.repository.HackathonEventRepository;
import com.seal.hackathon.repository.TeamRepository;
import com.seal.hackathon.repository.TrackRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Focuses on the SETUP -> IN_PROGRESS "start event" gate (requireSetupComplete):
 * every track needs >= 2 approved teams and no approved team may be unassigned.
 */
@ExtendWith(MockitoExtension.class)
class HackathonEventServiceTest {

    @Mock
    private HackathonEventRepository hackathonEventRepository;

    @Mock
    private TrackRepository trackRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private HackathonEventService eventService;

    @Test
    void startEvent_shouldSucceed_whenEveryTrackHasTwoTeamsAndNoneUnassigned() {
        HackathonEvent event = event(1, "SETUP");
        Track ai = track(10, event);
        Track web = track(20, event);

        when(hackathonEventRepository.findById(1)).thenReturn(Optional.of(event));
        when(trackRepository.findAllByEvent_EventId(1)).thenReturn(List.of(ai, web));
        when(teamRepository.findAllByEvent_EventIdAndStatus(1, "APPROVED")).thenReturn(List.of(
                teamOnTrack(100, event, ai), teamOnTrack(101, event, ai),
                teamOnTrack(102, event, web), teamOnTrack(103, event, web)));
        when(hackathonEventRepository.save(event)).thenReturn(event);

        HackathonEventResponse response = eventService.updateEvent(1, statusRequest("IN_PROGRESS"));

        assertEquals("IN_PROGRESS", response.getStatus());
        verify(hackathonEventRepository).save(event);
    }

    @Test
    void startEvent_shouldThrow_whenATrackHasFewerThanTwoTeams() {
        HackathonEvent event = event(1, "SETUP");
        Track ai = track(10, event);

        when(hackathonEventRepository.findById(1)).thenReturn(Optional.of(event));
        when(trackRepository.findAllByEvent_EventId(1)).thenReturn(List.of(ai));
        when(teamRepository.findAllByEvent_EventIdAndStatus(1, "APPROVED"))
                .thenReturn(List.of(teamOnTrack(100, event, ai)));

        assertThrows(BadRequestException.class,
                () -> eventService.updateEvent(1, statusRequest("IN_PROGRESS")));

        verify(hackathonEventRepository, never()).save(any());
    }

    @Test
    void startEvent_shouldThrow_whenTeamsAreUnassigned() {
        HackathonEvent event = event(1, "SETUP");
        Track ai = track(10, event);

        when(hackathonEventRepository.findById(1)).thenReturn(Optional.of(event));
        when(trackRepository.findAllByEvent_EventId(1)).thenReturn(List.of(ai));
        when(teamRepository.findAllByEvent_EventIdAndStatus(1, "APPROVED")).thenReturn(List.of(
                teamOnTrack(100, event, ai), teamOnTrack(101, event, ai),
                unassignedTeam(102, event)));

        assertThrows(BadRequestException.class,
                () -> eventService.updateEvent(1, statusRequest("IN_PROGRESS")));

        verify(hackathonEventRepository, never()).save(any());
    }

    @Test
    void startEvent_shouldThrow_whenEventHasNoTracks() {
        HackathonEvent event = event(1, "SETUP");

        when(hackathonEventRepository.findById(1)).thenReturn(Optional.of(event));
        when(trackRepository.findAllByEvent_EventId(1)).thenReturn(List.of());
        when(teamRepository.findAllByEvent_EventIdAndStatus(1, "APPROVED")).thenReturn(List.of());

        assertThrows(BadRequestException.class,
                () -> eventService.updateEvent(1, statusRequest("IN_PROGRESS")));

        verify(hackathonEventRepository, never()).save(any());
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private static UpdateEventRequest statusRequest(String status) {
        UpdateEventRequest request = new UpdateEventRequest();
        request.setStatus(status);
        return request;
    }

    private static HackathonEvent event(Integer eventId, String status) {
        return HackathonEvent.builder()
                .eventId(eventId)
                .name("SEAL Hackathon " + eventId)
                .season("SPRING")
                .year(2026)
                .startDate(LocalDateTime.now().plusDays(10))
                .endDate(LocalDateTime.now().plusDays(12))
                .status(status)
                .trackSelectionMode("RANDOM")
                .build();
    }

    private static Track track(Integer trackId, HackathonEvent event) {
        return Track.builder().trackId(trackId).event(event).name("Track " + trackId).build();
    }

    private static Team teamOnTrack(Integer teamId, HackathonEvent event, Track track) {
        return Team.builder().teamId(teamId).event(event).track(track)
                .name("Team " + teamId).status("APPROVED").build();
    }

    private static Team unassignedTeam(Integer teamId, HackathonEvent event) {
        return Team.builder().teamId(teamId).event(event).track(null)
                .name("Team " + teamId).status("APPROVED").build();
    }
}

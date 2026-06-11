package com.seal.hackathon.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.seal.hackathon.dto.request.CreateTeamRequest;
import com.seal.hackathon.dto.response.TeamResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.Team;
import com.seal.hackathon.entity.Track;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.HackathonEventRepository;
import com.seal.hackathon.repository.TeamMemberRepository;
import com.seal.hackathon.repository.TeamRepository;
import com.seal.hackathon.repository.TrackRepository;
import com.seal.hackathon.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
public class TeamServiceTest {

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @Mock
    private HackathonEventRepository eventRepository;

    @Mock
    private TrackRepository trackRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private TeamService teamService;

    private User user;
    private HackathonEvent event;
    private Track track;
    private CreateTeamRequest request;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setUserId(1);
        user.setFullName("Test User");

        event = new HackathonEvent();
        event.setEventId(10);
        event.setStatus("PUBLISHED");
        event.setName("Seal Hackathon");
        event.setRegistrationStart(LocalDateTime.now().minusDays(1));
        event.setRegistrationEnd(LocalDateTime.now().plusDays(1));

        track = new Track();
        track.setTrackId(20);
        track.setEvent(event);
        track.setName("AI Track");

        request = new CreateTeamRequest();
        request.setEventId(10);
        request.setTrackId(20);
        request.setName("Team Alpha");
        request.setDescription("Good team");
    }

    @Test
    void createTeam_success() {
        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(eventRepository.findById(10)).thenReturn(Optional.of(event));
        when(trackRepository.findById(20)).thenReturn(Optional.of(track));
        when(teamRepository.existsByEvent_EventIdAndNameIgnoreCase(10, "Team Alpha")).thenReturn(false);
        when(teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(1, 10)).thenReturn(false);

        Team savedTeam = Team.builder()
                .teamId(100)
                .event(event)
                .track(track)
                .name("Team Alpha")
                .description("Good team")
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();
        when(teamRepository.save(any(Team.class))).thenReturn(savedTeam);

        TeamResponse response = teamService.createTeam(1, request);

        assertNotNull(response);
        assertEquals("Team Alpha", response.getName());
        assertEquals("PENDING", response.getStatus());
        verify(teamRepository, times(1)).save(any(Team.class));
        verify(teamMemberRepository, times(1)).save(any());
    }

    @Test
    void createTeam_eventNotFound() {
        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(eventRepository.findById(10)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> teamService.createTeam(1, request));
    }

    @Test
    void createTeam_eventNotPublished() {
        event.setStatus("DRAFT");
        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(eventRepository.findById(10)).thenReturn(Optional.of(event));

        assertThrows(BadRequestException.class, () -> teamService.createTeam(1, request));
    }

    @Test
    void createTeam_duplicateName() {
        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(eventRepository.findById(10)).thenReturn(Optional.of(event));
        when(trackRepository.findById(20)).thenReturn(Optional.of(track));
        when(teamRepository.existsByEvent_EventIdAndNameIgnoreCase(10, "Team Alpha")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> teamService.createTeam(1, request));
    }

    @Test
    void createTeam_duplicateNameIgnoreCase() {
        request.setName("TEAM ALPHA");
        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(eventRepository.findById(10)).thenReturn(Optional.of(event));
        when(trackRepository.findById(20)).thenReturn(Optional.of(track));
        when(teamRepository.existsByEvent_EventIdAndNameIgnoreCase(10, "TEAM ALPHA")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> teamService.createTeam(1, request));
    }

    @Test
    void createTeam_differentEventDuplicateName() {
        request.setName("Team Alpha");
        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(eventRepository.findById(10)).thenReturn(Optional.of(event));
        when(trackRepository.findById(20)).thenReturn(Optional.of(track));
        // DB says it doesn't exist in THIS event (event 10), even though it exists in event 11
        when(teamRepository.existsByEvent_EventIdAndNameIgnoreCase(10, "Team Alpha")).thenReturn(false);
        when(teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(1, 10)).thenReturn(false);
        
        Team savedTeam = Team.builder()
                .teamId(101)
                .event(event)
                .track(track)
                .name("Team Alpha")
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();
        when(teamRepository.save(any(Team.class))).thenReturn(savedTeam);

        TeamResponse response = teamService.createTeam(1, request);
        assertNotNull(response);
    }

    @Test
    void createTeam_userAlreadyInTeam() {
        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(eventRepository.findById(10)).thenReturn(Optional.of(event));
        when(trackRepository.findById(20)).thenReturn(Optional.of(track));
        when(teamRepository.existsByEvent_EventIdAndNameIgnoreCase(10, "Team Alpha")).thenReturn(false);
        when(teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(1, 10)).thenReturn(true);

        assertThrows(BadRequestException.class, () -> teamService.createTeam(1, request));
    }
}

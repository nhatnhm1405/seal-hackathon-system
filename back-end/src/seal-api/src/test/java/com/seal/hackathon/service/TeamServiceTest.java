package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.CreateTeamRequest;
import com.seal.hackathon.dto.request.RejectTeamRequest;
import com.seal.hackathon.dto.request.UpdateTeamRequest;
import com.seal.hackathon.dto.response.ActiveEventResponse;
import com.seal.hackathon.dto.response.MyTeamResponse;
import com.seal.hackathon.dto.response.TeamDetailResponse;
import com.seal.hackathon.dto.response.TeamResponse;
import com.seal.hackathon.dto.response.UserResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.Team;
import com.seal.hackathon.entity.TeamMember;
import com.seal.hackathon.entity.Track;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.HackathonEventRepository;
import com.seal.hackathon.repository.TeamMemberRepository;
import com.seal.hackathon.repository.TeamRepository;
import com.seal.hackathon.repository.TrackRepository;
import com.seal.hackathon.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TeamServiceTest {

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

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private TeamService teamService;

    @Test
    void createTeam_shouldCreatePendingTeamAndLeaderMember_whenRequestIsValid() {
        User user = user(100, "Leader");
        HackathonEvent event = event(1, "OPEN");
        CreateTeamRequest request = createTeamRequest(" Seal Team ");

        when(userRepository.findById(100)).thenReturn(Optional.of(user));
        when(eventRepository.findById(1)).thenReturn(Optional.of(event));
        when(teamRepository.existsByEventIdAndNormalizedName(1, "SEAL TEAM")).thenReturn(false);
        when(teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(100, 1)).thenReturn(false);
        when(teamRepository.save(any(Team.class))).thenAnswer(invocation -> {
            Team team = invocation.getArgument(0);
            team.setTeamId(99);
            return team;
        });

        TeamResponse response = teamService.createTeam(100, request);

        assertEquals(99, response.getTeamId());
        assertEquals("Seal Team", response.getName());
        assertNull(response.getTrackId());
        assertNull(response.getTrackName());
        assertEquals("PENDING", response.getStatus());
        verify(teamRepository).save(any(Team.class));
        verify(teamMemberRepository).save(any(TeamMember.class));
    }

    @Test
    void createTeam_shouldThrowBadRequest_whenEventIsNotOpen() {
        CreateTeamRequest request = createTeamRequest("Seal Team");

        when(userRepository.findById(100)).thenReturn(Optional.of(user(100, "Leader")));
        when(eventRepository.findById(1)).thenReturn(Optional.of(event(1, "CLOSED")));

        assertThrows(BadRequestException.class, () -> teamService.createTeam(100, request));

        verify(teamRepository, never()).save(any());
        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    void createTeam_shouldThrowBadRequest_whenNormalizedTeamNameAlreadyExists() {
        User user = user(100, "Leader");
        HackathonEvent event = event(1, "OPEN");

        when(userRepository.findById(100)).thenReturn(Optional.of(user));
        when(eventRepository.findById(1)).thenReturn(Optional.of(event));
        when(teamRepository.existsByEventIdAndNormalizedName(1, "SEAL TEAM")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> teamService.createTeam(100, createTeamRequest(" seal team ")));

        verify(teamRepository, never()).save(any());
        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    void createTeam_shouldThrowResourceNotFound_whenEventDoesNotExist() {
        when(userRepository.findById(100)).thenReturn(Optional.of(user(100, "Leader")));
        when(eventRepository.findById(1)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> teamService.createTeam(100, createTeamRequest("Seal Team")));

        verify(trackRepository, never()).findById(anyInt());
        verify(teamRepository, never()).save(any());
    }

    @Test
    void createTeam_shouldThrowBadRequest_whenUserAlreadyHasTeamInEvent() {
        User user = user(100, "Leader");
        HackathonEvent event = event(1, "OPEN");

        when(userRepository.findById(100)).thenReturn(Optional.of(user));
        when(eventRepository.findById(1)).thenReturn(Optional.of(event));
        when(teamRepository.existsByEventIdAndNormalizedName(1, "SEAL TEAM")).thenReturn(false);
        when(teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(100, 1)).thenReturn(true);

        assertThrows(BadRequestException.class, () -> teamService.createTeam(100, createTeamRequest("Seal Team")));

        verify(teamRepository, never()).save(any());
        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    void createTeam_shouldThrowResourceNotFound_whenUserDoesNotExist() {
        when(userRepository.findById(100)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> teamService.createTeam(100, createTeamRequest("Seal Team")));

        verify(eventRepository, never()).findById(anyInt());
        verify(teamRepository, never()).save(any());
    }

    @Test
    void getMyTeam_shouldReturnCurrentTeamWithMembers() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "APPROVED");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");
        TeamMember member = member(2, team, user(101, "Member"), "MEMBER");

        when(teamMemberRepository.findByUser_UserIdAndTeam_Event_StatusIn(eq(100), anyList()))
                .thenReturn(List.of(leader));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader, member));

        MyTeamResponse response = teamService.getMyTeam(100);

        assertEquals(99, response.getTeamId());
        assertEquals("Seal Team", response.getName());
        assertEquals("LEADER", response.getMyRole());
        assertEquals(2, response.getMembers().size());
    }

    @Test
    void getMyTeam_shouldThrowResourceNotFound_whenUserHasNoActiveTeam() {
        when(teamMemberRepository.findByUser_UserIdAndTeam_Event_StatusIn(eq(100), anyList()))
                .thenReturn(List.of());

        assertThrows(ResourceNotFoundException.class, () -> teamService.getMyTeam(100));
    }

    @Test
    void updateTeam_shouldUpdateNameAndDescription_whenUserIsLeader() {
        HackathonEvent event = event(1, "OPEN");
        Team team = team(99, event, track(10, event), "Old Name", "PENDING");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");
        UpdateTeamRequest request = new UpdateTeamRequest();
        request.setName(" New Name ");
        request.setDescription(" Updated description ");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader));
        when(teamRepository.existsByEventIdAndNormalizedName(1, "NEW NAME")).thenReturn(false);
        when(teamMemberRepository.findByUser_UserIdAndTeam_Event_StatusIn(eq(100), anyList()))
                .thenReturn(List.of(leader));
        when(teamRepository.save(team)).thenReturn(team);

        MyTeamResponse response = teamService.updateTeam(100, 99, request);

        assertEquals("New Name", team.getName());
        assertEquals("Updated description", team.getDescription());
        assertEquals("New Name", response.getName());
        verify(teamRepository).save(team);
    }

    @Test
    void updateTeam_shouldThrowBadRequest_whenUserIsNotLeader() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");
        TeamMember member = member(1, team, user(100, "Member"), "MEMBER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(member));

        assertThrows(BadRequestException.class, () -> teamService.updateTeam(100, 99, new UpdateTeamRequest()));

        verify(teamRepository, never()).save(any());
    }

    @Test
    void updateTeam_shouldThrowResourceNotFound_whenTeamDoesNotExist() {
        when(teamRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> teamService.updateTeam(100, 99, new UpdateTeamRequest()));

        verify(teamMemberRepository, never()).findByTeam_TeamId(anyInt());
        verify(teamRepository, never()).save(any());
    }

    @Test
    void updateTeam_shouldThrowBadRequest_whenUserIsNotTeamMember() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of());

        assertThrows(BadRequestException.class, () -> teamService.updateTeam(100, 99, new UpdateTeamRequest()));

        verify(teamRepository, never()).save(any());
    }

    @Test
    void updateTeam_shouldThrowBadRequest_whenTeamIsRejected() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "REJECTED");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader));

        assertThrows(BadRequestException.class, () -> teamService.updateTeam(100, 99, new UpdateTeamRequest()));

        verify(teamRepository, never()).save(any());
    }

    @Test
    void updateTeam_shouldThrowBadRequest_whenTeamIsDisqualified() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "DISQUALIFIED");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader));

        assertThrows(BadRequestException.class, () -> teamService.updateTeam(100, 99, new UpdateTeamRequest()));

        verify(teamRepository, never()).save(any());
    }

    @Test
    void updateTeam_shouldThrowBadRequest_whenNormalizedNewNameAlreadyExists() {
        HackathonEvent event = event(1, "OPEN");
        Team team = team(99, event, track(10, event), "Old Name", "PENDING");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");
        UpdateTeamRequest request = new UpdateTeamRequest();
        request.setName(" Existing Name ");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader));
        when(teamRepository.existsByEventIdAndNormalizedName(1, "EXISTING NAME")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> teamService.updateTeam(100, 99, request));

        verify(teamRepository, never()).save(any());
    }

    @Test
    void updateTeam_shouldNotCheckDuplicate_whenNormalizedNameDoesNotChange() {
        HackathonEvent event = event(1, "OPEN");
        Team team = team(99, event, track(10, event), "Seal Team", "PENDING");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");
        UpdateTeamRequest request = new UpdateTeamRequest();
        request.setName(" seal team ");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader));
        when(teamMemberRepository.findByUser_UserIdAndTeam_Event_StatusIn(eq(100), anyList()))
                .thenReturn(List.of(leader));
        when(teamRepository.save(team)).thenReturn(team);

        MyTeamResponse response = teamService.updateTeam(100, 99, request);

        assertEquals("seal team", response.getName());
        verify(teamRepository, never()).existsByEventIdAndNormalizedName(anyInt(), any());
        verify(teamRepository).save(team);
    }

    @Test
    void updateTeam_shouldIgnoreBlankName() {
        HackathonEvent event = event(1, "OPEN");
        Team team = team(99, event, track(10, event), "Seal Team", "PENDING");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");
        UpdateTeamRequest request = new UpdateTeamRequest();
        request.setName("   ");
        request.setDescription("New description");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader));
        when(teamMemberRepository.findByUser_UserIdAndTeam_Event_StatusIn(eq(100), anyList()))
                .thenReturn(List.of(leader));
        when(teamRepository.save(team)).thenReturn(team);

        teamService.updateTeam(100, 99, request);

        assertEquals("Seal Team", team.getName());
        assertEquals("New description", team.getDescription());
        verify(teamRepository, never()).existsByEventIdAndNormalizedName(anyInt(), any());
    }

    @Test
    void removeMember_shouldDeleteTargetMember_whenUserIsLeader() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");
        TeamMember target = member(2, team, user(101, "Member"), "MEMBER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99))
                .thenReturn(List.of(leader, target), List.of(leader, target), List.of(leader));
        when(teamMemberRepository.findByUser_UserIdAndTeam_Event_StatusIn(eq(100), anyList()))
                .thenReturn(List.of(leader));

        MyTeamResponse response = teamService.removeMember(100, 99, 101);

        assertEquals(1, response.getMembers().size());
        verify(teamMemberRepository).delete(target);
    }

    @Test
    void removeMember_shouldThrowBadRequest_whenLeaderRemovesSelf() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader));

        assertThrows(BadRequestException.class, () -> teamService.removeMember(100, 99, 100));

        verify(teamMemberRepository, never()).delete(any());
    }

    @Test
    void removeMember_shouldThrowResourceNotFound_whenTeamDoesNotExist() {
        when(teamRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> teamService.removeMember(100, 99, 101));

        verify(teamMemberRepository, never()).delete(any());
    }

    @Test
    void removeMember_shouldThrowBadRequest_whenLeaderIsNotTeamMember() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of());

        assertThrows(BadRequestException.class, () -> teamService.removeMember(100, 99, 101));

        verify(teamMemberRepository, never()).delete(any());
    }

    @Test
    void removeMember_shouldThrowBadRequest_whenCallerIsNotLeader() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");
        TeamMember member = member(1, team, user(100, "Member"), "MEMBER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(member));

        assertThrows(BadRequestException.class, () -> teamService.removeMember(100, 99, 101));

        verify(teamMemberRepository, never()).delete(any());
    }

    @Test
    void removeMember_shouldThrowBadRequest_whenTeamIsRejected() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "REJECTED");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader));

        assertThrows(BadRequestException.class, () -> teamService.removeMember(100, 99, 101));

        verify(teamMemberRepository, never()).delete(any());
    }

    @Test
    void removeMember_shouldThrowBadRequest_whenTargetIsNotTeamMember() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader));

        assertThrows(BadRequestException.class, () -> teamService.removeMember(100, 99, 101));

        verify(teamMemberRepository, never()).delete(any());
    }

    @Test
    void removeMember_shouldThrowBadRequest_whenTargetIsLeader() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");
        TeamMember caller = member(1, team, user(100, "Leader"), "LEADER");
        TeamMember target = member(2, team, user(101, "Other Leader"), "LEADER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(caller, target));

        assertThrows(BadRequestException.class, () -> teamService.removeMember(100, 99, 101));

        verify(teamMemberRepository, never()).delete(any());
    }

    @Test
    void transferLeadership_shouldSwapRoles_whenNewLeaderIsMember() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");
        TeamMember oldLeader = member(1, team, user(100, "Leader"), "LEADER");
        TeamMember newLeader = member(2, team, user(101, "Member"), "MEMBER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(oldLeader, newLeader));
        when(teamMemberRepository.findByUser_UserIdAndTeam_Event_StatusIn(eq(100), anyList()))
                .thenReturn(List.of(oldLeader));

        MyTeamResponse response = teamService.transferLeadership(100, 99, 101);

        assertEquals("MEMBER", oldLeader.getMemberRole());
        assertEquals("LEADER", newLeader.getMemberRole());
        assertEquals("MEMBER", response.getMyRole());
        verify(teamMemberRepository).save(oldLeader);
        verify(teamMemberRepository).save(newLeader);
    }

    @Test
    void transferLeadership_shouldThrowBadRequest_whenLeaderTransfersToSelf() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader));

        assertThrows(BadRequestException.class, () -> teamService.transferLeadership(100, 99, 100));

        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    void transferLeadership_shouldThrowResourceNotFound_whenTeamDoesNotExist() {
        when(teamRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> teamService.transferLeadership(100, 99, 101));

        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    void transferLeadership_shouldThrowBadRequest_whenLeaderIsNotTeamMember() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of());

        assertThrows(BadRequestException.class, () -> teamService.transferLeadership(100, 99, 101));

        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    void transferLeadership_shouldThrowBadRequest_whenCallerIsNotLeader() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");
        TeamMember member = member(1, team, user(100, "Member"), "MEMBER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(member));

        assertThrows(BadRequestException.class, () -> teamService.transferLeadership(100, 99, 101));

        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    void transferLeadership_shouldThrowBadRequest_whenTeamIsDisqualified() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "DISQUALIFIED");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader));

        assertThrows(BadRequestException.class, () -> teamService.transferLeadership(100, 99, 101));

        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    void transferLeadership_shouldThrowBadRequest_whenNewLeaderIsNotTeamMember() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader));

        assertThrows(BadRequestException.class, () -> teamService.transferLeadership(100, 99, 101));

        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    void leaveTeam_shouldDeleteMember_whenUserIsNotLeader() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");
        TeamMember member = member(2, team, user(101, "Member"), "MEMBER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader, member));

        teamService.leaveTeam(101, 99);

        verify(teamMemberRepository).delete(member);
        verify(teamRepository, never()).delete(any());
    }

    @Test
    void leaveTeam_shouldDeleteTeam_whenOnlyLeaderLeaves() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader));

        teamService.leaveTeam(100, 99);

        verify(teamMemberRepository).delete(leader);
        verify(teamRepository).delete(team);
    }

    @Test
    void leaveTeam_shouldThrowBadRequest_whenLeaderLeavesTeamWithOtherMembers() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");
        TeamMember member = member(2, team, user(101, "Member"), "MEMBER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader, member));

        assertThrows(BadRequestException.class, () -> teamService.leaveTeam(100, 99));

        verify(teamMemberRepository, never()).delete(any());
        verify(teamRepository, never()).delete(any());
    }

    @Test
    void leaveTeam_shouldThrowResourceNotFound_whenTeamDoesNotExist() {
        when(teamRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> teamService.leaveTeam(100, 99));

        verify(teamMemberRepository, never()).delete(any());
        verify(teamRepository, never()).delete(any());
    }

    @Test
    void leaveTeam_shouldThrowBadRequest_whenTeamIsRejected() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "REJECTED");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));

        assertThrows(BadRequestException.class, () -> teamService.leaveTeam(100, 99));

        verify(teamMemberRepository, never()).findByTeam_TeamId(anyInt());
        verify(teamMemberRepository, never()).delete(any());
        verify(teamRepository, never()).delete(any());
    }

    @Test
    void leaveTeam_shouldThrowBadRequest_whenUserIsNotTeamMember() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of());

        assertThrows(BadRequestException.class, () -> teamService.leaveTeam(100, 99));

        verify(teamMemberRepository, never()).delete(any());
        verify(teamRepository, never()).delete(any());
    }

    @Test
    void searchInvitableUsers_shouldReturnEmptyList_whenQueryIsTooShort() {
        List<UserResponse> response = teamService.searchInvitableUsers(" a ");

        assertTrue(response.isEmpty());
        verify(userRepository, never()).searchInvitableStudents(any());
    }

    @Test
    void searchInvitableUsers_shouldReturnEmptyList_whenQueryIsNull() {
        List<UserResponse> response = teamService.searchInvitableUsers(null);

        assertTrue(response.isEmpty());
        verify(userRepository, never()).searchInvitableStudents(any());
    }

    @Test
    void searchInvitableUsers_shouldReturnAtMostTenUsers() {
        List<User> users = java.util.stream.IntStream.rangeClosed(1, 12)
                .mapToObj(i -> user(i, "Student " + i))
                .toList();
        when(userRepository.searchInvitableStudents("student")).thenReturn(users);

        List<UserResponse> response = teamService.searchInvitableUsers(" Student ");

        assertEquals(10, response.size());
        assertEquals("Student 1", response.get(0).getFullName());
    }

    @Test
    void searchInvitableUsers_shouldReturnEmptyList_whenRepositoryFindsNoUsers() {
        when(userRepository.searchInvitableStudents("student")).thenReturn(List.of());

        List<UserResponse> response = teamService.searchInvitableUsers(" Student ");

        assertTrue(response.isEmpty());
        verify(userRepository).searchInvitableStudents("student");
    }

    @Test
    void getTeamsByEvent_shouldReturnAllTeamsForEvent() {
        HackathonEvent event = event(1, "OPEN");
        Team team = team(99, event, track(10, event), "Seal Team", "APPROVED");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");

        when(eventRepository.findById(1)).thenReturn(Optional.of(event));
        when(teamRepository.findAllByEvent_EventId(1)).thenReturn(List.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader));

        List<TeamDetailResponse> response = teamService.getTeamsByEvent(1);

        assertEquals(1, response.size());
        assertEquals("Seal Team", response.get(0).getName());
        assertEquals(1, response.get(0).getMembers().size());
    }

    @Test
    void getTeamsByEvent_shouldThrowResourceNotFound_whenEventDoesNotExist() {
        when(eventRepository.findById(1)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> teamService.getTeamsByEvent(1));

        verify(teamRepository, never()).findAllByEvent_EventId(anyInt());
    }

    @Test
    void getTeamsByEvent_shouldReturnEmptyList_whenEventHasNoTeams() {
        HackathonEvent event = event(1, "OPEN");

        when(eventRepository.findById(1)).thenReturn(Optional.of(event));
        when(teamRepository.findAllByEvent_EventId(1)).thenReturn(List.of());

        List<TeamDetailResponse> response = teamService.getTeamsByEvent(1);

        assertTrue(response.isEmpty());
    }

    @Test
    void getTeamById_shouldReturnTeamDetail() {
        HackathonEvent event = event(1, "OPEN");
        Team team = team(99, event, track(10, event), "Seal Team", "APPROVED");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader));

        TeamDetailResponse response = teamService.getTeamById(99);

        assertEquals(99, response.getTeamId());
        assertEquals("Seal Team", response.getName());
        assertEquals("APPROVED", response.getStatus());
    }

    @Test
    void getTeamById_shouldThrowResourceNotFound_whenTeamDoesNotExist() {
        when(teamRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> teamService.getTeamById(99));

        verify(teamMemberRepository, never()).findByTeam_TeamId(anyInt());
    }

    @Test
    void approveTeam_shouldApproveTeamAndNotifyMembers() {
        HackathonEvent event = event(1, "OPEN");
        Team team = team(99, event, track(10, event), "Seal Team", "PENDING");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");
        TeamMember member = member(2, team, user(101, "Member"), "MEMBER");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamRepository.save(team)).thenReturn(team);
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader, member), List.of(leader, member));

        TeamDetailResponse response = teamService.approveTeam(99);

        assertEquals("APPROVED", response.getStatus());
        verify(notificationService).createNotification(eq(100), eq("Team approved"), any(), eq("TEAM_APPROVED"));
        verify(notificationService).createNotification(eq(101), eq("Team approved"), any(), eq("TEAM_APPROVED"));
    }

    @Test
    void approveTeam_shouldThrowBadRequest_whenTeamAlreadyApproved() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "APPROVED");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));

        assertThrows(BadRequestException.class, () -> teamService.approveTeam(99));

        verify(teamRepository, never()).save(any());
        verify(notificationService, never()).createNotification(anyInt(), any(), any(), any());
    }

    @Test
    void approveTeam_shouldThrowResourceNotFound_whenTeamDoesNotExist() {
        when(teamRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> teamService.approveTeam(99));

        verify(teamRepository, never()).save(any());
        verify(notificationService, never()).createNotification(anyInt(), any(), any(), any());
    }

    @Test
    void approveTeam_shouldThrowBadRequest_whenTeamIsRejected() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "REJECTED");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));

        assertThrows(BadRequestException.class, () -> teamService.approveTeam(99));

        verify(teamRepository, never()).save(any());
    }

    @Test
    void approveTeam_shouldThrowBadRequest_whenTeamIsDisqualified() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "DISQUALIFIED");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));

        assertThrows(BadRequestException.class, () -> teamService.approveTeam(99));

        verify(teamRepository, never()).save(any());
        verify(notificationService, never()).createNotification(anyInt(), any(), any(), any());
    }

    @Test
    void rejectTeam_shouldRejectTeamStoreReasonAndNotifyMembers() {
        HackathonEvent event = event(1, "OPEN");
        Team team = team(99, event, track(10, event), "Seal Team", "PENDING");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");
        RejectTeamRequest request = new RejectTeamRequest();
        request.setReason(" Invalid information ");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamRepository.save(team)).thenReturn(team);
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader), List.of(leader));

        TeamDetailResponse response = teamService.rejectTeam(99, request);

        assertEquals("REJECTED", response.getStatus());
        assertEquals("Invalid information", response.getDisqualifiedReason());
        verify(notificationService).createNotification(eq(100), eq("Team rejected"), any(), eq("TEAM_REJECTED"));
    }

    @Test
    void rejectTeam_shouldRejectTeamWithNullReason_whenRequestIsNull() {
        HackathonEvent event = event(1, "OPEN");
        Team team = team(99, event, track(10, event), "Seal Team", "PENDING");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamRepository.save(team)).thenReturn(team);
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of());

        TeamDetailResponse response = teamService.rejectTeam(99, null);

        assertEquals("REJECTED", response.getStatus());
        assertNull(response.getDisqualifiedReason());
    }

    @Test
    void rejectTeam_shouldThrowResourceNotFound_whenTeamDoesNotExist() {
        when(teamRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> teamService.rejectTeam(99, new RejectTeamRequest()));

        verify(teamRepository, never()).save(any());
        verify(notificationService, never()).createNotification(anyInt(), any(), any(), any());
    }

    @Test
    void rejectTeam_shouldThrowBadRequest_whenTeamIsApproved() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "APPROVED");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));

        assertThrows(BadRequestException.class, () -> teamService.rejectTeam(99, new RejectTeamRequest()));

        verify(teamRepository, never()).save(any());
    }

    @Test
    void rejectTeam_shouldThrowBadRequest_whenTeamIsRejected() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "REJECTED");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));

        assertThrows(BadRequestException.class, () -> teamService.rejectTeam(99, new RejectTeamRequest()));

        verify(teamRepository, never()).save(any());
    }

    @Test
    void rejectTeam_shouldThrowBadRequest_whenTeamIsDisqualified() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "DISQUALIFIED");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));

        assertThrows(BadRequestException.class, () -> teamService.rejectTeam(99, new RejectTeamRequest()));

        verify(teamRepository, never()).save(any());
    }

    @Test
    void rejectTeam_shouldSetReasonNull_whenReasonIsBlank() {
        HackathonEvent event = event(1, "OPEN");
        Team team = team(99, event, track(10, event), "Seal Team", "PENDING");
        RejectTeamRequest request = new RejectTeamRequest();
        request.setReason("   ");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamRepository.save(team)).thenReturn(team);
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of());

        TeamDetailResponse response = teamService.rejectTeam(99, request);

        assertNull(response.getDisqualifiedReason());
    }

    @Test
    void disqualifyTeam_shouldDisqualifyTeamStoreReasonAndTimestamp() {
        HackathonEvent event = event(1, "OPEN");
        Team team = team(99, event, track(10, event), "Seal Team", "APPROVED");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");
        RejectTeamRequest request = new RejectTeamRequest();
        request.setReason(" Rule violation ");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamRepository.save(team)).thenReturn(team);
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader), List.of(leader));

        TeamDetailResponse response = teamService.disqualifyTeam(99, request);

        assertEquals("DISQUALIFIED", response.getStatus());
        assertEquals("Rule violation", response.getDisqualifiedReason());
        assertNotNull(response.getDisqualifiedAt());
        verify(notificationService).createNotification(eq(100), eq("Team disqualified"), any(), eq("TEAM_DISQUALIFIED"));
    }

    @Test
    void disqualifyTeam_shouldDisqualifyTeamWithNullReason_whenRequestIsNull() {
        HackathonEvent event = event(1, "OPEN");
        Team team = team(99, event, track(10, event), "Seal Team", "APPROVED");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamRepository.save(team)).thenReturn(team);
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of());

        TeamDetailResponse response = teamService.disqualifyTeam(99, null);

        assertEquals("DISQUALIFIED", response.getStatus());
        assertNull(response.getDisqualifiedReason());
        assertNotNull(response.getDisqualifiedAt());
    }

    @Test
    void disqualifyTeam_shouldThrowResourceNotFound_whenTeamDoesNotExist() {
        when(teamRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> teamService.disqualifyTeam(99, new RejectTeamRequest()));

        verify(teamRepository, never()).save(any());
        verify(notificationService, never()).createNotification(anyInt(), any(), any(), any());
    }

    @Test
    void disqualifyTeam_shouldThrowBadRequest_whenTeamIsPending() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "PENDING");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));

        assertThrows(BadRequestException.class, () -> teamService.disqualifyTeam(99, new RejectTeamRequest()));

        verify(teamRepository, never()).save(any());
    }

    @Test
    void disqualifyTeam_shouldThrowBadRequest_whenTeamIsRejected() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "REJECTED");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));

        assertThrows(BadRequestException.class, () -> teamService.disqualifyTeam(99, new RejectTeamRequest()));

        verify(teamRepository, never()).save(any());
    }

    @Test
    void disqualifyTeam_shouldThrowBadRequest_whenTeamIsAlreadyDisqualified() {
        Team team = team(99, event(1, "OPEN"), track(10, event(1, "OPEN")), "Seal Team", "DISQUALIFIED");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));

        assertThrows(BadRequestException.class, () -> teamService.disqualifyTeam(99, new RejectTeamRequest()));

        verify(teamRepository, never()).save(any());
    }

    @Test
    void disqualifyTeam_shouldSetReasonNull_whenReasonIsBlank() {
        HackathonEvent event = event(1, "OPEN");
        Team team = team(99, event, track(10, event), "Seal Team", "APPROVED");
        RejectTeamRequest request = new RejectTeamRequest();
        request.setReason("   ");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamRepository.save(team)).thenReturn(team);
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of());

        TeamDetailResponse response = teamService.disqualifyTeam(99, request);

        assertNull(response.getDisqualifiedReason());
        assertEquals("DISQUALIFIED", response.getStatus());
    }

    @Test
    void getActiveEventsWithTracks_shouldReturnAllOpenEventsRegardlessRegistrationWindow() {
        LocalDateTime now = LocalDateTime.now();
        HackathonEvent activeEvent = event(1, "OPEN");
        activeEvent.setRegistrationStart(now.minusDays(1));
        activeEvent.setRegistrationEnd(now.plusDays(1));
        HackathonEvent futureEvent = event(2, "OPEN");
        futureEvent.setRegistrationStart(now.plusDays(1));

        when(eventRepository.findAllByStatus("OPEN")).thenReturn(List.of(activeEvent, futureEvent));
        when(trackRepository.findAllByEvent_EventId(1)).thenReturn(List.of(track(10, activeEvent)));
        when(trackRepository.findAllByEvent_EventId(2)).thenReturn(List.of(track(20, futureEvent)));

        List<ActiveEventResponse> response = teamService.getActiveEventsWithTracks();

        assertEquals(2, response.size());
        assertEquals(1, response.get(0).getEventId());
        assertFalse(response.get(0).getTracks().isEmpty());
        assertEquals(2, response.get(1).getEventId());
        assertFalse(response.get(1).getTracks().isEmpty());
    }

    @Test
    void getActiveEventsWithTracks_shouldReturnOpenEvent_whenRegistrationWindowIsNull() {
        HackathonEvent event = event(1, "OPEN");
        event.setRegistrationStart(null);
        event.setRegistrationEnd(null);

        when(eventRepository.findAllByStatus("OPEN")).thenReturn(List.of(event));
        when(trackRepository.findAllByEvent_EventId(1)).thenReturn(List.of(track(10, event)));

        List<ActiveEventResponse> response = teamService.getActiveEventsWithTracks();

        assertEquals(1, response.size());
        assertEquals(1, response.get(0).getEventId());
        assertEquals(1, response.get(0).getTracks().size());
    }

    @Test
    void getActiveEventsWithTracks_shouldReturnEmptyList_whenThereAreNoOpenEvents() {
        when(eventRepository.findAllByStatus("OPEN")).thenReturn(List.of());

        List<ActiveEventResponse> response = teamService.getActiveEventsWithTracks();

        assertTrue(response.isEmpty());
        verify(trackRepository, never()).findAllByEvent_EventId(anyInt());
    }

    @Test
    void getActiveEventsWithTracks_shouldReturnExpiredOpenEventBecauseStatusIsSourceOfTruth() {
        LocalDateTime now = LocalDateTime.now();
        HackathonEvent expiredEvent = event(1, "OPEN");
        expiredEvent.setRegistrationEnd(now.minusDays(1));

        when(eventRepository.findAllByStatus("OPEN")).thenReturn(List.of(expiredEvent));
        when(trackRepository.findAllByEvent_EventId(1)).thenReturn(List.of(track(10, expiredEvent)));

        List<ActiveEventResponse> response = teamService.getActiveEventsWithTracks();

        assertEquals(1, response.size());
        assertEquals(1, response.get(0).getEventId());
        assertFalse(response.get(0).getTracks().isEmpty());
    }

    @Test
    void updateTeam_shouldClearDescription_whenDescriptionIsBlank() {
        HackathonEvent event = event(1, "OPEN");
        Team team = team(99, event, track(10, event), "Seal Team", "PENDING");
        TeamMember leader = member(1, team, user(100, "Leader"), "LEADER");
        UpdateTeamRequest request = new UpdateTeamRequest();
        request.setDescription("   ");

        when(teamRepository.findById(99)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeam_TeamId(99)).thenReturn(List.of(leader));
        when(teamMemberRepository.findByUser_UserIdAndTeam_Event_StatusIn(eq(100), anyList()))
                .thenReturn(List.of(leader));
        when(teamRepository.save(team)).thenReturn(team);

        teamService.updateTeam(100, 99, request);

        assertNull(team.getDescription());
    }

    private static CreateTeamRequest createTeamRequest(String name) {
        CreateTeamRequest request = new CreateTeamRequest();
        request.setEventId(1);
        request.setName(name);
        request.setDescription("Demo team");
        return request;
    }

    private static HackathonEvent event(Integer eventId, String status) {
        return HackathonEvent.builder()
                .eventId(eventId)
                .name("SEAL Hackathon " + eventId)
                .season("Spring")
                .year(2026)
                .description("Hackathon event")
                .startDate(LocalDateTime.now().plusDays(10))
                .endDate(LocalDateTime.now().plusDays(12))
                .status(status)
                .build();
    }

    private static Track track(Integer trackId, HackathonEvent event) {
        return Track.builder()
                .trackId(trackId)
                .event(event)
                .name("AI")
                .description("AI track")
                .build();
    }

    private static Team team(Integer teamId, HackathonEvent event, Track track, String name, String status) {
        return Team.builder()
                .teamId(teamId)
                .event(event)
                .track(track)
                .name(name)
                .description("Team description")
                .status(status)
                .createdAt(LocalDateTime.now())
                .build();
    }

    private static TeamMember member(Integer id, Team team, User user, String role) {
        return TeamMember.builder()
                .id(id)
                .team(team)
                .user(user)
                .memberRole(role)
                .joinedAt(LocalDateTime.now())
                .build();
    }

    private static User user(Integer userId, String fullName) {
        return User.builder()
                .userId(userId)
                .email("user" + userId + "@example.com")
                .fullName(fullName)
                .userType("FPT_STUDENT")
                .studentId("SE" + userId)
                .university("FPT University")
                .isActive(true)
                .isApproved(true)
                .build();
    }
}

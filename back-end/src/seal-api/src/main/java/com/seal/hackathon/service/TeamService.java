package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.CreateTeamRequest;
import com.seal.hackathon.dto.request.RejectTeamRequest;
import com.seal.hackathon.dto.response.ActiveEventResponse;
import com.seal.hackathon.dto.response.MyTeamResponse;
import com.seal.hackathon.dto.response.TeamDetailResponse;
import com.seal.hackathon.dto.response.TeamResponse;
import com.seal.hackathon.dto.response.TrackResponse;
import com.seal.hackathon.entity.*;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final HackathonEventRepository eventRepository;
    private final TrackRepository trackRepository;
    private final UserRepository userRepository;

    // ── Participant: Create team ──────────────────────────────────────

    @Transactional
    public TeamResponse createTeam(Integer userId, CreateTeamRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        HackathonEvent event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + request.getEventId()));

        if (!"OPEN".equalsIgnoreCase(event.getStatus())) {
            throw new BadRequestException("This event is not currently open for registration.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (event.getRegistrationStart() != null && now.isBefore(event.getRegistrationStart())) {
            throw new BadRequestException("Registration has not started yet.");
        }
        if (event.getRegistrationEnd() != null && now.isAfter(event.getRegistrationEnd())) {
            throw new BadRequestException("Registration deadline has passed.");
        }

        Track track = trackRepository.findById(request.getTrackId())
                .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + request.getTrackId()));

        if (!track.getEvent().getEventId().equals(event.getEventId())) {
            throw new BadRequestException("The selected track does not belong to the selected event.");
        }

        if (teamRepository.existsByEvent_EventIdAndName(request.getEventId(), request.getName().trim())) {
            throw new BadRequestException("A team named '" + request.getName() + "' already exists in this event.");
        }

        if (teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(userId, request.getEventId())) {
            throw new BadRequestException("You are already registered in a team for this event.");
        }

        Team team = Team.builder()
                .event(event)
                .track(track)
                .name(request.getName().trim())
                .description(request.getDescription())
                .status("PENDING")
                .build();
        team = teamRepository.save(team);

        TeamMember member = TeamMember.builder()
                .team(team)
                .user(user)
                .memberRole("LEADER")
                .build();
        teamMemberRepository.save(member);

        return mapToTeamResponse(team);
    }

    // ── Participant: Get my team ──────────────────────────────────────

    @Transactional(readOnly = true)
    public MyTeamResponse getMyTeam(Integer userId) {
        List<String> activeStatuses = List.of("OPEN", "IN_PROGRESS");
        List<TeamMember> myMemberships = teamMemberRepository
                .findByUser_UserIdAndTeam_Event_StatusIn(userId, activeStatuses);

        if (myMemberships.isEmpty()) {
            throw new ResourceNotFoundException("You are not currently a member of any team in an active event.");
        }

        TeamMember membership = myMemberships.get(0);
        Team team = membership.getTeam();
        List<TeamMember> allMembers = teamMemberRepository.findByTeam_TeamId(team.getTeamId());

        List<MyTeamResponse.TeamMemberInfo> memberInfos = allMembers.stream()
                .map(m -> MyTeamResponse.TeamMemberInfo.builder()
                        .userId(m.getUser().getUserId())
                        .memberName(m.getUser().getFullName())
                        .email(m.getUser().getEmail())
                        .studentType(m.getUser().getUserType())
                        .studentId(m.getUser().getStudentId())
                        .role(m.getMemberRole())
                        .joinedAt(m.getJoinedAt())
                        .build())
                .collect(Collectors.toList());

        return MyTeamResponse.builder()
                .teamId(team.getTeamId())
                .eventId(team.getEvent().getEventId())
                .eventName(team.getEvent().getName())
                .trackName(team.getTrack().getName())
                .name(team.getName())
                .teamStatus(team.getStatus())
                .members(memberInfos)
                .build();
    }

    // ── Coordinator: Get all teams by event ──────────────────────────

    @Transactional(readOnly = true)
    public List<TeamDetailResponse> getTeamsByEvent(Integer eventId) {
        eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        return teamRepository.findAllByEvent_EventId(eventId).stream()
                .map(this::mapToDetailResponse)
                .collect(Collectors.toList());
    }

    // ── Coordinator: Get single team ─────────────────────────────────

    @Transactional(readOnly = true)
    public TeamDetailResponse getTeamById(Integer teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        return mapToDetailResponse(team);
    }

    // ── Coordinator: Approve team ────────────────────────────────────

    @Transactional
    public TeamDetailResponse approveTeam(Integer teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        if ("APPROVED".equalsIgnoreCase(team.getStatus())) {
            throw new BadRequestException("Team is already approved.");
        }
        team.setStatus("APPROVED");
        teamRepository.save(team);
        return mapToDetailResponse(team);
    }

    // ── Coordinator: Reject team ─────────────────────────────────────

    @Transactional
    public TeamDetailResponse rejectTeam(Integer teamId, RejectTeamRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        team.setStatus("REJECTED");
        if (request != null && request.getReason() != null) {
            team.setDisqualifiedReason(request.getReason());
        }
        teamRepository.save(team);
        return mapToDetailResponse(team);
    }

    // ── Coordinator: Disqualify team ─────────────────────────────────

    @Transactional
    public TeamDetailResponse disqualifyTeam(Integer teamId, RejectTeamRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        team.setStatus("DISQUALIFIED");
        if (request != null && request.getReason() != null) {
            team.setDisqualifiedReason(request.getReason());
        }
        team.setDisqualifiedAt(LocalDateTime.now());
        teamRepository.save(team);
        return mapToDetailResponse(team);
    }

    // ── Participant: Get active events with tracks ────────────────────

    @Transactional(readOnly = true)
    public List<ActiveEventResponse> getActiveEventsWithTracks() {
        List<HackathonEvent> activeEvents = eventRepository.findAllByStatus("OPEN");
        return activeEvents.stream()
                .map(event -> {
                    List<Track> tracks = trackRepository.findAllByEvent_EventId(event.getEventId());
                    List<TrackResponse> trackResponses = tracks.stream()
                            .map(t -> TrackResponse.builder()
                                    .trackId(t.getTrackId())
                                    .eventId(t.getEvent().getEventId())
                                    .name(t.getName())
                                    .description(t.getDescription())
                                    .build())
                            .collect(Collectors.toList());
                    return ActiveEventResponse.builder()
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
                            .tracks(trackResponses)
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private TeamResponse mapToTeamResponse(Team team) {
        return TeamResponse.builder()
                .teamId(team.getTeamId())
                .eventId(team.getEvent().getEventId())
                .eventName(team.getEvent().getName())
                .trackId(team.getTrack().getTrackId())
                .trackName(team.getTrack().getName())
                .name(team.getName())
                .description(team.getDescription())
                .status(team.getStatus())
                .createdAt(team.getCreatedAt())
                .build();
    }

    private TeamDetailResponse mapToDetailResponse(Team team) {
        List<TeamMember> members = teamMemberRepository.findByTeam_TeamId(team.getTeamId());
        List<TeamDetailResponse.MemberInfo> memberInfos = members.stream()
                .map(m -> TeamDetailResponse.MemberInfo.builder()
                        .userId(m.getUser().getUserId())
                        .fullName(m.getUser().getFullName())
                        .email(m.getUser().getEmail())
                        .memberRole(m.getMemberRole())
                        .joinedAt(m.getJoinedAt())
                        .build())
                .collect(Collectors.toList());

        return TeamDetailResponse.builder()
                .teamId(team.getTeamId())
                .eventId(team.getEvent().getEventId())
                .eventName(team.getEvent().getName())
                .trackId(team.getTrack().getTrackId())
                .trackName(team.getTrack().getName())
                .name(team.getName())
                .description(team.getDescription())
                .status(team.getStatus())
                .disqualifiedReason(team.getDisqualifiedReason())
                .disqualifiedAt(team.getDisqualifiedAt())
                .createdAt(team.getCreatedAt())
                .members(memberInfos)
                .build();
    }
}

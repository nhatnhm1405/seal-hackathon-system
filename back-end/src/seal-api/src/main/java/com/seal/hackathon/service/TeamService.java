package com.seal.hackathon.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.seal.hackathon.dto.request.CreateTeamRequest;
import com.seal.hackathon.dto.request.TeamStatusReasonRequest;
import com.seal.hackathon.dto.response.ActiveEventResponse;
import com.seal.hackathon.dto.response.MyTeamResponse;
import com.seal.hackathon.dto.response.TeamDetailResponse;
import com.seal.hackathon.dto.response.TeamListResponse;
import com.seal.hackathon.dto.response.TeamResponse;
import com.seal.hackathon.dto.response.TeamSummaryResponse;
import com.seal.hackathon.dto.response.TrackResponse;
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

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TeamService {

    private static final String EVENT_STATUS_PUBLISHED = "PUBLISHED";
    private static final String TEAM_STATUS_APPROVED = "APPROVED";
    private static final String TEAM_STATUS_REJECTED = "REJECTED";
    private static final String TEAM_STATUS_DISQUALIFIED = "DISQUALIFIED";
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final HackathonEventRepository eventRepository;
    private final TrackRepository trackRepository;
    private final UserRepository userRepository;
    private final HackathonEventRepository hackathonEventRepository;

    @Transactional
    public TeamResponse createTeam(Integer userId, CreateTeamRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        HackathonEvent event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + request.getEventId()));

        // Validate event status
        if (!EVENT_STATUS_PUBLISHED.equalsIgnoreCase(event.getStatus())) {
            throw new BadRequestException("This event is not currently open for registration.");
        }

        // Validate current time is within registration start/end (if configured)
        LocalDateTime now = LocalDateTime.now();
        if (event.getRegistrationStart() != null && now.isBefore(event.getRegistrationStart())) {
            throw new BadRequestException("Registration has not started yet.");
        }
        if (event.getRegistrationEnd() != null && now.isAfter(event.getRegistrationEnd())) {
            throw new BadRequestException("Registration deadline has passed.");
        }

        Track track = trackRepository.findById(request.getTrackId())
                .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + request.getTrackId()));

        // Verify track belongs to event
        if (!track.getEvent().getEventId().equals(event.getEventId())) {
            throw new BadRequestException("The selected track does not belong to the selected event.");
        }

        // Verify team name uniqueness in the event (case-insensitive)
        if (teamRepository.existsByEvent_EventIdAndNameIgnoreCase(request.getEventId(), request.getName().trim())) {
            throw new BadRequestException("A team with the name '" + request.getName() + "' already exists in this event.");
        }

        // Verify user is not already in a team for this event
        if (teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(userId, request.getEventId())) {
            throw new BadRequestException("You are already registered in a team for this event.");
        }

        // Save Team
        Team team = Team.builder()
                .event(event)
                .track(track)
                .name(request.getName().trim())
                .description(request.getDescription())
                .status("PENDING")
                .build();
        team = teamRepository.save(team);

        // Save Team Member as LEADER
        TeamMember member = TeamMember.builder()
                .team(team)
                .user(user)
                .memberRole("LEADER")
                .build();
        teamMemberRepository.save(member);

        return mapToTeamResponse(team);
    }

    @Transactional(readOnly = true)
    public List<ActiveEventResponse> getActiveEventsWithTracks() {
        List<HackathonEvent> activeEvents = eventRepository.findAllByStatus(EVENT_STATUS_PUBLISHED);
        return activeEvents.stream()
                .map(event -> {
                    List<Track> tracks = trackRepository.findAllByEvent_EventId(event.getEventId());
                    List<TrackResponse> trackResponses = tracks.stream()
                            .map(t -> TrackResponse.builder()
                            .trackId(t.getTrackId())
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

    // ---------------------------------------------------------------
    // Get My Team (active event only — 1 participant = 1 team per event)
    // ---------------------------------------------------------------
    /**
     * Returns the newest team the given user belongs to.
     *
     * Business rule: a participant can only join 1 team → 1 track per event.
     */
    @Transactional(readOnly = true)
    public MyTeamResponse getMyTeam(Integer userId) {
        // 1. Find the user's TeamMember records, newest team first.
        List<TeamMember> myMemberships = teamMemberRepository
                .findByUser_UserIdOrderByTeam_CreatedAtDesc(userId);

        if (myMemberships.isEmpty()) {
            throw new ResourceNotFoundException(
                    "You are not currently a member of any team.");
        }

        // 2. Take the newest membership.
        TeamMember membership = myMemberships.get(0);
        Team team = membership.getTeam();

        // 3. Load all members of this team
        List<TeamMember> allMembers = teamMemberRepository
                .findByTeam_TeamId(team.getTeamId());

        List<MyTeamResponse.TeamMemberInfo> memberInfos = allMembers.stream()
                .map(m -> MyTeamResponse.TeamMemberInfo.builder()
                .memberName(m.getUser().getFullName())
                .role(m.getMemberRole())
                .build())
                .collect(Collectors.toList());

        return MyTeamResponse.builder()
                .teamId(team.getTeamId())
                .trackName(team.getTrack().getName())
                .name(team.getName())
                .status(team.getStatus())
                .rejectedReason(team.getRejectedReason())
                .rejectedAt(team.getRejectedAt())
                .disqualifiedReason(team.getDisqualifiedReason())
                .disqualifiedAt(team.getDisqualifiedAt())
                .members(memberInfos)
                .build();
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------
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

    @Transactional(readOnly = true)
    public TeamListResponse getTeams(Integer eventId, Integer trackId, String status) {
        // 1. Validate inputs
        if (eventId == null) {
            throw new BadRequestException("Event ID is required.");
        }
        if (trackId == null) {
            throw new BadRequestException("Track ID is required.");
        }
        if (eventId <= 0) {
            throw new BadRequestException("Event ID must be positive.");
        }
        if (trackId <= 0) {
            throw new BadRequestException("Track ID must be positive.");
        }
        // 2 & 3. Find Event and Track
        HackathonEvent event = hackathonEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + eventId));
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new ResourceNotFoundException("Track not found with id: " + trackId));
        // 4. Check if Track belongs to Event
        if (!track.getEvent().getEventId().equals(event.getEventId())) {
            throw new BadRequestException("The selected track does not belong to the selected event.");
        }
        // 5. Query and filter by status
        List<Team> teams;
        if (status == null || status.trim().isBlank()) {
            teams = teamRepository.findByEvent_EventIdAndTrack_TrackIdOrderByCreatedAtDesc(eventId, trackId);
        } else {
            String normalizedStatus = status.trim().toUpperCase();
            List<String> allowedStatuses = List.of("PENDING", "APPROVED", "REJECTED", "DISQUALIFIED");

            if (!allowedStatuses.contains(normalizedStatus)) {
                throw new BadRequestException("Invalid team status. Allowed values are PENDING, APPROVED, REJECTED and DISQUALIFIED.");
            }
            teams = teamRepository.findByEvent_EventIdAndTrack_TrackIdAndStatusOrderByCreatedAtDesc(eventId, trackId, normalizedStatus);
        }
        // 6. Map List<Team> sang List<TeamSummaryResponse>
        List<TeamSummaryResponse> teamResponses = teams.stream()
                .map(team -> TeamSummaryResponse.builder()
                .teamId(team.getTeamId())
                .name(team.getName())
                .description(team.getDescription())
                .status(team.getStatus())
                .createdAt(team.getCreatedAt())
                .build())
                .collect(Collectors.toList());
        // 7. Trả về response theo đúng sample
        return TeamListResponse.builder()
                .eventId(event.getEventId())
                .eventName(event.getName())
                .trackId(track.getTrackId())
                .trackName(track.getName())
                .total(teamResponses.size())
                .teams(teamResponses)
                .build();
    }

    @Transactional(readOnly = true)
    public TeamDetailResponse getTeamById(Integer teamId) {
        Team team = getTeamOrThrow(teamId);
        return mapToTeamDetailResponse(team);
    }

    private Team getTeamOrThrow(Integer teamId) {
        if (teamId == null || teamId <= 0) {
            throw new BadRequestException("Team ID must be positive.");
        }
        return teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));
    }

    private String validateReason(TeamStatusReasonRequest request) {
        if (request == null || request.getReason() == null || request.getReason().trim().isBlank()) {
            throw new BadRequestException("Reason is required.");
        }
        String reason = request.getReason().trim();
        if (reason.length() > 1000) {
            throw new BadRequestException("Reason must not exceed 1000 characters.");
        }
        return reason;
    }

    private TeamDetailResponse mapToTeamDetailResponse(Team team) {
        List<TeamMember> members = teamMemberRepository.findByTeam_TeamId(team.getTeamId());

        List<TeamDetailResponse.MemberInfo> mappedMembers = members.stream()
                .map(member -> TeamDetailResponse.MemberInfo.builder()
                .fullName(member.getUser().getFullName())
                .role(member.getMemberRole())
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
                .rejectedReason(team.getRejectedReason())
                .rejectedAt(team.getRejectedAt())
                .disqualifiedReason(team.getDisqualifiedReason())
                .disqualifiedAt(team.getDisqualifiedAt())
                .createdAt(team.getCreatedAt())
                .members(mappedMembers)
                .build();
    }

    @Transactional
    public TeamDetailResponse approveTeam(Integer teamId) {
        Team team = getTeamOrThrow(teamId);

        team.setStatus(TEAM_STATUS_APPROVED);

        // Clear old rejection/disqualification data when coordinator corrects status.
        team.setRejectedReason(null);
        team.setRejectedAt(null);
        team.setDisqualifiedReason(null);
        team.setDisqualifiedAt(null);

        Team savedTeam = teamRepository.save(team);
        return mapToTeamDetailResponse(savedTeam);
    }

    @Transactional
    public TeamDetailResponse rejectTeam(Integer teamId, TeamStatusReasonRequest request) {
        Team team = getTeamOrThrow(teamId);
        String reason = validateReason(request);

        team.setStatus(TEAM_STATUS_REJECTED);
        team.setRejectedReason(reason);
        team.setRejectedAt(LocalDateTime.now());

        // Clear disqualification data because current status is now REJECTED.
        team.setDisqualifiedReason(null);
        team.setDisqualifiedAt(null);

        Team savedTeam = teamRepository.save(team);
        return mapToTeamDetailResponse(savedTeam);
    }

    @Transactional
    public TeamDetailResponse disqualifyTeam(Integer teamId, TeamStatusReasonRequest request) {
        Team team = getTeamOrThrow(teamId);
        String reason = validateReason(request);

        team.setStatus(TEAM_STATUS_DISQUALIFIED);
        team.setDisqualifiedReason(reason);
        team.setDisqualifiedAt(LocalDateTime.now());

        // Clear rejection data because current status is now DISQUALIFIED.
        team.setRejectedReason(null);
        team.setRejectedAt(null);

        Team savedTeam = teamRepository.save(team);
        return mapToTeamDetailResponse(savedTeam);
    }
}

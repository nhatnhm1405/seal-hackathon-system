package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.CreateTeamRequest;
import com.seal.hackathon.dto.request.RejectTeamRequest;
import com.seal.hackathon.dto.response.ActiveEventResponse;
import com.seal.hackathon.dto.response.MyTeamResponse;
import com.seal.hackathon.dto.response.TeamDetailResponse;
import com.seal.hackathon.dto.request.UpdateTeamRequest;
import com.seal.hackathon.dto.response.TeamResponse;
import com.seal.hackathon.dto.response.TrackResponse;
import com.seal.hackathon.dto.response.UserResponse;
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
                .status(team.getStatus())
                .myRole(membership.getMemberRole())
                .members(memberInfos)
                .build();
    }

    // ── Participant: team management (leader unless noted) ────────────

    /** Leader edits the team name / description. */
    @Transactional
    public MyTeamResponse updateTeam(Integer userId, Integer teamId, UpdateTeamRequest request) {
        Team team = requireLeader(userId, teamId);
        if ("REJECTED".equalsIgnoreCase(team.getStatus()) || "DISQUALIFIED".equalsIgnoreCase(team.getStatus())) {
            throw new BadRequestException("This team can no longer be edited.");
        }
        if (request.getName() != null && !request.getName().isBlank()) {
            String newName = request.getName().trim();
            if (!newName.equals(team.getName())
                    && teamRepository.existsByEvent_EventIdAndName(team.getEvent().getEventId(), newName)) {
                throw new BadRequestException("A team named '" + newName + "' already exists in this event.");
            }
            team.setName(newName);
        }
        if (request.getDescription() != null) {
            team.setDescription(request.getDescription().isBlank() ? null : request.getDescription().trim());
        }
        teamRepository.save(team);
        return getMyTeam(userId);
    }

    /** Leader removes a MEMBER (not themselves, not another leader). */
    @Transactional
    public MyTeamResponse removeMember(Integer leaderUserId, Integer teamId, Integer targetUserId) {
        requireLeader(leaderUserId, teamId);
        if (leaderUserId.equals(targetUserId)) {
            throw new BadRequestException("The leader cannot remove themselves. Transfer leadership or leave the team.");
        }
        TeamMember target = teamMemberRepository.findByTeam_TeamId(teamId).stream()
                .filter(m -> m.getUser().getUserId().equals(targetUserId))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("That user is not a member of this team."));
        if ("LEADER".equalsIgnoreCase(target.getMemberRole())) {
            throw new BadRequestException("Cannot remove the team leader.");
        }
        teamMemberRepository.delete(target);
        return getMyTeam(leaderUserId);
    }

    /** Leader hands leadership to an existing member and becomes a member. */
    @Transactional
    public MyTeamResponse transferLeadership(Integer leaderUserId, Integer teamId, Integer newLeaderUserId) {
        requireLeader(leaderUserId, teamId);
        if (leaderUserId.equals(newLeaderUserId)) {
            throw new BadRequestException("You are already the leader.");
        }
        List<TeamMember> members = teamMemberRepository.findByTeam_TeamId(teamId);
        TeamMember me = members.stream().filter(m -> m.getUser().getUserId().equals(leaderUserId)).findFirst()
                .orElseThrow(() -> new BadRequestException("You are not a member of this team."));
        TeamMember target = members.stream().filter(m -> m.getUser().getUserId().equals(newLeaderUserId)).findFirst()
                .orElseThrow(() -> new BadRequestException("The new leader must be a member of this team."));
        me.setMemberRole("MEMBER");
        target.setMemberRole("LEADER");
        teamMemberRepository.save(me);
        teamMemberRepository.save(target);
        return getMyTeam(leaderUserId);
    }

    /**
     * A member leaves the team. The leader must transfer leadership first unless
     * they are the only member, in which case the (empty) team is disbanded.
     */
    @Transactional
    public void leaveTeam(Integer userId, Integer teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        List<TeamMember> members = teamMemberRepository.findByTeam_TeamId(teamId);
        TeamMember me = members.stream().filter(m -> m.getUser().getUserId().equals(userId)).findFirst()
                .orElseThrow(() -> new BadRequestException("You are not a member of this team."));

        if ("LEADER".equalsIgnoreCase(me.getMemberRole())) {
            if (members.size() > 1) {
                throw new BadRequestException("Transfer leadership before leaving the team.");
            }
            teamMemberRepository.delete(me);
            teamRepository.delete(team);
            return;
        }
        teamMemberRepository.delete(me);
    }

    /** Search active student accounts a participant may invite. */
    @Transactional(readOnly = true)
    public List<UserResponse> searchInvitableUsers(String query) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        return userRepository.searchInvitableStudents(query.trim().toLowerCase()).stream()
                .limit(10)
                .map(u -> UserResponse.builder()
                        .userId(u.getUserId())
                        .fullName(u.getFullName())
                        .email(u.getEmail())
                        .studentId(u.getStudentId())
                        .university(u.getUniversity())
                        .userType(u.getUserType())
                        .build())
                .collect(Collectors.toList());
    }

    /** Loads the team and asserts the given user is its LEADER. */
    private Team requireLeader(Integer userId, Integer teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        TeamMember me = teamMemberRepository.findByTeam_TeamId(teamId).stream()
                .filter(m -> m.getUser().getUserId().equals(userId))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("You are not a member of this team."));
        if (!"LEADER".equalsIgnoreCase(me.getMemberRole())) {
            throw new BadRequestException("Only the team leader can perform this action.");
        }
        return team;
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
        LocalDateTime now = LocalDateTime.now();
        List<HackathonEvent> activeEvents = eventRepository.findAllByStatus("OPEN");
        return activeEvents.stream()
                // Only OPEN events whose registration window currently includes "now"
                // — so the create-team list matches what can actually be registered.
                .filter(event -> event.getRegistrationStart() == null || !now.isBefore(event.getRegistrationStart()))
                .filter(event -> event.getRegistrationEnd() == null || !now.isAfter(event.getRegistrationEnd()))
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

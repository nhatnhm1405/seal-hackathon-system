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
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final HackathonEventRepository eventRepository;
    private final TrackRepository trackRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    // ── Participant: Create team ──────────────────────────────────────

    @Transactional
    public TeamResponse createTeam(Integer userId, CreateTeamRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        HackathonEvent event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + request.getEventId()));

        // Registration is gated purely by event status — OPEN means "accepting
        // teams". Dates (registrationStart/End) are informational only.
        if (!"OPEN".equalsIgnoreCase(event.getStatus())) {
            throw new BadRequestException("This event is not currently open for registration.");
        }

        // Teams register WITHOUT a track. Track is assigned later during SETUP —
        // either the leader self-selects (SELF_SELECT) or the coordinator draws
        // (RANDOM) — once the roster is frozen and per-track slots are computed.

        String teamName = request.getName().trim();
        if (teamRepository.existsByEventIdAndNormalizedName(request.getEventId(), normalizeName(teamName))) {
            throw new BadRequestException("A team named '" + request.getName() + "' already exists in this event.");
        }

        if (teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(userId, request.getEventId())) {
            throw new BadRequestException("You are already registered in a team for this event.");
        }

        Team team = Team.builder()
                .event(event)
                .track(null)
                .name(teamName)
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
        List<String> activeStatuses = List.of("OPEN", "SETUP", "IN_PROGRESS");
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
                .trackName(team.getTrack() != null ? team.getTrack().getName() : null)
                .name(team.getName())
                .eventStatus(team.getEvent().getStatus())
                .trackSelectionMode(team.getEvent().getTrackSelectionMode())
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
        ensureTeamManageable(team);
        if (request.getName() != null && !request.getName().isBlank()) {
            String newName = request.getName().trim();
            String normalizedOldName = normalizeName(team.getName());
            String normalizedNewName = normalizeName(newName);
            if (!normalizedNewName.equals(normalizedOldName)
                    && teamRepository.existsByEventIdAndNormalizedName(team.getEvent().getEventId(), normalizedNewName)) {
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
        Team team = requireLeader(leaderUserId, teamId);
        ensureTeamManageable(team);
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
        Team team = requireLeader(leaderUserId, teamId);
        ensureTeamManageable(team);
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
        ensureTeamManageable(team);
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

    private void ensureTeamManageable(Team team) {
        if ("REJECTED".equalsIgnoreCase(team.getStatus()) || "DISQUALIFIED".equalsIgnoreCase(team.getStatus())) {
            throw new BadRequestException("This team can no longer be managed.");
        }
    }

    private String normalizeName(String name) {
        return name == null ? "" : name.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeReason(String reason) {
        String trimmed = reason.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

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
        if (!"PENDING".equalsIgnoreCase(team.getStatus())) {
            throw new BadRequestException("Only pending teams can be approved.");
        }
        team.setStatus("APPROVED");
        teamRepository.save(team);
        notifyTeamMembers(
                team,
                "Team approved",
                "Your team '" + team.getName() + "' has been approved for " +
                        team.getEvent().getName() + ".",
                "TEAM_APPROVED"
        );
        return mapToDetailResponse(team);
    }

    // ── Coordinator: Reject team ─────────────────────────────────────

    @Transactional
    public TeamDetailResponse rejectTeam(Integer teamId, RejectTeamRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        if (!"PENDING".equalsIgnoreCase(team.getStatus())) {
            throw new BadRequestException("Only pending teams can be rejected.");
        }
        team.setStatus("REJECTED");
        if (request != null && request.getReason() != null) {
            team.setDisqualifiedReason(normalizeReason(request.getReason()));
        }
        teamRepository.save(team);
        String reason = team.getDisqualifiedReason();
        notifyTeamMembers(
                team,
                "Team rejected",
                "Your team '" + team.getName() + "' was rejected." +
                        (reason != null && !reason.isBlank() ? " Reason: " + reason : ""),
                "TEAM_REJECTED"
        );
        return mapToDetailResponse(team);
    }

    // ── Coordinator: Disqualify team ─────────────────────────────────

    @Transactional
    public TeamDetailResponse disqualifyTeam(Integer teamId, RejectTeamRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        if (!"APPROVED".equalsIgnoreCase(team.getStatus())) {
            throw new BadRequestException("Only approved teams can be disqualified.");
        }
        team.setStatus("DISQUALIFIED");
        if (request != null && request.getReason() != null) {
            team.setDisqualifiedReason(normalizeReason(request.getReason()));
        }
        team.setDisqualifiedAt(LocalDateTime.now());
        teamRepository.save(team);
        String reason = team.getDisqualifiedReason();
        notifyTeamMembers(
                team,
                "Team disqualified",
                "Your team '" + team.getName() + "' was disqualified." +
                        (reason != null && !reason.isBlank() ? " Reason: " + reason : ""),
                "TEAM_DISQUALIFIED"
        );
        return mapToDetailResponse(team);
    }

    // ── Coordinator: Random track draw (SETUP phase) ─────────────────

    /**
     * Randomly assigns teams to the event's tracks in a balanced way. Only allowed
     * while the event is in SETUP status (registration closed, tracks not yet locked
     * for competition). Rejected/disqualified teams are excluded.
     *
     * @param includeAssigned when false (default), only teams without a track are
     *                        drawn (teams that self-selected keep their choice);
     *                        when true, every eligible team is re-shuffled.
     */
    @Transactional
    public List<TeamResponse> drawTracks(Integer eventId, boolean includeAssigned) {
        HackathonEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        if (!"SETUP".equalsIgnoreCase(event.getStatus())) {
            throw new BadRequestException(
                    "Track draw is only allowed while the event is in SETUP status.");
        }

        List<Track> tracks = trackRepository.findAllByEvent_EventId(eventId);
        if (tracks.isEmpty()) {
            throw new BadRequestException("Cannot draw tracks: the event has no tracks.");
        }

        // Only approved teams are placed; track capacities were frozen on SETUP entry.
        List<Team> approved = teamRepository.findAllByEvent_EventIdAndStatus(eventId, "APPROVED");

        Map<Integer, Integer> count = new HashMap<>();
        tracks.forEach(t -> count.put(t.getTrackId(), 0));

        List<Team> toAssign = new ArrayList<>();
        for (Team team : approved) {
            if (includeAssigned) {
                team.setTrack(null);
            }
            if (team.getTrack() == null) {
                toAssign.add(team);
            } else {
                count.merge(team.getTrack().getTrackId(), 1, Integer::sum);
            }
        }

        if (toAssign.isEmpty()) {
            throw new BadRequestException("No unassigned teams to draw.");
        }

        // Greedy balance: each team goes to the track with the most free slots,
        // never exceeding capacity. Equivalent to round-robin when starting empty.
        Collections.shuffle(toAssign);
        for (Team team : toAssign) {
            Track best = null;
            int bestFree = Integer.MIN_VALUE;
            for (Track t : tracks) {
                int cap = t.getCapacity() != null ? t.getCapacity() : Integer.MAX_VALUE;
                int free = cap - count.get(t.getTrackId());
                if (free > bestFree) {
                    bestFree = free;
                    best = t;
                }
            }
            if (best == null || bestFree <= 0) {
                throw new BadRequestException(
                        "Not enough track capacity to assign all teams. Re-check tracks or approvals.");
            }
            team.setTrack(best);
            count.merge(best.getTrackId(), 1, Integer::sum);
        }
        teamRepository.saveAll(toAssign);

        return toAssign.stream().map(this::mapToTeamResponse).collect(Collectors.toList());
    }

    /** SELF_SELECT: a team leader picks the team's track during SETUP. */
    @Transactional
    public MyTeamResponse selectTrack(Integer userId, Integer teamId, Integer trackId) {
        Team team = requireLeader(userId, teamId);
        HackathonEvent event = team.getEvent();

        if (!"SETUP".equalsIgnoreCase(event.getStatus())) {
            throw new BadRequestException("Track selection is only open during the SETUP phase.");
        }
        if (!"SELF_SELECT".equalsIgnoreCase(event.getTrackSelectionMode())) {
            throw new BadRequestException(
                    "This event assigns tracks by random draw — leaders cannot pick a track.");
        }
        if (!"APPROVED".equalsIgnoreCase(team.getStatus())) {
            throw new BadRequestException("Only approved teams can select a track.");
        }

        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + trackId));
        if (!track.getEvent().getEventId().equals(event.getEventId())) {
            throw new BadRequestException("The selected track does not belong to this event.");
        }

        if (track.getCapacity() != null) {
            long current = teamRepository.findAllByTrack_TrackIdAndStatus(trackId, "APPROVED").stream()
                    .filter(t -> !t.getTeamId().equals(teamId))
                    .count();
            if (current >= track.getCapacity()) {
                throw new BadRequestException("This track is full. Please choose another track.");
            }
        }

        team.setTrack(track);
        teamRepository.save(team);
        return getMyTeam(userId);
    }

    // ── Participant: Get active events with tracks ────────────────────

    @Transactional(readOnly = true)
    public List<ActiveEventResponse> getActiveEventsWithTracks() {
        // OPEN status is the single source of truth for "registration open" — the
        // list of joinable events matches exactly what createTeam will accept.
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
                                    .capacity(t.getCapacity())
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
                .trackId(team.getTrack() != null ? team.getTrack().getTrackId() : null)
                .trackName(team.getTrack() != null ? team.getTrack().getName() : null)
                .name(team.getName())
                .description(team.getDescription())
                .status(team.getStatus())
                .createdAt(team.getCreatedAt())
                .build();
    }

    private void notifyTeamMembers(Team team, String title, String content, String type) {
        teamMemberRepository.findByTeam_TeamId(team.getTeamId())
                .forEach(member -> notificationService.createNotification(
                        member.getUser().getUserId(),
                        title,
                        content,
                        type
                ));
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
                .trackId(team.getTrack() != null ? team.getTrack().getTrackId() : null)
                .trackName(team.getTrack() != null ? team.getTrack().getName() : null)
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

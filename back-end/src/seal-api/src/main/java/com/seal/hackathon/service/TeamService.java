package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.CreateTeamRequest;
import com.seal.hackathon.dto.request.RejectTeamRequest;
import com.seal.hackathon.dto.response.ActiveEventResponse;
import com.seal.hackathon.dto.response.MyTeamResponse;
import com.seal.hackathon.dto.response.TeamDetailResponse;
import com.seal.hackathon.dto.response.TeamHistoryResponse;
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
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamEventEntryRepository teamEventEntryRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final HackathonEventRepository eventRepository;
    private final TrackRepository trackRepository;
    private final UserRepository userRepository;
    private final RoundResultRepository roundResultRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final RoundRepository roundRepository;
    private final JoinRequestRepository joinRequestRepository;
    private final TeamInviteRepository teamInviteRepository;
    private final TeamRejoinRequestRepository teamRejoinRequestRepository;
    private final ParticipantHistorySnapshotService participantHistorySnapshotService;

    // ── Participant: Create team ──────────────────────────────────────

    @Transactional
    public TeamResponse createTeam(Integer userId, CreateTeamRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (!Boolean.TRUE.equals(user.getIsApproved()) || !Boolean.TRUE.equals(user.getIsActive())) {
            throw new BadRequestException("Your account is not approved or is read-only.");
        }

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
        if (teamEventEntryRepository.existsByEventIdAndNormalizedName(request.getEventId(), normalizeName(teamName))) {
            throw new BadRequestException("A team named '" + request.getName() + "' already exists in this event.");
        }

        if (teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(userId, request.getEventId())) {
            throw new BadRequestException("You are already registered in a team for this event.");
        }

        Team team = Team.builder()
                .name(teamName)
                .description(request.getDescription())
                .build();
        team = teamRepository.save(team);

        TeamEventEntry entry = TeamEventEntry.builder()
                .team(team)
                .event(event)
                .track(null)
                .status("PENDING")
                .build();
        entry = teamEventEntryRepository.save(entry);

        TeamMember member = TeamMember.builder()
                .team(team)
                .user(user)
                .memberRole("LEADER")
                .build();
        teamMemberRepository.save(member);

        return mapToTeamResponse(team, entry);
    }

    // ── Participant: live team-name availability check ────────────────
    // Mirrors the register-page student-id check: lets the create-team form warn
    // about a duplicate before submit. Uses the same normalized (case/space
    // insensitive) match the create path enforces, so the two never disagree.
    @Transactional(readOnly = true)
    public boolean teamNameExists(Integer eventId, String name) {
        if (eventId == null || name == null || name.isBlank()) return false;
        return teamEventEntryRepository.existsByEventIdAndNormalizedName(eventId, normalizeName(name));
    }

    // ── Participant: Get my team ──────────────────────────────────────

    /**
     * Tier 1: any membership with a live-season entry (OPEN/SETUP/IN_PROGRESS) —
     * the common case, unchanged. Tier 2 (fallback, only when tier 1 is empty):
     * the user's most recent team membership regardless of season, resolved via
     * its most recent entry (which may belong to a COMPLETED event) — so a
     * dormant team's identity/roster still surfaces read-only instead of 404ing,
     * letting a leader find their way to a rejoin request instead of being
     * routed into "create a new team" and silently orphaning their old roster row.
     */
    @Transactional(readOnly = true)
    public MyTeamResponse getMyTeam(Integer userId) {
        List<String> currentStatuses = List.of("OPEN", "SETUP", "IN_PROGRESS");
        List<TeamMember> myMemberships = teamMemberRepository
                .findByUser_UserIdAndTeam_Event_StatusIn(userId, currentStatuses);

        if (!myMemberships.isEmpty()) {
            TeamMember membership = myMemberships.stream()
                    .max(Comparator.comparing(
                            TeamMember::getId,
                            Comparator.nullsLast(Comparator.naturalOrder())))
                    .orElseThrow(() -> new ResourceNotFoundException("You are not currently a member of any team."));
            return mapToMyTeamResponse(membership);
        }

        return teamMemberRepository.findByUser_UserIdOrderByIdDesc(userId).stream()
                .findFirst()
                .map(this::mapToMyTeamResponse)
                .orElseThrow(() -> new ResourceNotFoundException("You are not currently a member of any team."));
    }

    @Transactional(readOnly = true)
    public List<MyTeamResponse> getMyTeamHistory(Integer userId) {
        return teamMemberRepository.findByUser_UserIdOrderByIdDesc(userId).stream()
                .map(this::mapToMyTeamResponse)
                .collect(Collectors.toList());
    }

    /**
     * Merges two sources per event id: entries still live on a team (computed
     * fresh, one row per {@link TeamEventEntry} the member actually competed
     * during — see {@link #computeLiveHistory}), and frozen snapshots taken at
     * departure or event completion (see {@link ParticipantHistorySnapshotService}).
     * Live wins whenever the event isn't currently COMPLETED (covers a
     * temporarily reopened event so it doesn't show a stale snapshot); a
     * snapshot wins once the event is COMPLETED (stable, immune to a
     * departed member's TeamMember row having since been deleted); a live row
     * is the fallback for a COMPLETED event that predates this feature and
     * has no snapshot yet (until the admin backfill runs).
     */
    @Transactional(readOnly = true)
    public List<TeamHistoryResponse> getMyResultHistory(Integer userId) {
        Map<Integer, TeamHistoryResponse> liveByEvent = new LinkedHashMap<>();
        for (TeamHistoryResponse row : computeLiveHistory(userId)) {
            liveByEvent.put(row.getEventId(), row);
        }
        Map<Integer, TeamHistoryResponse> snapshotByEvent = participantHistorySnapshotService.getSnapshotsForUser(userId);

        Set<Integer> allEventIds = new LinkedHashSet<>(liveByEvent.keySet());
        allEventIds.addAll(snapshotByEvent.keySet());

        List<TeamHistoryResponse> merged = new ArrayList<>();
        for (Integer eventId : allEventIds) {
            TeamHistoryResponse live = liveByEvent.get(eventId);
            if (live != null && !"COMPLETED".equalsIgnoreCase(live.getEventStatus())) {
                merged.add(live);
            } else if (snapshotByEvent.containsKey(eventId)) {
                merged.add(snapshotByEvent.get(eventId));
            } else if (live != null) {
                merged.add(live);
            }
        }
        merged.sort(Comparator.comparing(TeamHistoryResponse::getEventId, Comparator.nullsLast(Comparator.reverseOrder())));
        return merged;
    }

    // One row per TeamEventEntry the member actually competed during, not one
    // row per team — a rejoined team has multiple entries, and each season's
    // result data must stay on its own row. Entry resolution/filtering lives
    // in ParticipantHistorySnapshotService, shared with snapshotDeparture so
    // a departure snapshot always covers the exact same seasons this live
    // path would have shown a moment earlier.
    private List<TeamHistoryResponse> computeLiveHistory(Integer userId) {
        List<TeamMember> memberships = teamMemberRepository.findByUser_UserIdOrderByIdDesc(userId);
        List<TeamHistoryResponse> history = new ArrayList<>();

        for (TeamMember membership : memberships) {
            for (TeamEventEntry entry : participantHistorySnapshotService.resolveEntriesForMembership(membership)) {
                history.add(participantHistorySnapshotService.buildHistoryView(membership, entry));
            }
        }
        return history;
    }

    @Transactional(readOnly = true)
    public MyTeamResponse getMyTeamByEvent(Integer userId, Integer eventId) {
        return teamMemberRepository.findByUser_UserIdOrderByIdDesc(userId).stream()
                .flatMap(m -> teamEventEntryRepository
                        .findByTeam_TeamIdAndEvent_EventId(m.getTeam().getTeamId(), eventId)
                        .stream()
                        .map(entry -> mapToMyTeamResponse(m, entry)))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("You are not part of any team in this event."));
    }

    // ── Participant: team management (leader unless noted) ────────────

    /** Leader edits the team name / description. */
    @Transactional
    public MyTeamResponse updateTeam(Integer userId, Integer teamId, UpdateTeamRequest request) {
        Team team = requireLeader(userId, teamId);
        TeamEventEntry entry = requireCurrentEntry(team);
        ensureTeamManageable(entry);
        if (request.getName() != null && !request.getName().isBlank()) {
            String newName = request.getName().trim();
            String normalizedOldName = normalizeName(team.getName());
            String normalizedNewName = normalizeName(newName);
            if (!normalizedNewName.equals(normalizedOldName)
                    && teamEventEntryRepository.existsByEventIdAndNormalizedName(
                            entry.getEvent().getEventId(), normalizedNewName)) {
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
        TeamEventEntry entry = requireCurrentEntry(team);
        ensureTeamManageable(entry);
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
        participantHistorySnapshotService.snapshotDeparture(target, "REMOVED_BY_LEADER");
        teamMemberRepository.delete(target);
        return getMyTeam(leaderUserId);
    }

    /** Leader hands leadership to an existing member and becomes a member. */
    @Transactional
    public MyTeamResponse transferLeadership(Integer leaderUserId, Integer teamId, Integer newLeaderUserId) {
        Team team = requireLeader(leaderUserId, teamId);
        ensureTeamManageable(requireCurrentEntry(team));
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
     * they are the only member, in which case this season's (empty) participation
     * is disbanded — only the {@link TeamEventEntry}, never the {@code Team}
     * identity, which may have competed in earlier seasons.
     * Does NOT touch the season's {@code isActive} — leaving a team just makes you
     * teamless (you stay eligible to join/create another team this season). That is
     * a deliberately separate, distinct action — see {@link #leaveEvent}.
     */
    @Transactional
    public void leaveTeam(Integer userId, Integer teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        TeamEventEntry entry = requireCurrentEntry(team);
        ensureTeamManageable(entry);
        List<TeamMember> members = teamMemberRepository.findByTeam_TeamId(teamId);
        TeamMember me = members.stream().filter(m -> m.getUser().getUserId().equals(userId)).findFirst()
                .orElseThrow(() -> new BadRequestException("You are not a member of this team."));

        if ("LEADER".equalsIgnoreCase(me.getMemberRole())) {
            if (members.size() > 1) {
                throw new BadRequestException("Transfer leadership before leaving the team.");
            }
            // Snapshot BEFORE deleting the entry — this is the one path where the
            // TeamEventEntry itself disappears, not just the membership, so this
            // is the only chance to ever record this season for this user.
            participantHistorySnapshotService.snapshotDeparture(me, "LEFT_TEAM");
            teamMemberRepository.delete(me);
            deletePendingTeamRequests(team);
            teamEventEntryRepository.delete(entry);
            return;
        }
        participantHistorySnapshotService.snapshotDeparture(me, "LEFT_TEAM");
        teamMemberRepository.delete(me);
    }

    /**
     * A teamless participant opts out of the current season entirely — the actual
     * counterpart to {@link ParticipationAccessRequestService#approve} (which
     * reactivates), this is the participant deactivating themselves. Only available
     * while the event is OPEN (registration hasn't closed) and only for someone who
     * currently has no team in it — leaving a team ({@link #leaveTeam}) is a
     * separate, prior step. No coordinator approval needed (self-service, mirrors
     * {@link #leaveTeam}); no reason recorded.
     */
    @Transactional
    public void leaveEvent(Integer userId, Integer eventId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        HackathonEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        if (!"OPEN".equalsIgnoreCase(event.getStatus())) {
            throw new BadRequestException("You can only leave this event while it is open for registration.");
        }
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new BadRequestException("You are already inactive for this season.");
        }
        if (teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(userId, eventId)) {
            throw new BadRequestException("Leave your team before leaving the event.");
        }
        deactivate(user);
    }

    /**
     * Coordinator-driven removal during a live competition (attendance/absence),
     * with a mandatory audited reason — the mirror image of
     * {@link ParticipationAccessRequestService#approve}, which is the only other
     * place a Coordinator sets a student's {@code isActive}. Unlike the self-service
     * {@link #leaveTeam}, this only runs while the event is IN_PROGRESS: the removed
     * member may be unreachable, so there is no leadership hand-off to ask for —
     * if they were the LEADER, the remaining member who joined earliest is
     * auto-promoted; if they were the last member left, the team is disqualified
     * (not deleted — unlike the SETUP-phase solo-leave case, submissions/scores may
     * already reference this team, and DISQUALIFIED already excludes it from ranking).
     */
    @Transactional
    public TeamDetailResponse coordinatorRemoveMember(Integer coordinatorId, Integer teamId,
                                                       Integer targetUserId, String reason) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        TeamEventEntry entry = requireCurrentEntry(team);
        if (!"IN_PROGRESS".equalsIgnoreCase(entry.getEvent().getStatus())) {
            throw new BadRequestException("Coordinator removal is only available while the event is in progress.");
        }
        if (!"APPROVED".equalsIgnoreCase(entry.getStatus())) {
            throw new BadRequestException("Only an approved team's members can be removed this way.");
        }

        List<TeamMember> members = teamMemberRepository.findByTeam_TeamId(teamId);
        TeamMember target = members.stream()
                .filter(m -> m.getUser().getUserId().equals(targetUserId))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("That user is not a member of this team."));
        boolean wasLeader = "LEADER".equalsIgnoreCase(target.getMemberRole());

        participantHistorySnapshotService.snapshotDeparture(target, "REMOVED_BY_COORDINATOR");
        teamMemberRepository.delete(target);
        deactivate(target.getUser());

        List<TeamMember> remaining = members.stream()
                .filter(m -> !m.getId().equals(target.getId()))
                .collect(Collectors.toList());

        Integer promotedLeaderUserId = null;
        if (remaining.isEmpty()) {
            entry.setStatus("DISQUALIFIED");
            entry.setDisqualifiedReason("No remaining members (last member removed by coordinator): " + reason);
            entry.setDisqualifiedAt(LocalDateTime.now());
            teamEventEntryRepository.save(entry);
            // A disqualified team is no longer "active" regardless of the event's phase.
            team.setIsActive(false);
            teamRepository.save(team);
        } else if (wasLeader) {
            TeamMember newLeader = remaining.stream()
                    .min(Comparator.comparing(TeamMember::getJoinedAt))
                    .orElseThrow();
            newLeader.setMemberRole("LEADER");
            teamMemberRepository.save(newLeader);
            promotedLeaderUserId = newLeader.getUser().getUserId();
            notificationService.createNotification(
                    promotedLeaderUserId,
                    "You are now the team leader",
                    "You are now the leader of team '" + team.getName()
                            + "' — the previous leader was removed from the competition.",
                    "TEAM_LEADER_PROMOTED"
            );
        }

        notificationService.createNotification(
                targetUserId,
                "Removed from the competition",
                "You have been removed from team '" + team.getName() + "' and are no longer part of "
                        + entry.getEvent().getName() + ". Reason: " + reason
                        + ". If this was a mistake, request to rejoin the competition.",
                "TEAM_COORDINATOR_REMOVED"
        );

        auditLogService.record(coordinatorId, "COORDINATOR_REMOVE_MEMBER", "TEAM", teamId, reason,
                Map.of("removedUserId", targetUserId,
                        "resultingStatus", entry.getStatus(),
                        "promotedLeaderUserId", promotedLeaderUserId == null ? "NONE" : promotedLeaderUserId));

        return mapToDetailResponse(team, entry);
    }

    private void deactivate(User user) {
        user.setIsActive(false);
        userRepository.save(user);
    }

    /**
     * Deletes pending JoinRequest/TeamInvite rows referencing this team — required
     * before deleting the team's entry, since neither FK has ON DELETE CASCADE
     * (mirrors LeftoverGroupingService#dissolve). A team has exactly one
     * TeamEventEntry today, so scoping by teamId alone is unambiguous.
     */
    private void deletePendingTeamRequests(Team team) {
        List<JoinRequest> requests = joinRequestRepository.findByTeam_TeamId(team.getTeamId());
        if (!requests.isEmpty()) {
            joinRequestRepository.deleteAll(requests);
        }
        List<TeamInvite> invites = teamInviteRepository.findByTeam_TeamId(team.getTeamId());
        if (!invites.isEmpty()) {
            teamInviteRepository.deleteAll(invites);
        }
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

    /**
     * Resolves the team's current {@link TeamEventEntry} — the most recently
     * created one. A team is only ever active in one live season at a time
     * (rejoin requires the prior entry's team to be dormant first, see
     * TeamRejoinRequestService), so "most recent" is unambiguous for every
     * teamId-only coordinator/leader route, live {@code /my} lookups, and the
     * "which team can I submit to" endpoint. Full cross-season history reads
     * (getMyResultHistory) intentionally do NOT use this — they walk every
     * entry a member played, not just the newest one.
     */
    private TeamEventEntry requireCurrentEntry(Team team) {
        return teamEventEntryRepository.findTopByTeam_TeamIdOrderByIdDesc(team.getTeamId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No season participation found for team: " + team.getTeamId()));
    }

    // ── Coordinator: Get all teams by event ──────────────────────────

    private void ensureTeamManageable(TeamEventEntry entry) {
        if ("REJECTED".equalsIgnoreCase(entry.getStatus()) || "DISQUALIFIED".equalsIgnoreCase(entry.getStatus())) {
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
        return teamEventEntryRepository.findAllByEvent_EventId(eventId).stream()
                .map(entry -> mapToDetailResponse(entry.getTeam(), entry))
                .collect(Collectors.toList());
    }

    // Cross-event count backing the Coordinator sidebar's "Teams" badge — mirrors
    // the account-approval badge so both queues surface the same way.
    @Transactional(readOnly = true)
    public long getPendingTeamsCount() {
        return teamEventEntryRepository.countByStatus("PENDING");
    }

    // ── Coordinator: Get single team ─────────────────────────────────

    @Transactional(readOnly = true)
    public TeamDetailResponse getTeamById(Integer teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        return mapToDetailResponse(team, requireCurrentEntry(team));
    }

    // ── Coordinator: Approve team ────────────────────────────────────

    @Transactional
    public TeamDetailResponse approveTeam(Integer teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        TeamEventEntry entry = requireCurrentEntry(team);
        if (!"PENDING".equalsIgnoreCase(entry.getStatus())) {
            throw new BadRequestException("Only pending teams can be approved.");
        }
        entry.setStatus("APPROVED");
        teamEventEntryRepository.save(entry);
        notifyTeamMembers(
                team,
                "Team approved",
                "Your team '" + team.getName() + "' has been approved for " +
                        entry.getEvent().getName() + ".",
                "TEAM_APPROVED"
        );
        return mapToDetailResponse(team, entry);
    }

    // ── Coordinator: Reject team ─────────────────────────────────────

    @Transactional
    public TeamDetailResponse rejectTeam(Integer teamId, RejectTeamRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        TeamEventEntry entry = requireCurrentEntry(team);
        if (!"PENDING".equalsIgnoreCase(entry.getStatus())) {
            throw new BadRequestException("Only pending teams can be rejected.");
        }
        entry.setStatus("REJECTED");
        if (request != null && request.getReason() != null) {
            entry.setDisqualifiedReason(normalizeReason(request.getReason()));
        }
        teamEventEntryRepository.save(entry);
        String reason = entry.getDisqualifiedReason();
        notifyTeamMembers(
                team,
                "Team rejected",
                "Your team '" + team.getName() + "' was rejected." +
                        (reason != null && !reason.isBlank() ? " Reason: " + reason : ""),
                "TEAM_REJECTED"
        );
        return mapToDetailResponse(team, entry);
    }

    // ── Coordinator: Disqualify team ─────────────────────────────────

    @Transactional
    public TeamDetailResponse disqualifyTeam(Integer teamId, RejectTeamRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        TeamEventEntry entry = requireCurrentEntry(team);
        if (!"APPROVED".equalsIgnoreCase(entry.getStatus())) {
            throw new BadRequestException("Only approved teams can be disqualified.");
        }
        entry.setStatus("DISQUALIFIED");
        if (request != null && request.getReason() != null) {
            entry.setDisqualifiedReason(normalizeReason(request.getReason()));
        }
        entry.setDisqualifiedAt(LocalDateTime.now());
        teamEventEntryRepository.save(entry);
        // A disqualified team is no longer "active" regardless of the event's phase.
        team.setIsActive(false);
        teamRepository.save(team);
        String reason = entry.getDisqualifiedReason();
        notifyTeamMembers(
                team,
                "Team disqualified",
                "Your team '" + team.getName() + "' was disqualified." +
                        (reason != null && !reason.isBlank() ? " Reason: " + reason : ""),
                "TEAM_DISQUALIFIED"
        );
        return mapToDetailResponse(team, entry);
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
     * @param actorUserId     coordinator performing the draw (for the audit trail)
     * @param reason          optional justification, recorded on a REDRAW
     */
    @Transactional
    public List<TeamResponse> drawTracks(Integer eventId, boolean includeAssigned,
                                         Integer actorUserId, String reason) {
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
        List<TeamEventEntry> approved = teamEventEntryRepository.findAllByEvent_EventIdAndStatus(eventId, "APPROVED");

        Map<Integer, Integer> count = new HashMap<>();
        tracks.forEach(t -> count.put(t.getTrackId(), 0));

        List<TeamEventEntry> toAssign = new ArrayList<>();
        for (TeamEventEntry entry : approved) {
            if (includeAssigned) {
                entry.setTrack(null);
            }
            if (entry.getTrack() == null) {
                toAssign.add(entry);
            } else {
                count.merge(entry.getTrack().getTrackId(), 1, Integer::sum);
            }
        }

        if (toAssign.isEmpty()) {
            throw new BadRequestException("No unassigned teams to draw.");
        }

        // Greedy balance: each team goes to the track with the most free slots,
        // never exceeding capacity. Equivalent to round-robin when starting empty.
        Collections.shuffle(toAssign);
        for (TeamEventEntry entry : toAssign) {
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
            entry.setTrack(best);
            count.merge(best.getTrackId(), 1, Integer::sum);
        }
        teamEventEntryRepository.saveAll(toAssign);

        // Audit trail: a REDRAW wipes & reshuffles everyone (fairness-sensitive, so
        // it carries the coordinator's reason); a plain DRAW only fills unassigned.
        String action = includeAssigned ? "REDRAW_TRACKS" : "DRAW_TRACKS";
        auditLogService.record(actorUserId, action, "EVENT", eventId,
                (reason != null && !reason.isBlank()) ? reason.trim() : null,
                Map.of("mode", event.getTrackSelectionMode(),
                        "assigned", toAssign.size(),
                        "include_assigned", includeAssigned));

        return toAssign.stream().map(entry -> mapToTeamResponse(entry.getTeam(), entry)).collect(Collectors.toList());
    }

    /** SELF_SELECT: a team leader picks the team's track during SETUP. */
    @Transactional
    public MyTeamResponse selectTrack(Integer userId, Integer teamId, Integer trackId) {
        Team team = requireLeader(userId, teamId);
        TeamEventEntry entry = requireCurrentEntry(team);
        HackathonEvent event = entry.getEvent();

        if (!"SETUP".equalsIgnoreCase(event.getStatus())) {
            throw new BadRequestException("Track selection is only open during the SETUP phase.");
        }
        if (!"SELF_SELECT".equalsIgnoreCase(event.getTrackSelectionMode())) {
            throw new BadRequestException(
                    "This event assigns tracks by random draw — leaders cannot pick a track.");
        }
        if (!"APPROVED".equalsIgnoreCase(entry.getStatus())) {
            throw new BadRequestException("Only approved teams can select a track.");
        }

        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + trackId));
        if (!track.getEvent().getEventId().equals(event.getEventId())) {
            throw new BadRequestException("The selected track does not belong to this event.");
        }

        if (track.getCapacity() != null) {
            long current = teamEventEntryRepository.findAllByTrack_TrackIdAndStatus(trackId, "APPROVED").stream()
                    .filter(e -> !e.getTeam().getTeamId().equals(teamId))
                    .count();
            if (current >= track.getCapacity()) {
                throw new BadRequestException("This track is full. Please choose another track.");
            }
        }

        entry.setTrack(track);
        teamEventEntryRepository.save(entry);
        return getMyTeam(userId);
    }

    // ── Coordinator: Manually (re)assign a team to a track (SETUP) ────

    /**
     * Coordinator drag-and-drop assignment: places {@code teamId} into {@code trackId},
     * or moves it to the unassigned pool when trackId is null. SETUP-only. Unlike
     * participant self-selection ({@link #selectTrack}), this deliberately does NOT
     * enforce track capacity — the coordinator may knowingly exceed the recommended
     * max while cleaning up tracks (the UI surfaces a soft warning). Only APPROVED
     * teams are placeable.
     */
    @Transactional
    public TeamDetailResponse assignTeamToTrack(Integer actorUserId, Integer teamId, Integer trackId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        TeamEventEntry entry = requireCurrentEntry(team);
        HackathonEvent event = entry.getEvent();

        if (!"SETUP".equalsIgnoreCase(event.getStatus())) {
            throw new BadRequestException("Teams can only be reassigned to tracks during the SETUP phase.");
        }
        if (!"APPROVED".equalsIgnoreCase(entry.getStatus())) {
            throw new BadRequestException("Only approved teams can be assigned to a track.");
        }

        Track track = null;
        if (trackId != null) {
            track = trackRepository.findById(trackId)
                    .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + trackId));
            if (!track.getEvent().getEventId().equals(event.getEventId())) {
                throw new BadRequestException("The selected track does not belong to this event.");
            }
        }

        entry.setTrack(track);
        teamEventEntryRepository.save(entry);

        auditLogService.record(actorUserId, "ASSIGN_TEAM_TRACK", "TEAM", teamId, null,
                Map.<String, Object>of("trackId", trackId == null ? "UNASSIGNED" : trackId));

        return mapToDetailResponse(team, entry);
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

    private TeamResponse mapToTeamResponse(Team team, TeamEventEntry entry) {
        return TeamResponse.builder()
                .teamId(team.getTeamId())
                .eventId(entry.getEvent().getEventId())
                .eventName(entry.getEvent().getName())
                .trackId(entry.getTrack() != null ? entry.getTrack().getTrackId() : null)
                .trackName(entry.getTrack() != null ? entry.getTrack().getName() : null)
                .name(team.getName())
                .description(team.getDescription())
                .status(entry.getStatus())
                .createdAt(team.getCreatedAt())
                .build();
    }

    private MyTeamResponse mapToMyTeamResponse(TeamMember membership) {
        return mapToMyTeamResponse(membership, requireCurrentEntry(membership.getTeam()));
    }

    private MyTeamResponse mapToMyTeamResponse(TeamMember membership, TeamEventEntry entry) {
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
                        .isActive(m.getUser().getIsActive())
                        .build())
                .collect(Collectors.toList());

        boolean hasPendingRejoinRequest = teamRejoinRequestRepository
                .findByTeam_TeamIdAndStatus(team.getTeamId(), "PENDING").isPresent();

        return MyTeamResponse.builder()
                .teamId(team.getTeamId())
                .eventId(entry.getEvent().getEventId())
                .eventName(entry.getEvent().getName())
                .trackId(entry.getTrack() != null ? entry.getTrack().getTrackId() : null)
                .trackName(entry.getTrack() != null ? entry.getTrack().getName() : null)
                .trackDescription(entry.getTrack() != null ? entry.getTrack().getDescription() : null)
                .name(team.getName())
                .eventStatus(entry.getEvent().getStatus())
                .trackSelectionMode(entry.getEvent().getTrackSelectionMode())
                .status(entry.getStatus())
                .round(resolveTeamRound(team, entry))
                .myRole(membership.getMemberRole())
                .members(memberInfos)
                .hasPendingRejoinRequest(hasPendingRejoinRequest)
                .build();
    }

    private MyTeamResponse.RoundInfo resolveTeamRound(Team team, TeamEventEntry entry) {
        List<Round> rounds = roundRepository.findAllByEvent_EventIdOrderByOrderNumber(entry.getEvent().getEventId());
        if (rounds == null || rounds.isEmpty()) {
            return null;
        }

        if ("DISQUALIFIED".equalsIgnoreCase(entry.getStatus())) {
            return resolveDisqualificationRound(team, entry, rounds);
        }

        if (!"APPROVED".equalsIgnoreCase(entry.getStatus())) {
            return null;
        }

        return rounds.stream()
                .filter(round -> isActiveRound(round.getStatus()))
                .filter(round -> teamCanParticipateInRound(team, round, rounds))
                .findFirst()
                .map(this::mapToMyTeamRoundInfo)
                .orElse(null);
    }

    private MyTeamResponse.RoundInfo resolveDisqualificationRound(Team team, TeamEventEntry entry, List<Round> rounds) {
        LocalDateTime disqualifiedAt = entry.getDisqualifiedAt();
        if (disqualifiedAt != null) {
            return rounds.stream()
                    .filter(round -> contains(round, disqualifiedAt))
                    .findFirst()
                    .or(() -> rounds.stream()
                            .filter(round -> round.getStartTime() != null && !round.getStartTime().isAfter(disqualifiedAt))
                            .max(Comparator.comparing(Round::getOrderNumber, Comparator.nullsLast(Comparator.naturalOrder()))))
                    .map(this::mapToMyTeamRoundInfo)
                    .orElseGet(() -> mapToMyTeamRoundInfo(rounds.get(0)));
        }

        return rounds.stream()
                .filter(round -> isActiveRound(round.getStatus()))
                .findFirst()
                .map(this::mapToMyTeamRoundInfo)
                .orElseGet(() -> mapToMyTeamRoundInfo(rounds.get(rounds.size() - 1)));
    }

    private boolean teamCanParticipateInRound(Team team, Round round, List<Round> rounds) {
        Round previous = rounds.stream()
                .filter(candidate -> candidate.getOrderNumber() != null && round.getOrderNumber() != null)
                .filter(candidate -> candidate.getOrderNumber() < round.getOrderNumber())
                .max(Comparator.comparing(Round::getOrderNumber))
                .orElse(null);

        if (previous == null || !"FINALIZED".equalsIgnoreCase(previous.getStatus())
                || previous.getTopNAdvance() == null) {
            return true;
        }

        return roundResultRepository
                .findByTeam_TeamIdAndRound_RoundId(team.getTeamId(), previous.getRoundId())
                .map(result -> result.getRankPosition() != null
                        && result.getRankPosition() <= previous.getTopNAdvance())
                .orElse(false);
    }

    private boolean contains(Round round, LocalDateTime at) {
        LocalDateTime start = round.getStartTime();
        LocalDateTime end = round.getEndTime();
        if (start == null || end == null) {
            return false;
        }
        return !at.isBefore(start) && !at.isAfter(end);
    }

    private boolean isActiveRound(String status) {
        return "ACTIVE".equalsIgnoreCase(status)
                || "OPEN".equalsIgnoreCase(status)
                || "IN_PROGRESS".equalsIgnoreCase(status);
    }

    private MyTeamResponse.RoundInfo mapToMyTeamRoundInfo(Round round) {
        return MyTeamResponse.RoundInfo.builder()
                .roundId(round.getRoundId())
                .name(round.getName())
                .orderNumber(round.getOrderNumber())
                .status(round.getStatus())
                .isFinal(round.getIsFinal())
                .startTime(round.getStartTime())
                .endTime(round.getEndTime())
                .submissionDeadline(round.getSubmissionDeadline())
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

    private TeamDetailResponse mapToDetailResponse(Team team, TeamEventEntry entry) {
        List<TeamMember> members = teamMemberRepository.findByTeam_TeamId(team.getTeamId());
        List<TeamDetailResponse.MemberInfo> memberInfos = members.stream()
                .map(m -> TeamDetailResponse.MemberInfo.builder()
                        .userId(m.getUser().getUserId())
                        .fullName(m.getUser().getFullName())
                        .email(m.getUser().getEmail())
                        .memberRole(m.getMemberRole())
                        .joinedAt(m.getJoinedAt())
                        .studentId(m.getUser().getStudentId())
                        .userType(m.getUser().getUserType())
                        .university(m.getUser().getUniversity())
                        .isActive(m.getUser().getIsActive())
                        .build())
                .collect(Collectors.toList());

        return TeamDetailResponse.builder()
                .teamId(team.getTeamId())
                .eventId(entry.getEvent().getEventId())
                .eventName(entry.getEvent().getName())
                .trackId(entry.getTrack() != null ? entry.getTrack().getTrackId() : null)
                .trackName(entry.getTrack() != null ? entry.getTrack().getName() : null)
                .name(team.getName())
                .description(team.getDescription())
                .status(entry.getStatus())
                .disqualifiedReason(entry.getDisqualifiedReason())
                .disqualifiedAt(entry.getDisqualifiedAt())
                .createdAt(team.getCreatedAt())
                .members(memberInfos)
                .build();
    }
}

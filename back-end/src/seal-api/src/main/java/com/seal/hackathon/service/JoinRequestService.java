package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.CreateJoinRequestRequest;
import com.seal.hackathon.dto.response.JoinRequestResponse;
import com.seal.hackathon.dto.response.JoinableTeamResponse;
import com.seal.hackathon.entity.JoinRequest;
import com.seal.hackathon.entity.Team;
import com.seal.hackathon.entity.TeamMember;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ForbiddenException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.JoinRequestRepository;
import com.seal.hackathon.repository.TeamMemberRepository;
import com.seal.hackathon.repository.TeamRepository;
import com.seal.hackathon.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Participant-initiated requests to join an existing team. Mirrors
 * {@link TeamInviteService} but with the direction reversed: a participant
 * applies, and the team leader accepts or declines.
 */
@Service
@RequiredArgsConstructor
public class JoinRequestService {

    private static final int MAX_TEAM_SIZE = 5;

    private final JoinRequestRepository joinRequestRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    // ── Participant sends a join request ──────────────────────────────

    @Transactional
    public JoinRequestResponse createRequest(Integer requesterId, Integer teamId, CreateJoinRequestRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));

        if (!"OPEN".equalsIgnoreCase(team.getEvent().getStatus())) {
            throw new BadRequestException("This event is no longer open for registration.");
        }
        LocalDateTime now = LocalDateTime.now();
        if (team.getEvent().getRegistrationEnd() != null && now.isAfter(team.getEvent().getRegistrationEnd())) {
            throw new BadRequestException("Registration deadline has passed.");
        }
        if ("REJECTED".equalsIgnoreCase(team.getStatus()) || "DISQUALIFIED".equalsIgnoreCase(team.getStatus())) {
            throw new BadRequestException("This team is not accepting members.");
        }

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + requesterId));

        List<TeamMember> members = teamMemberRepository.findByTeam_TeamId(teamId);
        if (members.stream().anyMatch(m -> m.getUser().getUserId().equals(requesterId))) {
            throw new BadRequestException("You are already a member of this team.");
        }
        if (members.size() >= MAX_TEAM_SIZE) {
            throw new BadRequestException("This team is already full (maximum " + MAX_TEAM_SIZE + " members).");
        }

        if (teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(requesterId, team.getEvent().getEventId())) {
            throw new BadRequestException("You are already registered in a team for this event.");
        }

        // Reuse any existing row (UNIQUE (team_id, requester_user_id)). A still
        // PENDING request is blocked; an old ACCEPTED/DECLINED one (e.g. the user
        // joined then left) is reset to a fresh PENDING request.
        JoinRequest joinRequest = joinRequestRepository
                .findByTeam_TeamIdAndRequester_UserId(teamId, requesterId)
                .orElse(null);
        if (joinRequest != null) {
            if ("PENDING".equalsIgnoreCase(joinRequest.getStatus())) {
                throw new BadRequestException("You already have a pending request for this team.");
            }
            joinRequest.setMessage(request != null ? request.getMessage() : null);
            joinRequest.setStatus("PENDING");
            joinRequest.setCreatedAt(LocalDateTime.now());
            joinRequest.setRespondedAt(null);
        } else {
            joinRequest = JoinRequest.builder()
                    .team(team)
                    .requester(requester)
                    .message(request != null ? request.getMessage() : null)
                    .status("PENDING")
                    .build();
        }
        joinRequest = joinRequestRepository.save(joinRequest);

        // Notify the team leader that someone wants to join.
        teamMemberRepository.findByTeam_TeamId(teamId).stream()
                .filter(m -> "LEADER".equalsIgnoreCase(m.getMemberRole()))
                .findFirst()
                .ifPresent(leader -> notificationService.createNotification(
                        leader.getUser().getUserId(),
                        "New join request",
                        requester.getFullName() + " requested to join your team \"" + team.getName() + "\".",
                        "JOIN_REQUEST"));

        return mapToResponse(joinRequest);
    }

    // ── Participant: browse / search teams to join ────────────────────

    /**
     * Teams the participant may request to join: in an OPEN event whose
     * registration window is still open, not full, not rejected/disqualified,
     * and in events where the participant hasn't already registered a team.
     */
    @Transactional(readOnly = true)
    public List<JoinableTeamResponse> getJoinableTeams(Integer userId, Integer eventId, String query) {
        LocalDateTime now = LocalDateTime.now();
        String q = query == null ? "" : query.trim().toLowerCase();

        List<Team> candidates = (eventId != null)
                ? teamRepository.findAllByEvent_EventId(eventId)
                : teamRepository.findAllByEvent_Status("OPEN");

        return candidates.stream()
                .filter(t -> "OPEN".equalsIgnoreCase(t.getEvent().getStatus()))
                .filter(t -> t.getEvent().getRegistrationEnd() == null
                        || !now.isAfter(t.getEvent().getRegistrationEnd()))
                .filter(t -> "PENDING".equalsIgnoreCase(t.getStatus())
                        || "APPROVED".equalsIgnoreCase(t.getStatus()))
                .filter(t -> q.isEmpty() || t.getName().toLowerCase().contains(q))
                // Hide teams in events where the participant already has a team.
                .filter(t -> !teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(
                        userId, t.getEvent().getEventId()))
                .map(t -> {
                    List<TeamMember> members = teamMemberRepository.findByTeam_TeamId(t.getTeamId());
                    String leaderName = members.stream()
                            .filter(m -> "LEADER".equalsIgnoreCase(m.getMemberRole()))
                            .map(m -> m.getUser().getFullName())
                            .findFirst().orElse(null);
                    return JoinableTeamResponse.builder()
                            .teamId(t.getTeamId())
                            .name(t.getName())
                            .eventId(t.getEvent().getEventId())
                            .eventName(t.getEvent().getName())
                            .trackId(t.getTrack() != null ? t.getTrack().getTrackId() : null)
                            .trackName(t.getTrack() != null ? t.getTrack().getName() : null)
                            .status(t.getStatus())
                            .memberCount(members.size())
                            .leaderName(leaderName)
                            .alreadyRequested(joinRequestRepository
                                    .existsByTeam_TeamIdAndRequester_UserIdAndStatus(t.getTeamId(), userId, "PENDING"))
                            .build();
                })
                // Only teams that still have an open seat.
                .filter(t -> t.getMemberCount() < MAX_TEAM_SIZE)
                .collect(Collectors.toList());
    }

    // ── Participant: my sent requests ─────────────────────────────────

    @Transactional(readOnly = true)
    public List<JoinRequestResponse> getMyRequests(Integer userId) {
        return joinRequestRepository.findByRequester_UserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ── Participant withdraws their own pending request ───────────────

    @Transactional
    public void cancelRequest(Integer userId, Integer requestId) {
        JoinRequest joinRequest = joinRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Join request not found: " + requestId));
        if (!joinRequest.getRequester().getUserId().equals(userId)) {
            throw new ForbiddenException("This request does not belong to you.");
        }
        if (!"PENDING".equalsIgnoreCase(joinRequest.getStatus())) {
            throw new BadRequestException("This request has already been " + joinRequest.getStatus().toLowerCase() + ".");
        }
        joinRequestRepository.delete(joinRequest);
    }

    // ── Leader: pending requests for a team they lead ─────────────────

    @Transactional(readOnly = true)
    public List<JoinRequestResponse> getTeamRequests(Integer leaderUserId, Integer teamId) {
        requireLeader(leaderUserId, teamId);
        return joinRequestRepository.findByTeam_TeamIdAndStatus(teamId, "PENDING").stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ── Leader accepts a join request ─────────────────────────────────

    @Transactional
    public JoinRequestResponse acceptRequest(Integer leaderUserId, Integer requestId) {
        JoinRequest joinRequest = getPendingRequest(requestId);
        Team team = joinRequest.getTeam();
        requireLeader(leaderUserId, team.getTeamId());

        Integer requesterId = joinRequest.getRequester().getUserId();

        if (teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(requesterId, team.getEvent().getEventId())) {
            throw new BadRequestException("This user already belongs to a team in this event.");
        }
        if (teamMemberRepository.findByTeam_TeamId(team.getTeamId()).size() >= MAX_TEAM_SIZE) {
            throw new BadRequestException("This team is already full (maximum " + MAX_TEAM_SIZE + " members).");
        }

        joinRequest.setStatus("ACCEPTED");
        joinRequest.setRespondedAt(LocalDateTime.now());
        joinRequestRepository.save(joinRequest);

        TeamMember member = TeamMember.builder()
                .team(team)
                .user(joinRequest.getRequester())
                .memberRole("MEMBER")
                .build();
        teamMemberRepository.save(member);

        // Cancel the requester's other pending requests in the same event.
        joinRequestRepository.findByRequester_UserIdAndStatus(requesterId, "PENDING").stream()
                .filter(r -> !r.getRequestId().equals(requestId))
                .filter(r -> r.getTeam().getEvent().getEventId().equals(team.getEvent().getEventId()))
                .forEach(r -> {
                    r.setStatus("DECLINED");
                    r.setRespondedAt(LocalDateTime.now());
                    joinRequestRepository.save(r);
                });

        notificationService.createNotification(
                requesterId,
                "Join request accepted",
                "You have joined the team \"" + team.getName() + "\".",
                "JOIN_REQUEST");

        return mapToResponse(joinRequest);
    }

    // ── Leader declines a join request ────────────────────────────────

    @Transactional
    public JoinRequestResponse declineRequest(Integer leaderUserId, Integer requestId) {
        JoinRequest joinRequest = getPendingRequest(requestId);
        requireLeader(leaderUserId, joinRequest.getTeam().getTeamId());
        joinRequest.setStatus("DECLINED");
        joinRequest.setRespondedAt(LocalDateTime.now());
        joinRequestRepository.save(joinRequest);

        notificationService.createNotification(
                joinRequest.getRequester().getUserId(),
                "Join request declined",
                "Your request to join \"" + joinRequest.getTeam().getName() + "\" was declined.",
                "JOIN_REQUEST");

        return mapToResponse(joinRequest);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private JoinRequest getPendingRequest(Integer requestId) {
        JoinRequest joinRequest = joinRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Join request not found: " + requestId));
        if (!"PENDING".equalsIgnoreCase(joinRequest.getStatus())) {
            throw new BadRequestException("This request has already been " + joinRequest.getStatus().toLowerCase() + ".");
        }
        return joinRequest;
    }

    private void requireLeader(Integer userId, Integer teamId) {
        boolean isLeader = teamMemberRepository.findByTeam_TeamId(teamId).stream()
                .anyMatch(m -> m.getUser().getUserId().equals(userId)
                        && "LEADER".equalsIgnoreCase(m.getMemberRole()));
        if (!isLeader) {
            throw new ForbiddenException("Only the team leader can manage join requests.");
        }
    }

    private JoinRequestResponse mapToResponse(JoinRequest jr) {
        Team team = jr.getTeam();
        return JoinRequestResponse.builder()
                .requestId(jr.getRequestId())
                .teamId(team.getTeamId())
                .teamName(team.getName())
                .eventName(team.getEvent().getName())
                .trackName(team.getTrack() != null ? team.getTrack().getName() : null)
                .requesterId(jr.getRequester().getUserId())
                .requesterName(jr.getRequester().getFullName())
                .requesterEmail(jr.getRequester().getEmail())
                .message(jr.getMessage())
                .status(jr.getStatus())
                .createdAt(jr.getCreatedAt())
                .respondedAt(jr.getRespondedAt())
                .build();
    }
}

package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.CreateJoinRequestRequest;
import com.seal.hackathon.dto.response.JoinRequestResponse;
import com.seal.hackathon.dto.response.JoinableTeamListResponse;
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
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JoinRequestService {

    private static final int MAX_TEAM_MEMBERS = 5;
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_ACCEPTED = "ACCEPTED";
    private static final String STATUS_DECLINED = "DECLINED";

    private final JoinRequestRepository joinRequestRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public JoinRequestResponse createJoinRequest(Integer requesterUserId, Integer teamId,
                                                 CreateJoinRequestRequest request) {
        User requester = userRepository.findById(requesterUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + requesterUserId));
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));

        validateRequesterCanAskToJoin(requester, team);

        Optional<JoinRequest> existing = joinRequestRepository
                .findByTeam_TeamIdAndRequester_UserId(teamId, requesterUserId);

        JoinRequest joinRequest;
        if (existing.isPresent()) {
            joinRequest = existing.get();
            if (STATUS_PENDING.equalsIgnoreCase(joinRequest.getStatus())) {
                throw new BadRequestException("You already have a pending request for this team.");
            }
            if (STATUS_ACCEPTED.equalsIgnoreCase(joinRequest.getStatus())) {
                throw new BadRequestException("This join request has already been accepted.");
            }
            joinRequest.setStatus(STATUS_PENDING);
            joinRequest.setMessage(normalizeMessage(request));
            joinRequest.setCreatedAt(LocalDateTime.now());
            joinRequest.setRespondedAt(null);
        } else {
            joinRequest = JoinRequest.builder()
                    .team(team)
                    .requester(requester)
                    .message(normalizeMessage(request))
                    .status(STATUS_PENDING)
                    .build();
        }

        joinRequest = joinRequestRepository.save(joinRequest);
        notifyLeaderAboutJoinRequest(joinRequest);
        return mapToResponse(joinRequest);
    }

    @Transactional(readOnly = true)
    public JoinableTeamListResponse getJoinableTeams(Integer requesterUserId, Integer eventId, String query) {
        userRepository.findById(requesterUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + requesterUserId));

        List<Team> sourceTeams;
        if (eventId != null) {
            sourceTeams = teamRepository.findAllByEvent_EventIdAndStatus(eventId, "APPROVED").stream()
                    .filter(team -> "OPEN".equalsIgnoreCase(team.getEvent().getStatus()))
                    .collect(Collectors.toList());
        } else {
            sourceTeams = teamRepository.findAllByEvent_Status("OPEN").stream()
                    .filter(team -> "APPROVED".equalsIgnoreCase(team.getStatus()))
                    .collect(Collectors.toList());
        }

        String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);

        List<JoinableTeamResponse> teams = sourceTeams.stream()
                .filter(team -> teamMemberRepository.countByTeam_TeamId(team.getTeamId()) < MAX_TEAM_MEMBERS)
                .filter(team -> !teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(
                        requesterUserId, team.getEvent().getEventId()))
                .filter(team -> matchesQuery(team, normalizedQuery))
                .map(team -> mapToJoinableTeamResponse(team, requesterUserId))
                .collect(Collectors.toList());

        return JoinableTeamListResponse.builder()
                .totalJoinableTeams(teams.size())
                .teams(teams)
                .build();
    }

    @Transactional(readOnly = true)
    public List<JoinRequestResponse> getMyRequests(Integer requesterUserId) {
        return joinRequestRepository.findByRequester_UserIdOrderByCreatedAtDesc(requesterUserId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void withdrawRequest(Integer requesterUserId, Integer requestId) {
        JoinRequest joinRequest = joinRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Join request not found: " + requestId));
        if (!joinRequest.getRequester().getUserId().equals(requesterUserId)) {
            throw new ForbiddenException("This join request does not belong to you.");
        }
        if (!STATUS_PENDING.equalsIgnoreCase(joinRequest.getStatus())) {
            throw new BadRequestException("Only pending join requests can be withdrawn.");
        }
        joinRequestRepository.delete(joinRequest);
    }

    @Transactional(readOnly = true)
    public List<JoinRequestResponse> getPendingRequestsForTeam(Integer leaderUserId, Integer teamId) {
        requireLeader(leaderUserId, teamId);
        return joinRequestRepository.findByTeam_TeamIdAndStatusOrderByCreatedAtDesc(teamId, STATUS_PENDING).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public JoinRequestResponse acceptRequest(Integer leaderUserId, Integer requestId) {
        JoinRequest joinRequest = requirePendingRequest(requestId);
        Team team = requireLeader(leaderUserId, joinRequest.getTeam().getTeamId());

        validateTeamCanAcceptRequest(team);
        if (teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(
                joinRequest.getRequester().getUserId(), team.getEvent().getEventId())) {
            throw new BadRequestException("This user is already a member of a team in this event.");
        }

        LocalDateTime now = LocalDateTime.now();
        TeamMember member = TeamMember.builder()
                .team(team)
                .user(joinRequest.getRequester())
                .memberRole("MEMBER")
                .build();
        teamMemberRepository.save(member);

        joinRequest.setStatus(STATUS_ACCEPTED);
        joinRequest.setRespondedAt(now);
        joinRequest = joinRequestRepository.save(joinRequest);

        declineOtherPendingRequestsForRequester(joinRequest, now);
        notifyRequesterAboutDecision(joinRequest, true);

        return mapToResponse(joinRequest);
    }

    @Transactional
    public JoinRequestResponse declineRequest(Integer leaderUserId, Integer requestId) {
        JoinRequest joinRequest = requirePendingRequest(requestId);
        requireLeader(leaderUserId, joinRequest.getTeam().getTeamId());

        joinRequest.setStatus(STATUS_DECLINED);
        joinRequest.setRespondedAt(LocalDateTime.now());
        joinRequest = joinRequestRepository.save(joinRequest);
        notifyRequesterAboutDecision(joinRequest, false);

        return mapToResponse(joinRequest);
    }

    private void validateRequesterCanAskToJoin(User requester, Team team) {
        if (!Boolean.TRUE.equals(requester.getIsApproved()) || !Boolean.TRUE.equals(requester.getIsActive())) {
            throw new BadRequestException("Your account is not approved or active.");
        }
        validateTeamCanAcceptRequest(team);
        if (teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(
                requester.getUserId(), team.getEvent().getEventId())) {
            throw new BadRequestException("You are already a member of a team in this event.");
        }
    }

    private void validateTeamCanAcceptRequest(Team team) {
        if (!"OPEN".equalsIgnoreCase(team.getEvent().getStatus())) {
            throw new BadRequestException("This event is not open for team registration.");
        }
        if (!"APPROVED".equalsIgnoreCase(team.getStatus())) {
            throw new BadRequestException("Only approved teams can receive join requests.");
        }
        if (teamMemberRepository.countByTeam_TeamId(team.getTeamId()) >= MAX_TEAM_MEMBERS) {
            throw new BadRequestException("This team is already full (maximum 5 members).");
        }
    }

    private Team requireLeader(Integer userId, Integer teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        boolean isLeader = teamMemberRepository.findByTeam_TeamId(teamId).stream()
                .anyMatch(m -> m.getUser().getUserId().equals(userId)
                        && "LEADER".equalsIgnoreCase(m.getMemberRole()));
        if (!isLeader) {
            throw new ForbiddenException("Only the team leader can perform this action.");
        }
        return team;
    }

    private JoinRequest requirePendingRequest(Integer requestId) {
        JoinRequest joinRequest = joinRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Join request not found: " + requestId));
        if (!STATUS_PENDING.equalsIgnoreCase(joinRequest.getStatus())) {
            throw new BadRequestException("This join request has already been " +
                    joinRequest.getStatus().toLowerCase(Locale.ROOT) + ".");
        }
        return joinRequest;
    }

    private void declineOtherPendingRequestsForRequester(JoinRequest acceptedRequest, LocalDateTime respondedAt) {
        Integer requesterId = acceptedRequest.getRequester().getUserId();
        Integer eventId = acceptedRequest.getTeam().getEvent().getEventId();
        List<JoinRequest> otherPending = joinRequestRepository
                .findByRequester_UserIdAndStatusAndTeam_Event_EventId(requesterId, STATUS_PENDING, eventId).stream()
                .filter(request -> !request.getRequestId().equals(acceptedRequest.getRequestId()))
                .collect(Collectors.toList());

        otherPending.forEach(request -> {
            request.setStatus(STATUS_DECLINED);
            request.setRespondedAt(respondedAt);
        });
        joinRequestRepository.saveAll(otherPending);
    }

    private void notifyLeaderAboutJoinRequest(JoinRequest joinRequest) {
        TeamMember leader = findLeader(joinRequest.getTeam());
        notificationService.createNotification(
                leader.getUser().getUserId(),
                "New join request",
                joinRequest.getRequester().getFullName() + " requested to join team '" +
                        joinRequest.getTeam().getName() + "'.",
                "JOIN_REQUEST"
        );
    }

    private void notifyRequesterAboutDecision(JoinRequest joinRequest, boolean accepted) {
        String title = accepted ? "Join request accepted" : "Join request declined";
        String content = accepted
                ? "Your request to join team '" + joinRequest.getTeam().getName() + "' was accepted."
                : "Your request to join team '" + joinRequest.getTeam().getName() + "' was declined.";
        notificationService.createNotification(
                joinRequest.getRequester().getUserId(),
                title,
                content,
                accepted ? "JOIN_REQUEST_ACCEPTED" : "JOIN_REQUEST_DECLINED"
        );
    }

    private TeamMember findLeader(Team team) {
        return teamMemberRepository.findByTeam_TeamId(team.getTeamId()).stream()
                .filter(member -> "LEADER".equalsIgnoreCase(member.getMemberRole()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("This team does not have a leader."));
    }

    private boolean matchesQuery(Team team, String query) {
        if (query == null || query.isBlank()) {
            return true;
        }
        String teamName = team.getName() == null ? "" : team.getName().toLowerCase(Locale.ROOT);
        String trackName = team.getTrack().getName() == null ? "" : team.getTrack().getName().toLowerCase(Locale.ROOT);
        return teamName.contains(query) || trackName.contains(query);
    }

    private String normalizeMessage(CreateJoinRequestRequest request) {
        if (request == null || request.getMessage() == null || request.getMessage().isBlank()) {
            return null;
        }
        return request.getMessage().trim();
    }

    private JoinableTeamResponse mapToJoinableTeamResponse(Team team, Integer requesterUserId) {
        TeamMember leader = findLeader(team);
        Optional<JoinRequest> myRequest = joinRequestRepository
                .findByTeam_TeamIdAndRequester_UserId(team.getTeamId(), requesterUserId);

        return JoinableTeamResponse.builder()
                .teamId(team.getTeamId())
                .teamName(team.getName())
                .description(team.getDescription())
                .eventId(team.getEvent().getEventId())
                .eventName(team.getEvent().getName())
                .trackId(team.getTrack().getTrackId())
                .trackName(team.getTrack().getName())
                .teamStatus(team.getStatus())
                .memberCount((int) teamMemberRepository.countByTeam_TeamId(team.getTeamId()))
                .maxMembers(MAX_TEAM_MEMBERS)
                .leaderUserId(leader.getUser().getUserId())
                .leaderName(leader.getUser().getFullName())
                .myRequestId(myRequest.map(JoinRequest::getRequestId).orElse(null))
                .myRequestStatus(myRequest.map(JoinRequest::getStatus).orElse(null))
                .build();
    }

    private JoinRequestResponse mapToResponse(JoinRequest request) {
        Team team = request.getTeam();
        User requester = request.getRequester();
        return JoinRequestResponse.builder()
                .requestId(request.getRequestId())
                .teamId(team.getTeamId())
                .teamName(team.getName())
                .eventId(team.getEvent().getEventId())
                .eventName(team.getEvent().getName())
                .trackId(team.getTrack().getTrackId())
                .trackName(team.getTrack().getName())
                .teamStatus(team.getStatus())
                .requesterUserId(requester.getUserId())
                .requesterName(requester.getFullName())
                .requesterEmail(requester.getEmail())
                .message(request.getMessage())
                .status(request.getStatus())
                .createdAt(request.getCreatedAt())
                .respondedAt(request.getRespondedAt())
                .build();
    }
}

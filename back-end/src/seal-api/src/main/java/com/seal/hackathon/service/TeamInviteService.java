package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.CreateInviteRequest;
import com.seal.hackathon.dto.response.TeamInviteResponse;
import com.seal.hackathon.entity.Team;
import com.seal.hackathon.entity.TeamInvite;
import com.seal.hackathon.entity.TeamMember;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ForbiddenException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.TeamInviteRepository;
import com.seal.hackathon.repository.TeamMemberRepository;
import com.seal.hackathon.repository.TeamRepository;
import com.seal.hackathon.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamInviteService {

    private static final int MAX_TEAM_MEMBERS = 5;
    private static final int MAX_MESSAGE_LENGTH = 1000;
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_ACCEPTED = "ACCEPTED";
    private static final String STATUS_DECLINED = "DECLINED";
    private static final Set<String> INVITABLE_USER_TYPES = Set.of("FPT_STUDENT", "EXTERNAL_STUDENT");

    private final TeamInviteRepository inviteRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public TeamInviteResponse createInvite(Integer inviterId, Integer teamId, CreateInviteRequest request) {
        requireId(inviterId, "Inviter ID");
        requireId(teamId, "Team ID");
        Integer invitedUserId = requireInvitedUserId(request);
        String message = normalizeMessage(request);

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        User inviter = requireApprovedActiveUser(inviterId, "Inviter");

        boolean isLeader = teamMemberRepository.findByTeam_TeamId(teamId).stream()
                .anyMatch(member -> inviterId.equals(member.getUser().getUserId())
                        && "LEADER".equalsIgnoreCase(member.getMemberRole()));
        if (!isLeader) {
            throw new ForbiddenException("Only the team leader can send invitations.");
        }

        validateTeamCanReceiveInvite(team);

        User invitedUser = userRepository.findById(invitedUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + invitedUserId));
        validateInvitableUser(invitedUser);

        if (teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(
                invitedUser.getUserId(), team.getEvent().getEventId())) {
            throw new BadRequestException("This user is already a member of a team in this event.");
        }

        TeamInvite invite = inviteRepository
                .findByTeamIdAndInvitedUserIdForUpdate(teamId, invitedUser.getUserId())
                .orElse(null);
        if (invite != null) {
            if (STATUS_PENDING.equalsIgnoreCase(invite.getStatus())) {
                throw new BadRequestException("There is already a pending invitation for this user.");
            }
            if (!STATUS_ACCEPTED.equalsIgnoreCase(invite.getStatus())
                    && !STATUS_DECLINED.equalsIgnoreCase(invite.getStatus())) {
                throw new BadRequestException("This invitation has an invalid status: " + invite.getStatus() + ".");
            }
            invite.setInvitedBy(inviter);
            invite.setMessage(message);
            invite.setStatus(STATUS_PENDING);
            invite.setCreatedAt(LocalDateTime.now());
            invite.setRespondedAt(null);
        } else {
            invite = TeamInvite.builder()
                    .team(team)
                    .invitedUser(invitedUser)
                    .invitedBy(inviter)
                    .message(message)
                    .status(STATUS_PENDING)
                    .build();
        }

        invite = saveInvite(invite);
        notificationService.createNotification(
                invitedUser.getUserId(),
                "Team invitation",
                inviter.getFullName() + " invited you to join team '" + team.getName() + "'.",
                "TEAM_INVITE"
        );

        return mapToResponse(invite);
    }

    @Transactional(readOnly = true)
    public List<TeamInviteResponse> getPendingInvites(Integer userId) {
        requireId(userId, "User ID");
        requireApprovedActiveUser(userId, "User");

        return inviteRepository.findByInvitedUser_UserIdAndStatus(userId, STATUS_PENDING).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TeamInviteResponse acceptInvite(Integer userId, Integer inviteId) {
        requireId(userId, "User ID");
        requireId(inviteId, "Invite ID");
        User user = requireApprovedActiveUser(userId, "User");

        TeamInvite invite = getInviteForUser(userId, inviteId);
        Team team = lockTeam(invite.getTeam().getTeamId());
        invite.setTeam(team);

        validateTeamCanReceiveInvite(team);
        validateInvitableUser(invite.getInvitedUser());

        if (teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(
                userId, team.getEvent().getEventId())) {
            throw new BadRequestException("You are already a member of a team in this event.");
        }

        LocalDateTime now = LocalDateTime.now();
        invite.setStatus(STATUS_ACCEPTED);
        invite.setRespondedAt(now);
        invite = saveInvite(invite);

        TeamMember member = TeamMember.builder()
                .team(team)
                .user(user)
                .memberRole("MEMBER")
                .build();
        saveMember(member);

        TeamMember leader = findCurrentLeader(team);
        notificationService.createNotification(
                leader.getUser().getUserId(),
                "Invitation accepted",
                user.getFullName() + " accepted the invitation to join team '" + team.getName() + "'.",
                "TEAM_INVITE_ACCEPTED"
        );

        List<TeamInvite> otherPending = inviteRepository
                .findByInvitedUser_UserIdAndStatusAndTeam_Event_EventId(
                        userId, STATUS_PENDING, team.getEvent().getEventId()).stream()
                .filter(other -> !other.getInviteId().equals(inviteId))
                .collect(Collectors.toList());
        otherPending.forEach(other -> {
            other.setStatus(STATUS_DECLINED);
            other.setRespondedAt(now);
        });
        inviteRepository.saveAll(otherPending);

        return mapToResponse(invite);
    }

    @Transactional
    public TeamInviteResponse declineInvite(Integer userId, Integer inviteId) {
        requireId(userId, "User ID");
        requireId(inviteId, "Invite ID");
        requireApprovedActiveUser(userId, "User");

        TeamInvite invite = getInviteForUser(userId, inviteId);
        invite.setStatus(STATUS_DECLINED);
        invite.setRespondedAt(LocalDateTime.now());
        invite = saveInvite(invite);
        return mapToResponse(invite);
    }

    private TeamInvite getInviteForUser(Integer userId, Integer inviteId) {
        TeamInvite invite = inviteRepository.findByIdForUpdate(inviteId)
                .orElseThrow(() -> new ResourceNotFoundException("Invite not found: " + inviteId));
        if (!userId.equals(invite.getInvitedUser().getUserId())) {
            throw new ForbiddenException("This invitation does not belong to you.");
        }
        if (!STATUS_PENDING.equalsIgnoreCase(invite.getStatus())) {
            String status = invite.getStatus() == null ? "unknown" : invite.getStatus().toLowerCase(Locale.ROOT);
            throw new BadRequestException("This invitation has already been " +
                    status + ".");
        }
        return invite;
    }

    private void requireId(Integer id, String fieldName) {
        if (id == null) {
            throw new BadRequestException(fieldName + " is required.");
        }
    }

    private Integer requireInvitedUserId(CreateInviteRequest request) {
        if (request == null) {
            throw new BadRequestException("Request body is required.");
        }
        requireId(request.getInvitedUserId(), "Invited user ID");
        return request.getInvitedUserId();
    }

    private User requireApprovedActiveUser(Integer userId, String label) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(label + " not found: " + userId));
        if (!Boolean.TRUE.equals(user.getIsApproved()) || !Boolean.TRUE.equals(user.getIsActive())) {
            throw new BadRequestException(label + " account is not approved or active.");
        }
        return user;
    }

    private void validateInvitableUser(User user) {
        if (!Boolean.TRUE.equals(user.getIsApproved()) || !Boolean.TRUE.equals(user.getIsActive())) {
            throw new BadRequestException("Cannot invite a user whose account is not approved or active.");
        }
        if (user.getUserType() == null || !INVITABLE_USER_TYPES.contains(user.getUserType().toUpperCase(Locale.ROOT))) {
            throw new BadRequestException("Only student participant accounts can be invited to a team.");
        }
    }

    private void validateTeamCanReceiveInvite(Team team) {
        if (team.getEvent() == null) {
            throw new BadRequestException("This team is not linked to an event.");
        }
        if (!"OPEN".equalsIgnoreCase(team.getEvent().getStatus())) {
            throw new BadRequestException("This event is not open for team registration.");
        }
        LocalDateTime now = LocalDateTime.now();
        if (team.getEvent().getRegistrationStart() != null && now.isBefore(team.getEvent().getRegistrationStart())) {
            throw new BadRequestException("Registration has not started yet.");
        }
        if (team.getEvent().getRegistrationEnd() != null && now.isAfter(team.getEvent().getRegistrationEnd())) {
            throw new BadRequestException("Registration deadline has passed.");
        }
        if (!"APPROVED".equalsIgnoreCase(team.getStatus())) {
            throw new BadRequestException("Only approved teams can receive invitations.");
        }
        if (teamMemberRepository.countByTeam_TeamId(team.getTeamId()) >= MAX_TEAM_MEMBERS) {
            throw new BadRequestException("This team is already full (maximum 5 members).");
        }
    }

    private Team lockTeam(Integer teamId) {
        return teamRepository.findByIdForUpdate(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
    }

    private String normalizeMessage(CreateInviteRequest request) {
        if (request == null || request.getMessage() == null || request.getMessage().isBlank()) {
            return null;
        }
        String message = request.getMessage().trim();
        if (message.length() > MAX_MESSAGE_LENGTH) {
            throw new BadRequestException("Message must be at most " + MAX_MESSAGE_LENGTH + " characters.");
        }
        return message;
    }

    private TeamInvite saveInvite(TeamInvite invite) {
        try {
            return inviteRepository.saveAndFlush(invite);
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException("Invitation could not be saved because it conflicts with existing data.");
        }
    }

    private void saveMember(TeamMember member) {
        try {
            teamMemberRepository.save(member);
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException("This user is already a member of this team.");
        }
    }

    private TeamMember findCurrentLeader(Team team) {
        return teamMemberRepository.findByTeam_TeamId(team.getTeamId()).stream()
                .filter(member -> "LEADER".equalsIgnoreCase(member.getMemberRole()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("This team does not have a leader."));
    }

    private TeamInviteResponse mapToResponse(TeamInvite invite) {
        return TeamInviteResponse.builder()
                .inviteId(invite.getInviteId())
                .teamId(invite.getTeam().getTeamId())
                .teamName(invite.getTeam().getName())
                .eventName(invite.getTeam().getEvent().getName())
                .trackName(invite.getTeam().getTrack() != null ? invite.getTeam().getTrack().getName() : null)
                .teamStatus(invite.getTeam().getStatus())
                .invitedUserId(invite.getInvitedUser().getUserId())
                .invitedUserName(invite.getInvitedUser().getFullName())
                .invitedById(invite.getInvitedBy().getUserId())
                .invitedByName(invite.getInvitedBy().getFullName())
                .message(invite.getMessage())
                .status(invite.getStatus())
                .createdAt(invite.getCreatedAt())
                .respondedAt(invite.getRespondedAt())
                .build();
    }
}

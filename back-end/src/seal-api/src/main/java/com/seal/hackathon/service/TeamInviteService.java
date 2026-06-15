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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamInviteService {

    private final TeamInviteRepository inviteRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    // ── Leader sends invite ───────────────────────────────────────────

    @Transactional
    public TeamInviteResponse createInvite(Integer inviterId, Integer teamId, CreateInviteRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));

        // Only the team leader can send invites
        boolean isLeader = teamMemberRepository.findByTeam_TeamId(teamId).stream()
                .anyMatch(m -> m.getUser().getUserId().equals(inviterId)
                        && "LEADER".equalsIgnoreCase(m.getMemberRole()));
        if (!isLeader) {
            throw new ForbiddenException("Only the team leader can send invitations.");
        }

        User invitedUser = userRepository.findById(request.getInvitedUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getInvitedUserId()));

        if (!Boolean.TRUE.equals(invitedUser.getIsApproved())) {
            throw new BadRequestException("Cannot invite a user whose account is not approved.");
        }

        // Cannot invite someone already in the same event's team
        if (teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(
                invitedUser.getUserId(), team.getEvent().getEventId())) {
            throw new BadRequestException("This user is already a member of a team in this event.");
        }

        User inviter = userRepository.findById(inviterId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + inviterId));

        // A row may already exist from a previous invite (the UNIQUE (team_id,
        // invited_user_id) constraint forbids a second one). If it is still
        // PENDING, block; otherwise (ACCEPTED/DECLINED — e.g. the user joined
        // then left) reuse it and reset it to a fresh PENDING invitation.
        TeamInvite invite = inviteRepository
                .findByTeam_TeamIdAndInvitedUser_UserId(teamId, invitedUser.getUserId())
                .orElse(null);
        if (invite != null) {
            if ("PENDING".equalsIgnoreCase(invite.getStatus())) {
                throw new BadRequestException("There is already a pending invitation for this user.");
            }
            invite.setInvitedBy(inviter);
            invite.setMessage(request.getMessage());
            invite.setStatus("PENDING");
            invite.setCreatedAt(LocalDateTime.now());
            invite.setRespondedAt(null);
        } else {
            invite = TeamInvite.builder()
                    .team(team)
                    .invitedUser(invitedUser)
                    .invitedBy(inviter)
                    .message(request.getMessage())
                    .status("PENDING")
                    .build();
        }
        invite = inviteRepository.save(invite);

        notificationService.createNotification(
                invitedUser.getUserId(),
                "Team invitation",
                inviter.getFullName() + " invited you to join team '" + team.getName() + "'.",
                "TEAM_INVITE"
        );

        return mapToResponse(invite);
    }

    // ── Get pending invites for current user ──────────────────────────

    @Transactional(readOnly = true)
    public List<TeamInviteResponse> getPendingInvites(Integer userId) {
        return inviteRepository.findByInvitedUser_UserIdAndStatus(userId, "PENDING").stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ── Accept invite ─────────────────────────────────────────────────

    @Transactional
    public TeamInviteResponse acceptInvite(Integer userId, Integer inviteId) {
        TeamInvite invite = getInviteForUser(userId, inviteId);

        if (teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(
                userId, invite.getTeam().getEvent().getEventId())) {
            throw new BadRequestException("You are already a member of a team in this event.");
        }

        // Hard cap: a team may have at most 5 members (per competition rules).
        if (teamMemberRepository.findByTeam_TeamId(invite.getTeam().getTeamId()).size() >= 5) {
            throw new BadRequestException("This team is already full (maximum 5 members).");
        }

        invite.setStatus("ACCEPTED");
        invite.setRespondedAt(LocalDateTime.now());
        inviteRepository.save(invite);

        User user = invite.getInvitedUser();
        TeamMember member = TeamMember.builder()
                .team(invite.getTeam())
                .user(user)
                .memberRole("MEMBER")
                .build();
        teamMemberRepository.save(member);

        TeamMember leader = findCurrentLeader(invite.getTeam());
        notificationService.createNotification(
                leader.getUser().getUserId(),
                "Invitation accepted",
                user.getFullName() + " accepted the invitation to join team '" +
                        invite.getTeam().getName() + "'.",
                "TEAM_INVITE_ACCEPTED"
        );

        // Cancel all other pending invites for this user in the same event
        inviteRepository.findByInvitedUser_UserIdAndStatus(userId, "PENDING").stream()
                .filter(i -> !i.getInviteId().equals(inviteId))
                .filter(i -> i.getTeam().getEvent().getEventId()
                        .equals(invite.getTeam().getEvent().getEventId()))
                .forEach(i -> {
                    i.setStatus("DECLINED");
                    i.setRespondedAt(LocalDateTime.now());
                    inviteRepository.save(i);
                });

        return mapToResponse(invite);
    }

    // ── Decline invite ────────────────────────────────────────────────

    @Transactional
    public TeamInviteResponse declineInvite(Integer userId, Integer inviteId) {
        TeamInvite invite = getInviteForUser(userId, inviteId);
        invite.setStatus("DECLINED");
        invite.setRespondedAt(LocalDateTime.now());
        inviteRepository.save(invite);
        return mapToResponse(invite);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private TeamInvite getInviteForUser(Integer userId, Integer inviteId) {
        TeamInvite invite = inviteRepository.findById(inviteId)
                .orElseThrow(() -> new ResourceNotFoundException("Invite not found: " + inviteId));
        if (!invite.getInvitedUser().getUserId().equals(userId)) {
            throw new ForbiddenException("This invitation does not belong to you.");
        }
        if (!"PENDING".equalsIgnoreCase(invite.getStatus())) {
            throw new BadRequestException("This invitation has already been " + invite.getStatus().toLowerCase() + ".");
        }
        return invite;
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

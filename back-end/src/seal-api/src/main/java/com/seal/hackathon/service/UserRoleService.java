package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.AssignRoleRequest;
import com.seal.hackathon.dto.request.CreateStaffRequest;
import com.seal.hackathon.dto.response.UserEventRoleResponse;
import com.seal.hackathon.dto.response.UserResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.JudgeAssignment;
import com.seal.hackathon.entity.MentorAssignment;
import com.seal.hackathon.entity.Role;
import com.seal.hackathon.entity.Round;
import com.seal.hackathon.entity.Track;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.entity.UserEventRole;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.HackathonEventRepository;
import com.seal.hackathon.repository.JudgeAssignmentRepository;
import com.seal.hackathon.repository.MentorAssignmentRepository;
import com.seal.hackathon.repository.RoleRepository;
import com.seal.hackathon.repository.RoundRepository;
import com.seal.hackathon.repository.TrackRepository;
import com.seal.hackathon.repository.UserEventRoleRepository;
import com.seal.hackathon.repository.UserRepository;
import com.seal.hackathon.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Role & assignment management theo schema mới:
 * - UserEventRole: pure N-N "ai ĐƯỢC PHÉP làm role gì trong event nào".
 * - JudgeAssignment: phân công judge chấm round (+ track nếu không phải Final).
 * - MentorAssignment: phân công mentor hỗ trợ track (cả event).
 */
@Service
@RequiredArgsConstructor
public class UserRoleService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserEventRoleRepository userEventRoleRepository;
    private final HackathonEventRepository hackathonEventRepository;
    private final TrackRepository trackRepository;
    private final RoundRepository roundRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final MentorAssignmentRepository mentorAssignmentRepository;
    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;

    /**
     * Coordinator creates a staff account that is pre-approved and pre-assigned a role.
     * Covers the requirements use case: coordinator creates temporary accounts for guest judges,
     * or creates mentor / coordinator accounts directly without the self-registration flow.
     *
     * If roundId (JUDGE) or trackId (MENTOR) is provided, the concrete work assignment
     * (JudgeAssignment / MentorAssignment) is created in the same step.
     */
    @Transactional
    public UserResponse createStaffAccount(CreateStaffRequest request, Authentication authentication) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("An account with this email already exists.");
        }

        String roleName = request.getRoleName().toUpperCase();
        Role role = roleRepository.findByRoleName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));

        Integer createdById = null;
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal p) {
            createdById = p.getUserId();
        }

        // Create user — pre-approved because coordinator is creating it directly
        User user = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .userType("STAFF")
                .provider("LOCAL")
                .isApproved(true)
                .isActive(true)
                .build();

        user = userRepository.save(user);

        // Grant the role immediately (pure role grant — no track/round scope here)
        UserEventRole assignment = UserEventRole.builder()
                .user(user)
                .role(role)
                .eventId(request.getEventId())
                .assignedBy(createdById)
                .build();
        userEventRoleRepository.save(assignment);

        // Optional concrete work assignment in the same step
        createWorkAssignmentIfRequested(user, roleName, request.getEventId(),
                request.getTrackId(), request.getRoundId(), request.getJudgeType(), createdById);

        User refreshed = userRepository.findByIdWithRoles(user.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found after creation."));
        return authService.mapToUserResponse(refreshed);
    }

    @Transactional
    public UserResponse assignRole(Integer targetUserId, AssignRoleRequest request, Authentication authentication) {
        User targetUser = userRepository.findByIdWithRoles(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + targetUserId));

        String roleName = request.getRoleName().toUpperCase();
        Role role = roleRepository.findByRoleName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));

        boolean hasWorkAssignment = request.getRoundId() != null || request.getTrackId() != null;

        // Prevent duplicate role grant at the same scope
        boolean alreadyGranted;
        if (request.getEventId() == null) {
            alreadyGranted = userEventRoleRepository
                    .existsByUser_UserIdAndRole_RoleNameAndEventIdIsNull(targetUserId, roleName);
        } else {
            alreadyGranted = userEventRoleRepository
                    .existsByUser_UserIdAndRole_RoleNameAndEventId(targetUserId, roleName, request.getEventId());
        }
        // A pure role grant that already exists is an error; if a work assignment is
        // requested, the existing grant is fine — only the assignment is added.
        if (alreadyGranted && !hasWorkAssignment) {
            throw new BadRequestException("User already has role " + roleName + " at this scope.");
        }

        Integer assignedById = null;
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            assignedById = principal.getUserId();
        }

        if (!alreadyGranted) {
            UserEventRole assignment = UserEventRole.builder()
                    .user(targetUser)
                    .role(role)
                    .eventId(request.getEventId())
                    .assignedBy(assignedById)
                    .build();
            userEventRoleRepository.save(assignment);
        }

        createWorkAssignmentIfRequested(targetUser, roleName, request.getEventId(),
                request.getTrackId(), request.getRoundId(), request.getJudgeType(), assignedById);

        // Reload with fresh roles after assignment
        User refreshed = userRepository.findByIdWithRoles(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + targetUserId));
        return authService.mapToUserResponse(refreshed);
    }

    /**
     * Creates the concrete work assignment when scope fields are present:
     * - JUDGE + roundId  -> JudgeAssignment (DB rule: non-final round requires trackId,
     *   final round must NOT have trackId; judgeType INTERNAL/GUEST is required).
     * - MENTOR + trackId -> MentorAssignment.
     */
    private void createWorkAssignmentIfRequested(User user, String roleName, Integer eventId,
                                                 Integer trackId, Integer roundId,
                                                 String judgeType, Integer assignedById) {
        switch (roleName) {
            case "JUDGE" -> {
                if (roundId == null) {
                    return; // role grant only — judge can be assigned to rounds later
                }
                Round round = roundRepository.findById(roundId)
                        .orElseThrow(() -> new ResourceNotFoundException("Round not found: " + roundId));
                if (eventId != null && !round.getEvent().getEventId().equals(eventId)) {
                    throw new BadRequestException("Round " + roundId + " does not belong to event " + eventId + ".");
                }

                if (judgeType == null || judgeType.isBlank()) {
                    throw new BadRequestException("judgeType (INTERNAL or GUEST) is required when assigning a judge to a round.");
                }
                String normalizedJudgeType = judgeType.toUpperCase();
                if (!normalizedJudgeType.equals("INTERNAL") && !normalizedJudgeType.equals("GUEST")) {
                    throw new BadRequestException("judgeType must be INTERNAL or GUEST.");
                }

                // is_final rule: preliminary rounds are judged per track, the final round is judged across all tracks
                Track track = null;
                if (Boolean.TRUE.equals(round.getIsFinal())) {
                    if (trackId != null) {
                        throw new BadRequestException("trackId must be null for the final round — judges score all teams.");
                    }
                } else {
                    if (trackId == null) {
                        throw new BadRequestException("trackId is required when assigning a judge to a non-final round.");
                    }
                    track = trackRepository.findById(trackId)
                            .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + trackId));
                    if (!track.getEvent().getEventId().equals(round.getEvent().getEventId())) {
                        throw new BadRequestException("Track " + trackId + " does not belong to the same event as round " + roundId + ".");
                    }
                }

                boolean duplicate = (track == null)
                        ? judgeAssignmentRepository.existsByJudge_UserIdAndRound_RoundIdAndTrackIsNull(user.getUserId(), roundId)
                        : judgeAssignmentRepository.existsByJudge_UserIdAndRound_RoundIdAndTrack_TrackId(user.getUserId(), roundId, trackId);
                if (duplicate) {
                    throw new BadRequestException("This judge is already assigned to this round/track.");
                }

                judgeAssignmentRepository.save(JudgeAssignment.builder()
                        .judge(user)
                        .round(round)
                        .track(track)
                        .judgeType(normalizedJudgeType)
                        .assignedBy(assignedById)
                        .build());
            }
            case "MENTOR" -> {
                if (trackId == null) {
                    return; // role grant only — mentor can be assigned to tracks later
                }
                Track track = trackRepository.findById(trackId)
                        .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + trackId));
                if (eventId != null && !track.getEvent().getEventId().equals(eventId)) {
                    throw new BadRequestException("Track " + trackId + " does not belong to event " + eventId + ".");
                }

                if (mentorAssignmentRepository.existsByMentor_UserIdAndTrack_TrackId(user.getUserId(), trackId)) {
                    throw new BadRequestException("This mentor is already assigned to this track.");
                }

                mentorAssignmentRepository.save(MentorAssignment.builder()
                        .mentor(user)
                        .track(track)
                        .assignedBy(assignedById)
                        .build());
            }
            default -> {
                // EVENT_COORDINATOR has no work assignment table
            }
        }
    }

    /**
     * Lists every staff role grant (UserEventRole row) with role/event/assigner
     * names resolved up front, so the coordinator UI can display human-readable labels
     * instead of raw foreign-key IDs.
     */
    @Transactional(readOnly = true)
    public List<UserEventRoleResponse> getAllStaffRoleAssignments() {
        List<UserEventRole> assignments = userEventRoleRepository.findAll();

        Set<Integer> eventIds = assignments.stream().map(UserEventRole::getEventId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Integer> assignerIds = assignments.stream().map(UserEventRole::getAssignedBy).filter(Objects::nonNull).collect(Collectors.toSet());

        Map<Integer, String> eventNames = hackathonEventRepository.findAllById(eventIds).stream()
                .collect(Collectors.toMap(HackathonEvent::getEventId, HackathonEvent::getName));
        Map<Integer, String> assignerNames = userRepository.findAllById(assignerIds).stream()
                .collect(Collectors.toMap(User::getUserId, User::getFullName));

        return assignments.stream()
                .map(uer -> UserEventRoleResponse.builder()
                        .id(uer.getId())
                        .userId(uer.getUser().getUserId())
                        .userFullName(uer.getUser().getFullName())
                        .userEmail(uer.getUser().getEmail())
                        .roleName(uer.getRole().getRoleName())
                        .eventId(uer.getEventId())
                        .eventName(eventNames.get(uer.getEventId()))
                        .assignedAt(uer.getAssignedAt())
                        .assignedById(uer.getAssignedBy())
                        .assignedByName(assignerNames.get(uer.getAssignedBy()))
                        .build())
                .collect(Collectors.toList());
    }
}

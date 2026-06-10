package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.AssignRoleRequest;
import com.seal.hackathon.dto.request.CreateStaffRequest;
import com.seal.hackathon.dto.response.UserEventRoleResponse;
import com.seal.hackathon.dto.response.UserResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.Role;
import com.seal.hackathon.entity.Round;
import com.seal.hackathon.entity.Track;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.entity.UserEventRole;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.HackathonEventRepository;
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

@Service
@RequiredArgsConstructor
public class UserRoleService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserEventRoleRepository userEventRoleRepository;
    private final HackathonEventRepository hackathonEventRepository;
    private final TrackRepository trackRepository;
    private final RoundRepository roundRepository;
    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;

    /**
     * Coordinator creates a staff account that is pre-approved and pre-assigned a role.
     * Covers the requirements use case: coordinator creates temporary accounts for guest judges,
     * or creates mentor / coordinator accounts directly without the self-registration flow.
     */
    @Transactional
    public UserResponse createStaffAccount(CreateStaffRequest request, Authentication authentication) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("An account with this email already exists.");
        }

        String roleName = request.getRoleName().toUpperCase();
        Role role = roleRepository.findByRoleName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));

        // JUDGE requires judgeType
        if ("JUDGE".equals(roleName) && (request.getJudgeType() == null || request.getJudgeType().isBlank())) {
            throw new BadRequestException("judgeType (INTERNAL or GUEST) is required when creating a JUDGE account.");
        }

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

        // Assign the role immediately
        UserEventRole assignment = UserEventRole.builder()
                .user(user)
                .role(role)
                .eventId(request.getEventId())
                .trackId(request.getTrackId())
                .roundId(request.getRoundId())
                .judgeType(request.getJudgeType() != null ? request.getJudgeType().toUpperCase() : null)
                .assignedBy(createdById)
                .build();

        userEventRoleRepository.save(assignment);

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

        // Prevent duplicate role assignment at the same scope
        boolean alreadyAssigned;
        if (request.getEventId() == null) {
            alreadyAssigned = userEventRoleRepository
                    .existsByUser_UserIdAndRole_RoleNameAndEventIdIsNull(targetUserId, roleName);
        } else {
            alreadyAssigned = userEventRoleRepository
                    .existsByUser_UserIdAndRole_RoleNameAndEventId(targetUserId, roleName, request.getEventId());
        }
        if (alreadyAssigned) {
            throw new BadRequestException("User already has role " + roleName + " at this scope.");
        }

        Integer assignedById = null;
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            assignedById = principal.getUserId();
        }

        UserEventRole assignment = UserEventRole.builder()
                .user(targetUser)
                .role(role)
                .eventId(request.getEventId())
                .trackId(request.getTrackId())
                .roundId(request.getRoundId())
                .judgeType(request.getJudgeType())
                .assignedBy(assignedById)
                .build();

        userEventRoleRepository.save(assignment);

        // Reload with fresh roles after assignment
        User refreshed = userRepository.findByIdWithRoles(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + targetUserId));
        return authService.mapToUserResponse(refreshed);
    }

    /**
     * Lists every staff role assignment (UserEventRole row) with role/event/track/round/assigner
     * names resolved up front, so the coordinator UI can display human-readable labels instead
     * of raw foreign-key IDs.
     */
    @Transactional(readOnly = true)
    public List<UserEventRoleResponse> getAllStaffRoleAssignments() {
        List<UserEventRole> assignments = userEventRoleRepository.findAll();

        Set<Integer> eventIds = assignments.stream().map(UserEventRole::getEventId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Integer> trackIds = assignments.stream().map(UserEventRole::getTrackId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Integer> roundIds = assignments.stream().map(UserEventRole::getRoundId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Integer> assignerIds = assignments.stream().map(UserEventRole::getAssignedBy).filter(Objects::nonNull).collect(Collectors.toSet());

        Map<Integer, String> eventNames = hackathonEventRepository.findAllById(eventIds).stream()
                .collect(Collectors.toMap(HackathonEvent::getEventId, HackathonEvent::getName));
        Map<Integer, String> trackNames = trackRepository.findAllById(trackIds).stream()
                .collect(Collectors.toMap(Track::getTrackId, Track::getName));
        Map<Integer, String> roundNames = roundRepository.findAllById(roundIds).stream()
                .collect(Collectors.toMap(Round::getRoundId, Round::getName));
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
                        .trackId(uer.getTrackId())
                        .trackName(trackNames.get(uer.getTrackId()))
                        .roundId(uer.getRoundId())
                        .roundName(roundNames.get(uer.getRoundId()))
                        .judgeType(uer.getJudgeType())
                        .assignedAt(uer.getAssignedAt())
                        .assignedById(uer.getAssignedBy())
                        .assignedByName(assignerNames.get(uer.getAssignedBy()))
                        .build())
                .collect(Collectors.toList());
    }
}

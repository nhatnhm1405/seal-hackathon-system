package com.seal.hackathon.service;

import java.util.List;

import com.seal.hackathon.dto.request.AssignRoleRequest;
import com.seal.hackathon.dto.request.CreateStaffRequest;
import com.seal.hackathon.dto.response.UserResponse;
import com.seal.hackathon.entity.Role;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.entity.UserEventRole;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.RoleRepository;
import com.seal.hackathon.repository.UserEventRoleRepository;
import com.seal.hackathon.repository.UserRepository;
import com.seal.hackathon.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserRoleService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserEventRoleRepository userEventRoleRepository;
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

        String roleName = normalizeRoleName(request.getRoleName());
        String judgeType = normalizeJudgeType(request.getJudgeType());

        validateRoleScope(roleName, request.getEventId(), request.getTrackId(), request.getRoundId(), judgeType);

        if (!"JUDGE".equals(roleName)) {
            judgeType = null;
        }

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

        // Assign the role immediately
        UserEventRole assignment = UserEventRole.builder()
                .user(user)
                .role(role)
                .eventId(request.getEventId())
                .trackId(request.getTrackId())
                .roundId(request.getRoundId())
                .judgeType(judgeType)
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

        String roleName = normalizeRoleName(request.getRoleName());
        String judgeType = normalizeJudgeType(request.getJudgeType());

        validateRoleScope(roleName, request.getEventId(), request.getTrackId(), request.getRoundId(), judgeType);

        if (!"JUDGE".equals(roleName)) {
            judgeType = null;
        }

        Role role = roleRepository.findByRoleName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));

        // Prevent duplicate role assignment at the same scope
        boolean alreadyAssigned;
        if (request.getEventId() == null) {
            alreadyAssigned = userEventRoleRepository
                    .existsByUser_UserIdAndRole_RoleNameAndEventIdIsNull(targetUserId, role.getRoleName());
        } else {
            alreadyAssigned = userEventRoleRepository
                    .existsByUser_UserIdAndRole_RoleNameAndEventId(targetUserId, role.getRoleName(), request.getEventId());
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
                .judgeType(judgeType)
                .assignedBy(assignedById)
                .build();

        userEventRoleRepository.save(assignment);

        // Reload with fresh roles after assignment
        User refreshed = userRepository.findByIdWithRoles(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + targetUserId));
        return authService.mapToUserResponse(refreshed);
    }

    private String normalizeRoleName(String roleName) {
        if (roleName == null || roleName.trim().isBlank()) {
            throw new BadRequestException("roleName is required.");
        }
        return roleName.trim().toUpperCase();
    }

    private String normalizeJudgeType(String judgeType) {
        if (judgeType == null || judgeType.trim().isBlank()) {
            return null;
        }
        return judgeType.trim().toUpperCase();
    }

    private void validatePositiveId(Integer id, String fieldName) {
        if (id != null && id <= 0) {
            throw new BadRequestException(fieldName + " must be positive.");
        }
    }

    private void validateRoleScope(String roleName, Integer eventId, Integer trackId, Integer roundId, String judgeType) {
        List<String> allowedRoles = List.of("EVENT_COORDINATOR", "MENTOR", "JUDGE");
        if (!allowedRoles.contains(roleName)) {
            throw new BadRequestException("Invalid roleName. Allowed values are EVENT_COORDINATOR, MENTOR and JUDGE.");
        }

        if ("JUDGE".equals(roleName)) {
            if (judgeType == null) {
                throw new BadRequestException("judgeType is required when roleName is JUDGE.");
            }
            if (!"INTERNAL".equals(judgeType) && !"GUEST".equals(judgeType)) {
                throw new BadRequestException("Invalid judgeType. Allowed values are INTERNAL and GUEST.");
            }
        }

        if ("MENTOR".equals(roleName) && eventId == null) {
            throw new BadRequestException("eventId is required when roleName is MENTOR.");
        }
        if ("JUDGE".equals(roleName) && eventId == null) {
            throw new BadRequestException("eventId is required when roleName is JUDGE.");
        }

        validatePositiveId(eventId, "eventId");
        validatePositiveId(trackId, "trackId");
        validatePositiveId(roundId, "roundId");
    }
}

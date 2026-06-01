package com.seal.hackathon.service;

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
}

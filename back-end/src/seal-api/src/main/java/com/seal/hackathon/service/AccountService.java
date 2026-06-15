package com.seal.hackathon.service;

import com.seal.hackathon.dto.response.UserResponse;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.event.AccountApprovalEmailEvent;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final UserRepository userRepository;
    private final AuthService authService; // reuse the mapping helper
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationService notificationService;

    // ---------------------------------------------------------------
    // List pending approvals
    // ---------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<UserResponse> getPendingApprovals() {
        return userRepository.findAllByIsApprovedFalseAndIsActiveTrue().stream()
                .map(authService::mapToUserResponse)
                .collect(Collectors.toList());
    }

    // ---------------------------------------------------------------
    // Approve a user
    // ---------------------------------------------------------------

    @Transactional
    public UserResponse approveUser(Integer userId) {
        User user = getUserOrThrow(userId);

        if (Boolean.TRUE.equals(user.getIsApproved())) {
            throw new BadRequestException("User is already approved.");
        }

        user.setIsApproved(true);
        userRepository.save(user);
        notificationService.createNotification(
                user.getUserId(),
                "Account approved",
                "Your account has been approved. You can now access SEAL Hackathon.",
                "ACCOUNT_APPROVED"
        );
        eventPublisher.publishEvent(new AccountApprovalEmailEvent(
                user.getEmail(),
                user.getFullName(),
                true
        ));
        // Rejected users have is_active=false and cannot log in, so an in-app
        // notification only makes sense for approvals (they get an email either way).
        notificationService.createNotification(
                user.getUserId(),
                "Account approved",
                "Your account has been approved. Welcome to SEAL Hackathon!",
                "ACCOUNT");
        return authService.mapToUserResponse(user);
    }

    // ---------------------------------------------------------------
    // Reject a user
    // Rejection sets is_active = false so the user cannot log in.
    // Reason can be stored in AuditLog (not implemented in this module).
    // ---------------------------------------------------------------

    @Transactional
    public UserResponse rejectUser(Integer userId) {
        User user = getUserOrThrow(userId);

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new BadRequestException("User is already inactive/rejected.");
        }

        user.setIsApproved(false);
        user.setIsActive(false);
        userRepository.save(user);
        eventPublisher.publishEvent(new AccountApprovalEmailEvent(
                user.getEmail(),
                user.getFullName(),
                false
        ));
        return authService.mapToUserResponse(user);
    }

    // ---------------------------------------------------------------
    // Activate / deactivate (for UserController)
    // ---------------------------------------------------------------

    @Transactional
    public UserResponse activateUser(Integer userId) {
        User user = getUserOrThrow(userId);
        user.setIsActive(true);
        userRepository.save(user);
        return authService.mapToUserResponse(user);
    }

    @Transactional
    public UserResponse deactivateUser(Integer userId) {
        User user = getUserOrThrow(userId);
        user.setIsActive(false);
        userRepository.save(user);
        return authService.mapToUserResponse(user);
    }

    // ---------------------------------------------------------------
    // Helper
    // ---------------------------------------------------------------

    private User getUserOrThrow(Integer userId) {
        return userRepository.findByIdWithRoles(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
    }
}

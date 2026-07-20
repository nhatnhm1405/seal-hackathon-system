package com.seal.hackathon.service;

import com.seal.hackathon.dto.response.UserResponse;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.event.AccountApprovalEmailEvent;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuthService authService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AccountService accountService;

    @Test
    void approveUser_shouldApproveActivateNotifyAndRecordAuditLog() {
        Integer targetUserId = 11;
        Integer actorUserId = 7;
        User user = pendingUser(targetUserId);
        UserResponse response = UserResponse.builder()
                .userId(targetUserId)
                .isApproved(true)
                .isActive(true)
                .build();

        when(userRepository.findByIdWithRoles(targetUserId)).thenReturn(Optional.of(user));
        when(authService.mapToUserResponse(user)).thenReturn(response);

        accountService.approveUser(targetUserId, actorUserId);

        assertTrue(user.getIsApproved());
        assertTrue(user.getIsActive());
        verify(userRepository).save(user);
        verify(notificationService).createNotification(
                eq(targetUserId),
                eq("Account approved"),
                any(String.class),
                eq("ACCOUNT_APPROVED"));
        verify(eventPublisher).publishEvent(any(AccountApprovalEmailEvent.class));
        verify(auditLogService).record(actorUserId, "APPROVE_ACCOUNT", "USER", targetUserId);
    }

    @Test
    void approveUser_shouldNotRecordAuditLog_whenUserAlreadyApproved() {
        Integer targetUserId = 11;
        Integer actorUserId = 7;
        User user = pendingUser(targetUserId);
        user.setIsApproved(true);

        when(userRepository.findByIdWithRoles(targetUserId)).thenReturn(Optional.of(user));

        assertThrows(BadRequestException.class, () -> accountService.approveUser(targetUserId, actorUserId));

        verify(userRepository, never()).save(any());
        verify(notificationService, never()).createNotification(any(), any(), any(), any());
        verify(eventPublisher, never()).publishEvent(any());
        verify(auditLogService, never()).record(any(), any(), any(), any());
    }

    private static User pendingUser(Integer userId) {
        return User.builder()
                .userId(userId)
                .email("student" + userId + "@example.com")
                .fullName("Student " + userId)
                .userType("FPT_STUDENT")
                .isApproved(false)
                .isActive(false)
                .build();
    }
}

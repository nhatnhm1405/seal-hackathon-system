package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.UpdateProfileRequest;
import com.seal.hackathon.dto.response.UserResponse;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.repository.TeamMemberRepository;
import com.seal.hackathon.repository.UserRepository;
import com.seal.hackathon.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    @Test
    void updateOwnProfile_shouldUpdateEditableFieldsButKeepStudentId() {
        User user = student();
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setFullName(" Nguyen Updated ");
        request.setUniversity(" FPT University ");

        when(userRepository.findByEmailWithRoles(user.getEmail())).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        UserResponse response = authService.updateOwnProfile(user.getEmail(), request);

        assertEquals("Nguyen Updated", response.getFullName());
        assertEquals("SE123456", response.getStudentId());
        assertEquals("FPT University", response.getUniversity());
        verify(userRepository).save(user);
    }

    @Test
    void updateOwnProfile_shouldAllowUnchangedStudentIdEcho() {
        User user = student();
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setStudentId(" SE123456 ");

        when(userRepository.findByEmailWithRoles(user.getEmail())).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        UserResponse response = authService.updateOwnProfile(user.getEmail(), request);

        assertEquals("SE123456", response.getStudentId());
        verify(userRepository).save(user);
    }

    @Test
    void updateOwnProfile_shouldRejectStudentIdChange() {
        User user = student();
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setStudentId("SE999999");

        when(userRepository.findByEmailWithRoles(user.getEmail())).thenReturn(Optional.of(user));

        assertThrows(BadRequestException.class, () -> authService.updateOwnProfile(user.getEmail(), request));
        verify(userRepository, never()).save(user);
    }

    private User student() {
        return User.builder()
                .userId(100)
                .email("student@fpt.edu.vn")
                .fullName("Nguyen Student")
                .userType("FPT_STUDENT")
                .studentId("SE123456")
                .university("FPT")
                .isApproved(true)
                .isActive(true)
                .provider("LOCAL")
                .build();
    }
}

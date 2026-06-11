package com.seal.hackathon.security;

import com.seal.hackathon.entity.User;
import com.seal.hackathon.entity.Role;
import com.seal.hackathon.entity.UserEventRole;
import com.seal.hackathon.repository.RoleRepository;
import com.seal.hackathon.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tells Spring Security how to load a user by email.
 * Uses the FETCH JOIN query to avoid lazy-loading UserEventRole separately.
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmailWithRoles(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
        return new UserPrincipal(user, getRoleNames(user));
    }

    @Transactional(readOnly = true)
    public UserDetails loadUserById(Integer userId) {
        User user = userRepository.findByIdWithRoles(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + userId));
        return new UserPrincipal(user, getRoleNames(user));
    }

    private java.util.List<String> getRoleNames(User user) {
        return user.getUserEventRoles().stream()
                .map(uer -> uer.getRole().getRoleName())
                .distinct()
                .sorted()
                .toList();
    }
}

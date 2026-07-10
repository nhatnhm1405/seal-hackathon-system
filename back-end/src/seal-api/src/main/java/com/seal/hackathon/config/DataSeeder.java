package com.seal.hackathon.config;

import com.seal.hackathon.entity.Role;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.entity.UserEventRole;
import com.seal.hackathon.repository.RoleRepository;
import com.seal.hackathon.repository.UserEventRoleRepository;
import com.seal.hackathon.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Seeds the <b>essential bootstrap data</b> a code-first database needs to be usable:
 * the four staff roles and one SYSTEM_ADMIN account to log in with. Runs on every
 * boot but is fully idempotent (only inserts what is missing), so it is safe with
 * {@code ddl-auto=update} and after a drop-and-recreate.
 *
 * <p>This replaces the "must-have" rows that used to live in seal_schema.sql /
 * seal_seed.sql. Sample/demo data (events, teams, submissions…) is intentionally NOT
 * seeded here — that belongs in a separate, toggleable demo seeder.
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    // Bootstrap admin — the chicken-and-egg breaker: SYSTEM_ADMIN is granted, never
    // self-registered, so a fresh DB needs one seeded account to administer from.
    private static final String ADMIN_EMAIL = "admin@fpt.edu.vn";
    private static final String ADMIN_PASSWORD = "Test@1234";

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final UserEventRoleRepository userEventRoleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        seedRoles();
        seedBootstrapAdmin();
    }

    private void seedRoles() {
        List<RoleDef> roles = List.of(
                new RoleDef("SYSTEM_ADMIN", "Platform operator — accounts, role grants, templates, system logs"),
                new RoleDef("EVENT_COORDINATOR", "SE Dept / PDP staff — runs a hackathon event"),
                new RoleDef("MENTOR", "Supports teams within an assigned track"),
                new RoleDef("JUDGE", "Scores submissions for assigned rounds/tracks"));

        for (RoleDef def : roles) {
            if (!roleRepository.existsByRoleName(def.name())) {
                roleRepository.save(Role.builder()
                        .roleName(def.name())
                        .description(def.description())
                        .build());
                log.info("[seed] created role {}", def.name());
            }
        }
    }

    private void seedBootstrapAdmin() {
        if (userRepository.existsByEmail(ADMIN_EMAIL)) {
            return;
        }
        Role adminRole = roleRepository.findByRoleName("SYSTEM_ADMIN")
                .orElseThrow(() -> new IllegalStateException("SYSTEM_ADMIN role must be seeded before the admin account"));

        User admin = userRepository.save(User.builder()
                .email(ADMIN_EMAIL)
                .passwordHash(passwordEncoder.encode(ADMIN_PASSWORD))
                .fullName("SEAL System Admin")
                .userType("STAFF")
                .provider("LOCAL")
                .isApproved(true)
                .isActive(true)
                .build());

        // System-wide role → eventId is null.
        userEventRoleRepository.save(UserEventRole.builder()
                .user(admin)
                .role(adminRole)
                .eventId(null)
                .build());

        log.info("[seed] created bootstrap SYSTEM_ADMIN account: {}", ADMIN_EMAIL);
    }

    private record RoleDef(String name, String description) {
    }
}

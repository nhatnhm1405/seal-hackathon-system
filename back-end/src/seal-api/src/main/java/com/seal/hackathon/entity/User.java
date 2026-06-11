package com.seal.hackathon.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Maps to the `User` table in seal_hackathon schema.
 * password_hash is nullable to support OAuth2 users who have no local password.
 * provider tracks which auth method was used (LOCAL, GOOGLE, GITHUB).
 */
@Entity
@Table(name = "`User`")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    // Nullable: OAuth2 users do not have a local password
    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    // FPT_STUDENT | EXTERNAL_STUDENT | STAFF
    @Column(name = "user_type", nullable = false, length = 20)
    private String userType;

    @Column(name = "student_id", length = 50)
    private String studentId;

    @Column(name = "university", length = 255)
    private String university;

    // false = pending approval, true = approved and can log in
    @Column(name = "is_approved", nullable = false)
    @Builder.Default
    private Boolean isApproved = false;

    // false = deactivated/rejected, true = active
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // MySQL ON UPDATE CURRENT_TIMESTAMP — managed by DB, not Hibernate
    @Column(name = "expired_at")
    private LocalDateTime expiredAt;

    // LOCAL | GOOGLE | GITHUB  (added via ALTER TABLE)
    @Column(name = "provider", length = 20, nullable = false)
    @Builder.Default
    private String provider = "LOCAL";

    // Unique ID from the OAuth2 provider (added via ALTER TABLE)
    @Column(name = "provider_id", length = 255)
    private String providerId;

    // Profile picture URL from OAuth2 provider (added via ALTER TABLE)
    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    // Roles assigned to this user (across all events)
    @OneToMany(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", insertable = false, updatable = false)
    @Builder.Default
    private List<UserEventRole> userEventRoles = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (provider == null) {
            provider = "LOCAL";
        }
    }
}

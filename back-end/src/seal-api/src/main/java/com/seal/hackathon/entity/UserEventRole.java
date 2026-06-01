package com.seal.hackathon.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Maps to the `UserEventRole` table.
 * Stores staff role assignments only: EVENT_COORDINATOR, MENTOR, JUDGE.
 *
 * Participants (FPT_STUDENT / EXTERNAL_STUDENT) are NOT stored here —
 * their identity comes from User.user_type and their team role from TeamMember.member_role.
 *
 * Scope rules:
 * - EVENT_COORDINATOR: event_id may be null (all events) or scoped to one event
 * - MENTOR:            event_id + track_id set
 * - JUDGE:             event_id + round_id set; judge_type = INTERNAL or GUEST
 *
 * event_id, track_id, round_id are plain Integer IDs because those entities
 * are not part of this module yet.
 */
@Entity
@Table(name = "UserEventRole")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserEventRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    // Nullable: EVENT_COORDINATOR may manage all events (no event scope)
    @Column(name = "event_id")
    private Integer eventId;

    // Nullable: only set for track-scoped roles (MENTOR, or JUDGE for a specific track)
    @Column(name = "track_id")
    private Integer trackId;

    // Nullable: only set for round-scoped roles (JUDGE)
    @Column(name = "round_id")
    private Integer roundId;

    // INTERNAL or GUEST — only relevant when role = JUDGE
    @Column(name = "judge_type", length = 20)
    private String judgeType;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;

    // The user ID of the coordinator who made this assignment
    @Column(name = "assigned_by")
    private Integer assignedBy;

    @PrePersist
    protected void onCreate() {
        if (assignedAt == null) {
            assignedAt = LocalDateTime.now();
        }
    }
}

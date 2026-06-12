package com.seal.hackathon.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Maps to the `JudgeAssignment` table — which submissions a judge may score.
 *
 * - Preliminary round: track is set  -> judge scores that track only.
 * - Final round:       track is NULL -> judge scores all teams.
 *
 * Service layer must enforce:
 *   round.is_final = FALSE -> track REQUIRED
 *   round.is_final = TRUE  -> track must be NULL
 */
@Entity
@Table(name = "JudgeAssignment", uniqueConstraints = {
    @UniqueConstraint(name = "uq_judge_round_track", columnNames = {"judge_user_id", "round_id", "track_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JudgeAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "judge_user_id", nullable = false)
    private User judge;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "round_id", nullable = false)
    private Round round;

    // Nullable: NULL = score all tracks (final round)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "track_id")
    private Track track;

    // INTERNAL or GUEST
    @Column(name = "judge_type", nullable = false, length = 20)
    private String judgeType;

    @Column(name = "assigned_at", nullable = false, updatable = false)
    private LocalDateTime assignedAt;

    // The user ID of the coordinator who made this assignment
    @Column(name = "assigned_by")
    private Integer assignedBy;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @PrePersist
    protected void onCreate() {
        if (assignedAt == null) {
            assignedAt = LocalDateTime.now();
        }
        if (isActive == null) {
            isActive = true;
        }
    }
}

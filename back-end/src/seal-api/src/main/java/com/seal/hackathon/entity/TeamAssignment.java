package com.seal.hackathon.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Maps to the `TeamAssignment` table.
 * Gán mentor/judge cho team cụ thể.
 *
 * - assignment_type: 'MENTOR' hoặc 'JUDGE'
 * - is_active: TRUE = đang hoạt động, FALSE = đã hủy/ngưng
 * - user_id: FK tới User (user phải có role MENTOR/JUDGE trong UserEventRole)
 */
@Entity
@Table(name = "TeamAssignment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "assignment_type", nullable = false, length = 20)
    private String assignmentType;

    @Column(name = "event_id")
    private Integer eventId;

    @Column(name = "round_id")
    private Integer roundId;

    @Column(name = "assigned_at", nullable = false, updatable = false)
    private LocalDateTime assignedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by")
    private User assignedByUser;

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

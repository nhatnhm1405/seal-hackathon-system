package com.seal.hackathon.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "Track", uniqueConstraints = {
    @UniqueConstraint(name = "uq_track_event_name", columnNames = {"event_id", "name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Track {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "track_id")
    private Integer trackId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private HackathonEvent event;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // Max teams allowed in this track. Auto-computed when the event enters SETUP
    // (≈ approvedTeams / trackCount, balanced so tracks differ by at most 1).
    // NULL = not yet computed / unlimited.
    @Column(name = "capacity")
    private Integer capacity;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}

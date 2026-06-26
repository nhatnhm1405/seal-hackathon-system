package com.seal.hackathon.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Maps to the `Prize` table. SEAL prizes are EVENT-WIDE: winners are the top N of
 * the FINAL round's global ranking (all teams across all tracks combined), so
 * {@code track} is always NULL. The per-track {@code Round.topNAdvance} is a
 * separate, advancement-only concept — unrelated to prizes.
 *
 * Lifecycle: a prize starts as a draft slot (team may be filled from the final
 * ranking, but {@code awardedAt} is NULL = not public). Announcing the prizes sets
 * {@code awardedAt}, which makes them visible publicly and notifies the winners.
 */
@Entity
@Table(name = "Prize")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prize {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "prize_id")
    private Integer prizeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private HackathonEvent event;

    // Always NULL for event-wide prizes; kept for schema compatibility.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "track_id")
    private Track track;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "rank_position", nullable = false)
    private Integer rankPosition;

    // Set when a team is assigned to this prize (from the final ranking or by hand).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    // NULL = draft (not public). Set on announce.
    @Column(name = "awarded_at")
    private LocalDateTime awardedAt;
}

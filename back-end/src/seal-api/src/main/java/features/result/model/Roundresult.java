package features.result.model;

import features.auth.model.User;
import features.event.model.Round;
import features.team.model.Team;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "roundresult")
public class Roundresult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "result_id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "round_id", nullable = false)
    private Round round;

    @Column(name = "total_score", nullable = false, precision = 7, scale = 2)
    private BigDecimal totalScore;

    @Column(name = "rank_position", nullable = false)
    private Integer rankPosition;

    @ColumnDefault("0")
    @Column(name = "advanced", nullable = false)
    private Boolean advanced;

    @ColumnDefault("0")
    @Column(name = "is_published", nullable = false)
    private Boolean isPublished;

    @Column(name = "finalized_at")
    private Instant finalizedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finalized_by")
    private User finalizedBy;


}
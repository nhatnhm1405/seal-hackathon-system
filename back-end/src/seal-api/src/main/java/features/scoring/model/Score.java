package features.scoring.model;

import features.submission.model.Submission;
import features.auth.model.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "score")
public class Score {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "score_id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false)
    private Submission submission;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "judge_user_id", nullable = false)
    private User judgeUser;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "criteria_id", nullable = false)
    private Scoringcriteria criteria;

    @Column(name = "value", nullable = false, precision = 5, scale = 2)
    private BigDecimal value;

    @Lob
    @Column(name = "comment")
    private String comment;

    @ColumnDefault("1")
    @Column(name = "is_draft", nullable = false)
    private Boolean isDraft;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "scored_at", nullable = false)
    private Instant scoredAt;

    @Column(name = "updated_at")
    private Instant updatedAt;


}
package features.team.model;

import features.auth.model.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "teammember")
public class Teammember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ColumnDefault("'MEMBER'")
    @Column(name = "member_role", nullable = false, length = 20)
    private String memberRole;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;


}
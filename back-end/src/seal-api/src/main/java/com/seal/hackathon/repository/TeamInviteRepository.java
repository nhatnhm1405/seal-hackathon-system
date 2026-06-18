package com.seal.hackathon.repository;

import com.seal.hackathon.entity.TeamInvite;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamInviteRepository extends JpaRepository<TeamInvite, Integer> {
    List<TeamInvite> findByInvitedUser_UserIdAndStatus(Integer userId, String status);
    Optional<TeamInvite> findByTeam_TeamIdAndInvitedUser_UserId(Integer teamId, Integer userId);
    boolean existsByTeam_TeamIdAndInvitedUser_UserId(Integer teamId, Integer userId);

    List<TeamInvite> findByInvitedUser_UserIdAndStatusAndTeam_Event_EventId(
            Integer userId,
            String status,
            Integer eventId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM TeamInvite i WHERE i.inviteId = :inviteId")
    Optional<TeamInvite> findByIdForUpdate(@Param("inviteId") Integer inviteId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT i
            FROM TeamInvite i
            WHERE i.team.teamId = :teamId
              AND i.invitedUser.userId = :userId
            """)
    Optional<TeamInvite> findByTeamIdAndInvitedUserIdForUpdate(
            @Param("teamId") Integer teamId,
            @Param("userId") Integer userId
    );
}

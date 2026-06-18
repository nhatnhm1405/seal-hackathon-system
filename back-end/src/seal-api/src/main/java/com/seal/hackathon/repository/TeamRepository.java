package com.seal.hackathon.repository;

import com.seal.hackathon.entity.Team;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamRepository extends JpaRepository<Team, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Team t WHERE t.teamId = :teamId")
    Optional<Team> findByIdForUpdate(@Param("teamId") Integer teamId);

    boolean existsByEvent_EventIdAndName(Integer eventId, String name);

    @Query("""
            SELECT COUNT(t) > 0
            FROM Team t
            WHERE t.event.eventId = :eventId
              AND UPPER(TRIM(t.name)) = :normalizedName
            """)
    boolean existsByEventIdAndNormalizedName(
            @Param("eventId") Integer eventId,
            @Param("normalizedName") String normalizedName);

    List<Team> findAllByEvent_EventId(Integer eventId);
    List<Team> findAllByEvent_Status(String status);
    List<Team> findAllByEvent_EventIdAndStatus(Integer eventId, String status);
    List<Team> findAllByTrack_TrackIdAndStatus(Integer trackId, String status);
    boolean existsByTrack_TrackId(Integer trackId);
}

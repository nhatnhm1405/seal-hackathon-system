package com.seal.hackathon.repository;

import com.seal.hackathon.entity.Round;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoundRepository extends JpaRepository<Round, Integer> {

    @Query("SELECT r FROM Round r JOIN FETCH r.event WHERE r.roundId = :roundId AND r.event.eventId = :eventId")
    Optional<Round> findByIdAndEventId(Integer roundId, Integer eventId);
}

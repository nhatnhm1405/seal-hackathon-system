package com.seal.hackathon.repository;

import com.seal.hackathon.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TeamRepository extends JpaRepository<Team, Integer> {
    boolean existsByEvent_EventIdAndName(Integer eventId, String name);
}

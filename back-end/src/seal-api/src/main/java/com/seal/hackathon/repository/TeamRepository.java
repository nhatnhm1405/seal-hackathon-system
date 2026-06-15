package com.seal.hackathon.repository;

import com.seal.hackathon.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Integer> {
    boolean existsByEvent_EventIdAndName(Integer eventId, String name);
    List<Team> findAllByEvent_EventId(Integer eventId);
    List<Team> findAllByEvent_Status(String status);
    List<Team> findAllByEvent_EventIdAndStatus(Integer eventId, String status);
    List<Team> findAllByTrack_TrackIdAndStatus(Integer trackId, String status);
}

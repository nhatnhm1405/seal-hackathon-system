package com.seal.hackathon.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.seal.hackathon.entity.Team;

@Repository
public interface TeamRepository extends JpaRepository<Team, Integer> {

    boolean existsByEvent_EventIdAndNameIgnoreCase(Integer eventId, String name);

    boolean existsByTrack_TrackId(Integer trackId);

    List<Team> findByEvent_EventIdAndTrack_TrackIdOrderByCreatedAtDesc(Integer eventId, Integer trackId);

    List<Team> findByEvent_EventIdAndTrack_TrackIdAndStatusOrderByCreatedAtDesc(Integer eventId, Integer trackId, String status);
}

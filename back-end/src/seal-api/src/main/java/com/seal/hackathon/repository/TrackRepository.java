package com.seal.hackathon.repository;

import com.seal.hackathon.entity.Track;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrackRepository extends JpaRepository<Track, Integer> {
    List<Track> findAllByEvent_EventId(Integer eventId);
}

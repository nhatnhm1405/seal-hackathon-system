package com.seal.hackathon.repository;

import com.seal.hackathon.entity.HackathonEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

public interface HackathonEventRepository extends JpaRepository<HackathonEvent, Integer> {

    List<HackathonEvent> findAllByStatus(String status);

    boolean existsByYearAndSeasonIgnoreCaseAndStatusNotIgnoreCase(
            Integer year,
            String season,
            String status
    );
}

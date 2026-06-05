package com.seal.hackathon.repository;

import com.seal.hackathon.entity.HackathonEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HackathonEventRepository extends JpaRepository<HackathonEvent, Integer> {
    List<HackathonEvent> findAllByStatus(String status);
}

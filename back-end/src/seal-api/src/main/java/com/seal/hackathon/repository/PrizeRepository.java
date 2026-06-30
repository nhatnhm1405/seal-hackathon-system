package com.seal.hackathon.repository;

import com.seal.hackathon.entity.Prize;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrizeRepository extends JpaRepository<Prize, Integer> {

    List<Prize> findAllByEvent_EventIdOrderByRankPosition(Integer eventId);

    List<Prize> findAllByEvent_EventIdAndAwardedAtIsNotNullOrderByRankPosition(Integer eventId);
}

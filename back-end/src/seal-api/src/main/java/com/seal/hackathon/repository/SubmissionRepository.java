package com.seal.hackathon.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.seal.hackathon.entity.Submission;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Integer> {
    List<Submission> findByRoundIdOrderBySubmittedAtDesc(Integer roundId);

    List<Submission> findByTeamId(Integer teamId);
}

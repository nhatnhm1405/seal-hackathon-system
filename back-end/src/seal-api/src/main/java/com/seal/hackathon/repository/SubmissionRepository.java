package com.seal.hackathon.repository;

import com.seal.hackathon.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Integer> {
    Optional<Submission> findByTeam_TeamIdAndRound_RoundId(Integer teamId, Integer roundId);
    List<Submission> findAllByRound_RoundId(Integer roundId);
    List<Submission> findAllByTeam_TeamId(Integer teamId);
}

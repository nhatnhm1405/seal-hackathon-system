package com.seal.hackathon.repository;

import com.seal.hackathon.entity.Score;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScoreRepository extends JpaRepository<Score, Integer> {
    List<Score> findAllBySubmission_SubmissionId(Integer submissionId);
    List<Score> findAllByJudge_UserIdAndSubmission_Round_RoundId(Integer judgeId, Integer roundId);
    Optional<Score> findBySubmission_SubmissionIdAndJudge_UserIdAndCriteria_CriteriaId(
            Integer submissionId, Integer judgeUserId, Integer criteriaId);
    boolean existsBySubmission_SubmissionIdAndJudge_UserId(Integer submissionId, Integer judgeId);
}

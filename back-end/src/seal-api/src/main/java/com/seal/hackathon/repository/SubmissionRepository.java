package com.seal.hackathon.repository;

import com.seal.hackathon.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Integer> {
    Optional<Submission> findByTeam_TeamIdAndRound_RoundId(Integer teamId, Integer roundId);
    List<Submission> findAllByRound_RoundId(Integer roundId);
    List<Submission> findAllByTeam_TeamId(Integer teamId);

    @Query("""
            SELECT DISTINCT s
            FROM Submission s
            JOIN s.round r
            JOIN s.team t
            LEFT JOIN t.track teamTrack
            JOIN JudgeAssignment ja ON ja.round = r
            WHERE s.submissionId = :submissionId
              AND ja.judge.userId = :judgeId
              AND ja.isActive = true
              AND (ja.track IS NULL OR ja.track = teamTrack)
            """)
    Optional<Submission> findBySubmissionIdAndJudgeId(
            @Param("submissionId") Integer submissionId,
            @Param("judgeId") Integer judgeId);

    @Query("""
            SELECT DISTINCT s
            FROM Submission s
            JOIN s.round r
            JOIN s.team t
            LEFT JOIN t.track teamTrack
            JOIN JudgeAssignment ja ON ja.round = r
            WHERE r.roundId = :roundId
              AND ja.judge.userId = :judgeId
              AND ja.isActive = true
              AND (ja.track IS NULL OR ja.track = teamTrack)
            ORDER BY s.submittedAt DESC
            """)
    List<Submission> findAllByRoundIdAndJudgeId(
            @Param("roundId") Integer roundId,
            @Param("judgeId") Integer judgeId);
}

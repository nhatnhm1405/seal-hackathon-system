package com.seal.hackathon.service;

import com.seal.hackathon.dto.response.SubmissionScoringProgressResponse;
import com.seal.hackathon.entity.JudgeAssignment;
import com.seal.hackathon.entity.Score;
import com.seal.hackathon.entity.ScoringCriteria;
import com.seal.hackathon.entity.Submission;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.JudgeAssignmentRepository;
import com.seal.hackathon.repository.RoundRepository;
import com.seal.hackathon.repository.ScoreRepository;
import com.seal.hackathon.repository.ScoringCriteriaRepository;
import com.seal.hackathon.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JudgeScoringCompletenessService {

    private final RoundRepository roundRepository;
    private final SubmissionRepository submissionRepository;
    private final JudgeAssignmentRepository assignmentRepository;
    private final ScoringCriteriaRepository criteriaRepository;
    private final ScoreRepository scoreRepository;

    @Transactional(readOnly = true)
    public List<SubmissionScoringProgressResponse> getProgress(Integer eventId, Integer roundId) {
        roundRepository.findByIdAndEventId(roundId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Round not found: " + roundId));
        return buildProgress(roundId);
    }

    @Transactional(readOnly = true)
    public void assertRoundComplete(Integer roundId) {
        List<SubmissionScoringProgressResponse> incomplete = buildProgress(roundId).stream()
                .filter(progress -> !Boolean.TRUE.equals(progress.getComplete()))
                .toList();
        if (incomplete.isEmpty()) return;

        String details = incomplete.stream().limit(5)
                .map(progress -> {
                    String missing = progress.getJudges().stream()
                            .filter(judge -> !"FINAL".equals(judge.getStatus()))
                            .map(SubmissionScoringProgressResponse.JudgeProgress::getJudgeName)
                            .collect(Collectors.joining(", "));
                    return progress.getTeamName() + ": " + progress.getCompletedJudgeCount()
                            + "/" + progress.getAssignedJudgeCount() + " judges completed"
                            + (missing.isBlank() ? "" : " (missing: " + missing + ")");
                })
                .collect(Collectors.joining("; "));
        if (incomplete.size() > 5) details += "; and " + (incomplete.size() - 5) + " more submission(s)";
        throw new BadRequestException("Scoring is incomplete. " + details + ".");
    }

    private List<SubmissionScoringProgressResponse> buildProgress(Integer roundId) {
        List<Submission> submissions = submissionRepository.findAllByRound_RoundId(roundId);
        List<JudgeAssignment> assignments = assignmentRepository
                .findAllByRound_RoundIdAndIsActiveTrue(roundId);
        List<ScoringCriteria> criteria = criteriaRepository
                .findAllByRound_RoundIdOrderByOrderNumber(roundId);
        List<Score> scores = scoreRepository.findAllBySubmission_Round_RoundId(roundId);

        Set<Integer> requiredCriteriaIds = criteria.stream()
                .map(ScoringCriteria::getCriteriaId)
                .collect(Collectors.toSet());
        Map<Integer, String> criteriaNames = criteria.stream().collect(Collectors.toMap(
                ScoringCriteria::getCriteriaId, ScoringCriteria::getName,
                (first, ignored) -> first, LinkedHashMap::new));

        Map<Integer, List<Score>> scoresBySubmission = scores.stream()
                .collect(Collectors.groupingBy(score -> score.getSubmission().getSubmissionId()));

        List<SubmissionScoringProgressResponse> result = new ArrayList<>();
        for (Submission submission : submissions) {
            Integer trackId = submission.getTeam().getTrack() == null
                    ? null : submission.getTeam().getTrack().getTrackId();
            List<JudgeAssignment> expected = assignments.stream()
                    .filter(assignment -> assignment.getTrack() == null
                            || Objects.equals(trackId, assignment.getTrack().getTrackId()))
                    .toList();
            List<Score> submissionScores = scoresBySubmission.getOrDefault(
                    submission.getSubmissionId(), List.of());

            List<SubmissionScoringProgressResponse.JudgeProgress> judgeProgress = expected.stream()
                    .map(assignment -> progressForJudge(
                            assignment, submissionScores, requiredCriteriaIds, criteriaNames))
                    .toList();
            int completed = (int) judgeProgress.stream()
                    .filter(progress -> "FINAL".equals(progress.getStatus()))
                    .count();
            boolean complete = !requiredCriteriaIds.isEmpty()
                    && !judgeProgress.isEmpty()
                    && completed == judgeProgress.size();

            result.add(SubmissionScoringProgressResponse.builder()
                    .submissionId(submission.getSubmissionId())
                    .teamId(submission.getTeam().getTeamId())
                    .teamName(submission.getTeam().getName())
                    .trackId(trackId)
                    .trackName(submission.getTeam().getTrack() == null
                            ? null : submission.getTeam().getTrack().getName())
                    .assignedJudgeCount(judgeProgress.size())
                    .completedJudgeCount(completed)
                    .complete(complete)
                    .judges(judgeProgress)
                    .build());
        }
        return result;
    }

    private SubmissionScoringProgressResponse.JudgeProgress progressForJudge(
            JudgeAssignment assignment,
            List<Score> submissionScores,
            Set<Integer> requiredCriteriaIds,
            Map<Integer, String> criteriaNames) {
        List<Score> ownScores = submissionScores.stream()
                .filter(score -> Objects.equals(score.getJudge().getUserId(),
                        assignment.getJudge().getUserId()))
                .toList();
        Set<Integer> finalizedCriteriaIds = ownScores.stream()
                .filter(score -> !Boolean.TRUE.equals(score.getIsDraft()))
                .map(score -> score.getCriteria().getCriteriaId())
                .collect(Collectors.toSet());
        List<String> missing = requiredCriteriaIds.stream()
                .filter(criteriaId -> !finalizedCriteriaIds.contains(criteriaId))
                .map(criteriaNames::get)
                .filter(Objects::nonNull)
                .toList();

        String status;
        if (!requiredCriteriaIds.isEmpty() && missing.isEmpty()) status = "FINAL";
        else if (ownScores.isEmpty()) status = "NOT_STARTED";
        else if (finalizedCriteriaIds.isEmpty()) status = "DRAFT";
        else status = "INCOMPLETE";

        return SubmissionScoringProgressResponse.JudgeProgress.builder()
                .judgeUserId(assignment.getJudge().getUserId())
                .judgeName(assignment.getJudge().getFullName())
                .status(status)
                .missingCriteria(missing)
                .build();
    }
}

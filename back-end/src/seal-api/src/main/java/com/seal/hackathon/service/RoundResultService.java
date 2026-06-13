package com.seal.hackathon.service;

import com.seal.hackathon.dto.response.RoundResultResponse;
import com.seal.hackathon.entity.*;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoundResultService {

    private final RoundResultRepository resultRepository;
    private final RoundRepository roundRepository;
    private final SubmissionRepository submissionRepository;
    private final ScoreRepository scoreRepository;
    private final ScoringCriteriaRepository criteriaRepository;
    private final UserRepository userRepository;
    private final HackathonEventRepository eventRepository;

    // ── Get leaderboard (published results only) ──────────────────────

    @Transactional(readOnly = true)
    public List<RoundResultResponse> getPublishedResults(Integer eventId, Integer roundId) {
        return resultRepository
                .findAllByRound_RoundIdAndIsPublishedTrueOrderByRankPosition(roundId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ── Coordinator: get all results (including unpublished) ──────────

    @Transactional(readOnly = true)
    public List<RoundResultResponse> getAllResults(Integer eventId, Integer roundId) {
        return resultRepository.findAllByRound_RoundIdOrderByRankPosition(roundId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ── Coordinator: finalize round — compute weighted scores, rank ───

    @Transactional
    public List<RoundResultResponse> finalizeRound(Integer eventId, Integer roundId, Integer coordinatorId) {
        Round round = roundRepository.findByIdAndEventId(roundId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Round not found: " + roundId));

        if ("FINALIZED".equalsIgnoreCase(round.getStatus())) {
            throw new BadRequestException("Round is already finalized.");
        }

        User coordinator = userRepository.findById(coordinatorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + coordinatorId));

        List<Submission> submissions = submissionRepository.findAllByRound_RoundId(roundId);
        if (submissions.isEmpty()) {
            throw new BadRequestException("No submissions found for this round.");
        }

        List<ScoringCriteria> criteriaList = criteriaRepository
                .findAllByRound_RoundIdOrderByOrderNumber(roundId);

        // Delete existing results for this round before re-computing
        List<RoundResult> existing = resultRepository.findAllByRound_RoundIdOrderByRankPosition(roundId);
        resultRepository.deleteAll(existing);

        // Compute average weighted score per team
        Map<Integer, BigDecimal> teamScores = new LinkedHashMap<>();
        for (Submission submission : submissions) {
            List<Score> scores = scoreRepository.findAllBySubmission_SubmissionId(
                    submission.getSubmissionId()).stream()
                    .filter(s -> !Boolean.TRUE.equals(s.getIsDraft()))
                    .collect(Collectors.toList());

            if (scores.isEmpty()) {
                teamScores.put(submission.getTeam().getTeamId(), BigDecimal.ZERO);
                continue;
            }

            // Group by judge and compute weighted sum per judge, then average
            Map<Integer, BigDecimal> judgeTotals = new HashMap<>();
            for (Score score : scores) {
                BigDecimal weighted = score.getValue().multiply(score.getCriteria().getWeight());
                judgeTotals.merge(score.getJudge().getUserId(), weighted, BigDecimal::add);
            }

            BigDecimal avg = judgeTotals.values().stream()
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(judgeTotals.size()), 2, RoundingMode.HALF_UP);

            teamScores.put(submission.getTeam().getTeamId(), avg);
        }

        // Sort teams by score descending
        List<Map.Entry<Integer, BigDecimal>> ranked = new ArrayList<>(teamScores.entrySet());
        ranked.sort((a, b) -> b.getValue().compareTo(a.getValue()));

        List<RoundResult> results = new ArrayList<>();
        Map<Integer, Submission> subByTeam = submissions.stream()
                .collect(Collectors.toMap(s -> s.getTeam().getTeamId(), s -> s));

        for (int i = 0; i < ranked.size(); i++) {
            Integer teamId = ranked.get(i).getKey();
            BigDecimal score = ranked.get(i).getValue();
            int rank = i + 1;

            Submission sub = subByTeam.get(teamId);
            RoundResult result = RoundResult.builder()
                    .team(sub.getTeam())
                    .round(round)
                    .totalScore(score)
                    .rankPosition(rank)
                    .isPublished(false)
                    .finalizedAt(LocalDateTime.now())
                    .finalizedBy(coordinator)
                    .build();
            results.add(resultRepository.save(result));
        }

        // Update round status to FINALIZED
        round.setStatus("FINALIZED");
        roundRepository.save(round);

        return results.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    // ── Coordinator: publish results ──────────────────────────────────

    @Transactional
    public List<RoundResultResponse> publishResults(Integer eventId, Integer roundId) {
        roundRepository.findByIdAndEventId(roundId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Round not found: " + roundId));

        List<RoundResult> results = resultRepository.findAllByRound_RoundIdOrderByRankPosition(roundId);
        if (results.isEmpty()) {
            throw new BadRequestException("No results to publish. Please finalize the round first.");
        }

        results.forEach(r -> r.setIsPublished(true));
        resultRepository.saveAll(results);

        return results.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    // ── Helper ────────────────────────────────────────────────────────

    private RoundResultResponse mapToResponse(RoundResult r) {
        return RoundResultResponse.builder()
                .resultId(r.getResultId())
                .teamId(r.getTeam().getTeamId())
                .teamName(r.getTeam().getName())
                .trackName(r.getTeam().getTrack().getName())
                .roundId(r.getRound().getRoundId())
                .roundName(r.getRound().getName())
                .totalScore(r.getTotalScore())
                .rankPosition(r.getRankPosition())
                // "advanced" is derived, not stored: rank_position <= Round.top_n_advance
                .advanced(isAdvanced(r))
                .isPublished(r.getIsPublished())
                .finalizedAt(r.getFinalizedAt())
                .finalizedById(r.getFinalizedBy() != null ? r.getFinalizedBy().getUserId() : null)
                .finalizedByName(r.getFinalizedBy() != null ? r.getFinalizedBy().getFullName() : null)
                .build();
    }

    /**
     * Derives whether a team advances: rank_position <= Round.top_n_advance.
     * If top_n_advance is null (no cut-off configured), no team is marked advanced.
     */
    private boolean isAdvanced(RoundResult r) {
        Integer topN = r.getRound().getTopNAdvance();
        return topN != null && r.getRankPosition() <= topN;
    }
}

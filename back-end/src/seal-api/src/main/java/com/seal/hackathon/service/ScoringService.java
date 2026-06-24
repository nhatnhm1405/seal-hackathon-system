package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.CreateCriteriaRequest;
import com.seal.hackathon.dto.request.SubmitScoresRequest;
import com.seal.hackathon.dto.response.ScoreResponse;
import com.seal.hackathon.dto.response.ScoringCriteriaResponse;
import com.seal.hackathon.entity.*;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScoringService {

    private final ScoringCriteriaRepository criteriaRepository;
    private final ScoringCriteriaTemplateRepository templateRepository;
    private final ScoreRepository scoreRepository;
    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final HackathonEventRepository eventRepository;
    private final RoundRepository roundRepository;

    // ── Criteria: list by round ───────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ScoringCriteriaResponse> getCriteriaByRound(Integer roundId) {
        return criteriaRepository.findAllByRound_RoundIdOrderByOrderNumber(roundId).stream()
                .map(this::mapCriteriaToResponse)
                .collect(Collectors.toList());
    }

    // ── Coordinator: add criteria to a round ─────────────────────────

    @Transactional
    public ScoringCriteriaResponse createCriteria(Integer eventId, Integer roundId, CreateCriteriaRequest request) {
        HackathonEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        Round round = roundRepository.findByIdAndEventId(roundId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Round not found: " + roundId));

        ScoringCriteria criteria = ScoringCriteria.builder()
                .event(event)
                .round(round)
                .name(request.getName().trim())
                .description(request.getDescription())
                .weight(request.getWeight())
                .maxScore(request.getMaxScore())
                .orderNumber(request.getOrderNumber())
                .build();
        criteria = criteriaRepository.save(criteria);
        return mapCriteriaToResponse(criteria);
    }

    // ── Coordinator: update a criteria (partial) ─────────────────────

    @Transactional
    public ScoringCriteriaResponse updateCriteria(Integer eventId, Integer roundId,
                                                  Integer criteriaId, CreateCriteriaRequest request) {
        ScoringCriteria criteria = findCriteriaInRound(eventId, roundId, criteriaId);

        if (request.getName() != null && !request.getName().isBlank()) {
            criteria.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            criteria.setDescription(request.getDescription());
        }
        if (request.getWeight() != null) {
            criteria.setWeight(request.getWeight());
        }
        if (request.getMaxScore() != null) {
            criteria.setMaxScore(request.getMaxScore());
        }
        if (request.getOrderNumber() != null) {
            criteria.setOrderNumber(request.getOrderNumber());
        }

        criteria = criteriaRepository.save(criteria);
        return mapCriteriaToResponse(criteria);
    }

    // ── Coordinator: delete a criteria ───────────────────────────────

    @Transactional
    public void deleteCriteria(Integer eventId, Integer roundId, Integer criteriaId) {
        ScoringCriteria criteria = findCriteriaInRound(eventId, roundId, criteriaId);

        if (scoreRepository.existsByCriteria_CriteriaId(criteriaId)) {
            throw new BadRequestException(
                    "Cannot delete this criteria — judges have already scored it. "
                            + "Remove the scores first or keep the criteria.");
        }

        criteriaRepository.delete(criteria);
    }

    // Loads a criteria and asserts it belongs to the given round + event.
    private ScoringCriteria findCriteriaInRound(Integer eventId, Integer roundId, Integer criteriaId) {
        ScoringCriteria criteria = criteriaRepository.findById(criteriaId)
                .orElseThrow(() -> new ResourceNotFoundException("Criteria not found: " + criteriaId));
        boolean roundMatches = criteria.getRound() != null
                && roundId.equals(criteria.getRound().getRoundId());
        boolean eventMatches = criteria.getEvent() != null
                && eventId.equals(criteria.getEvent().getEventId());
        if (!roundMatches || !eventMatches) {
            throw new ResourceNotFoundException(
                    "Criteria " + criteriaId + " not found in round " + roundId + " of event " + eventId);
        }
        return criteria;
    }

    // ── Judge: submit scores (batch) ──────────────────────────────────

    @Transactional
    public List<ScoreResponse> submitScores(Integer judgeId, SubmitScoresRequest request) {
        User judge = userRepository.findById(judgeId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + judgeId));

        Submission submission = submissionRepository.findById(request.getSubmissionId())
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + request.getSubmissionId()));

        boolean isDraft = request.isDraft();

        List<Score> saved = request.getScores().stream().map(entry -> {
            ScoringCriteria criteria = criteriaRepository.findById(entry.getCriteriaId())
                    .orElseThrow(() -> new ResourceNotFoundException("Criteria not found: " + entry.getCriteriaId()));

            if (entry.getValue().compareTo(criteria.getMaxScore()) > 0) {
                throw new BadRequestException("Score " + entry.getValue()
                        + " exceeds max score " + criteria.getMaxScore()
                        + " for criteria: " + criteria.getName());
            }

            Score score = scoreRepository.findBySubmission_SubmissionIdAndJudge_UserIdAndCriteria_CriteriaId(
                    submission.getSubmissionId(), judgeId, criteria.getCriteriaId())
                    .orElse(Score.builder()
                            .submission(submission)
                            .judge(judge)
                            .criteria(criteria)
                            .build());

            score.setValue(entry.getValue());
            score.setComment(entry.getComment());
            score.setIsDraft(isDraft);
            return scoreRepository.save(score);
        }).collect(Collectors.toList());

        return saved.stream().map(this::mapScoreToResponse).collect(Collectors.toList());
    }

    // ── Get all scores for a submission ───────────────────────────────

    @Transactional(readOnly = true)
    public List<ScoreResponse> getScoresBySubmission(Integer submissionId) {
        submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));
        return scoreRepository.findAllBySubmission_SubmissionId(submissionId).stream()
                .map(this::mapScoreToResponse)
                .collect(Collectors.toList());
    }

    // ── Judge: get my scores for a round ─────────────────────────────

    @Transactional(readOnly = true)
    public List<ScoreResponse> getMyScoresByRound(Integer judgeId, Integer roundId) {
        return scoreRepository.findAllByJudge_UserIdAndSubmission_Round_RoundId(judgeId, roundId).stream()
                .map(this::mapScoreToResponse)
                .collect(Collectors.toList());
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private ScoringCriteriaResponse mapCriteriaToResponse(ScoringCriteria c) {
        return ScoringCriteriaResponse.builder()
                .criteriaId(c.getCriteriaId())
                .name(c.getName())
                .description(c.getDescription())
                .weight(c.getWeight())
                .maxScore(c.getMaxScore())
                .orderNumber(c.getOrderNumber())
                .build();
    }

    private ScoreResponse mapScoreToResponse(Score s) {
        return ScoreResponse.builder()
                .scoreId(s.getScoreId())
                .submissionId(s.getSubmission().getSubmissionId())
                .judgeUserId(s.getJudge().getUserId())
                .judgeName(s.getJudge().getFullName())
                .criteriaId(s.getCriteria().getCriteriaId())
                .criteriaName(s.getCriteria().getName())
                .value(s.getValue())
                .comment(s.getComment())
                .isDraft(s.getIsDraft())
                .scoredAt(s.getScoredAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}

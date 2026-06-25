package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.CreateCriteriaRequest;
import com.seal.hackathon.dto.request.CreateTemplateRequest;
import com.seal.hackathon.dto.request.SubmitScoresRequest;
import com.seal.hackathon.dto.response.ScoreResponse;
import com.seal.hackathon.dto.response.ScoringCriteriaResponse;

import com.seal.hackathon.dto.response.ScoringCriteriaTemplateResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.Round;
import com.seal.hackathon.entity.Score;
import com.seal.hackathon.entity.ScoringCriteria;
import com.seal.hackathon.entity.ScoringCriteriaTemplate;
import com.seal.hackathon.entity.Submission;
import com.seal.hackathon.entity.User;

import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ForbiddenException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.HackathonEventRepository;
import com.seal.hackathon.repository.RoundRepository;
import com.seal.hackathon.repository.ScoreRepository;
import com.seal.hackathon.repository.ScoringCriteriaRepository;
import com.seal.hackathon.repository.ScoringCriteriaTemplateRepository;
import com.seal.hackathon.repository.SubmissionRepository;
import com.seal.hackathon.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScoringService {

    private static final String ROLE_EVENT_COORDINATOR = "ROLE_EVENT_COORDINATOR";
    private static final String ROLE_JUDGE = "ROLE_JUDGE";
    private static final String SUBMISSION_NOT_ASSIGNED_MESSAGE =
            "Submission not found or not assigned to this judge.";

    private final ScoringCriteriaRepository criteriaRepository;
    private final ScoringCriteriaTemplateRepository templateRepository;
    private final ScoreRepository scoreRepository;
    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final HackathonEventRepository eventRepository;
    private final RoundRepository roundRepository;

    @Transactional(readOnly = true)
    public List<ScoringCriteriaResponse> getCriteriaByRound(Integer roundId) {
        return criteriaRepository.findAllByRound_RoundIdOrderByOrderNumber(roundId).stream()
                .map(this::mapCriteriaToResponse)
                .collect(Collectors.toList());
    }

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

    // ── Criteria templates: list with their items ────────────────────

    @Transactional(readOnly = true)
    public List<ScoringCriteriaTemplateResponse> listTemplates() {
        return templateRepository.findAll().stream()
                .map(this::mapTemplateToResponse)
                .collect(Collectors.toList());
    }

    // ── Coordinator: apply a template's criteria to a round ───────────
    // REPLACES the round's criteria with the template's, so picking another
    // template swaps the set instead of stacking on top. Criteria that judges
    // have already scored cannot be removed (that would lose scores), so they
    // are kept and any template item with the same name is skipped.

    @Transactional
    public List<ScoringCriteriaResponse> applyTemplate(Integer eventId, Integer roundId, Integer templateId) {
        HackathonEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        Round round = roundRepository.findByIdAndEventId(roundId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Round not found: " + roundId));
        ScoringCriteriaTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found: " + templateId));

        List<ScoringCriteria> templateItems = criteriaRepository
                .findAllByTemplate_TemplateIdAndEventIsNullAndRoundIsNullOrderByOrderNumber(templateId);
        if (templateItems.isEmpty()) {
            throw new BadRequestException("Template \"" + template.getName() + "\" has no criteria to apply.");
        }

        // Drop the round's current criteria, keeping only ones already scored.
        List<ScoringCriteria> existing = criteriaRepository.findAllByRound_RoundIdOrderByOrderNumber(roundId);
        List<ScoringCriteria> kept = new ArrayList<>();
        List<ScoringCriteria> removable = new ArrayList<>();
        for (ScoringCriteria c : existing) {
            if (scoreRepository.existsByCriteria_CriteriaId(c.getCriteriaId())) {
                kept.add(c);
            } else {
                removable.add(c);
            }
        }
        criteriaRepository.deleteAll(removable);

        Set<String> keptNames = kept.stream()
                .map(c -> c.getName().trim().toLowerCase())
                .collect(Collectors.toSet());
        int nextOrder = kept.stream()
                .map(ScoringCriteria::getOrderNumber)
                .filter(java.util.Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(0) + 1;

        for (ScoringCriteria item : templateItems) {
            if (keptNames.contains(item.getName().trim().toLowerCase())) {
                continue; // a scored criteria with this name already exists
            }
            criteriaRepository.save(ScoringCriteria.builder()
                    .event(event)
                    .round(round)
                    .template(template)
                    .name(item.getName())
                    .description(item.getDescription())
                    .weight(item.getWeight())
                    .maxScore(item.getMaxScore())
                    .orderNumber(nextOrder++)
                    .build());
        }

        return getCriteriaByRound(roundId);
    }

    // ── Coordinator: save a round's criteria as a new template ────────

    @Transactional
    public ScoringCriteriaTemplateResponse createTemplateFromRound(Integer eventId, Integer roundId,
                                                                   CreateTemplateRequest request) {
        roundRepository.findByIdAndEventId(roundId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Round not found: " + roundId));

        List<ScoringCriteria> roundCriteria = criteriaRepository.findAllByRound_RoundIdOrderByOrderNumber(roundId);
        if (roundCriteria.isEmpty()) {
            throw new BadRequestException("This round has no criteria to save as a template.");
        }

        ScoringCriteriaTemplate template = templateRepository.save(ScoringCriteriaTemplate.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .isDefault(false)
                .build());

        for (ScoringCriteria c : roundCriteria) {
            criteriaRepository.save(ScoringCriteria.builder()
                    .template(template) // template-only item: no event / round
                    .name(c.getName())
                    .description(c.getDescription())
                    .weight(c.getWeight())
                    .maxScore(c.getMaxScore())
                    .orderNumber(c.getOrderNumber())
                    .build());
        }

        return mapTemplateToResponse(template);
    }

    // ── Judge: submit scores (batch) ──────────────────────────────────

    @Transactional
    public List<ScoreResponse> submitScores(Integer judgeId, SubmitScoresRequest request) {
        validateSubmitScoresRequest(request);

        User judge = userRepository.findById(judgeId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + judgeId));

        Submission submission = findSubmissionAssignedToJudge(judgeId, request.getSubmissionId());
        boolean isDraft = request.isDraft();

        List<Score> saved = request.getScores().stream().map(entry -> {
            if (entry == null || entry.getCriteriaId() == null || entry.getValue() == null) {
                throw new BadRequestException("Each score entry must include criteriaId and value.");
            }

            ScoringCriteria criteria = criteriaRepository.findById(entry.getCriteriaId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Criteria not found: " + entry.getCriteriaId()));

            if (criteria.getRound() == null || !Objects.equals(
                    criteria.getRound().getRoundId(), submission.getRound().getRoundId())) {
                throw new BadRequestException("Criteria does not belong to this submission's round.");
            }

            if (entry.getValue().compareTo(BigDecimal.ZERO) < 0) {
                throw new BadRequestException("Score must be greater than or equal to 0.");
            }

            if (entry.getValue().compareTo(criteria.getMaxScore()) > 0) {
                throw new BadRequestException("Score " + entry.getValue()
                        + " exceeds max score " + criteria.getMaxScore()
                        + " for criteria: " + criteria.getName());
            }

            Score score = scoreRepository
                    .findBySubmission_SubmissionIdAndJudge_UserIdAndCriteria_CriteriaId(
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

    @Transactional(readOnly = true)
    public List<ScoreResponse> getScoresBySubmission(Integer requesterId, Set<String> authorities, Integer submissionId) {
        if (hasAuthority(authorities, ROLE_EVENT_COORDINATOR)) {
            submissionRepository.findById(submissionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));
        } else if (hasAuthority(authorities, ROLE_JUDGE)) {
            findSubmissionAssignedToJudge(requesterId, submissionId);
        } else {
            throw new ForbiddenException("You do not have permission to view scores for this submission.");
        }

        return scoreRepository.findAllBySubmission_SubmissionId(submissionId).stream()
                .map(this::mapScoreToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ScoreResponse> getMyScoresByRound(Integer judgeId, Integer roundId) {
        return scoreRepository.findAllByJudge_UserIdAndSubmission_Round_RoundId(judgeId, roundId).stream()
                .map(this::mapScoreToResponse)
                .collect(Collectors.toList());
    }

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

    private ScoringCriteriaTemplateResponse mapTemplateToResponse(ScoringCriteriaTemplate t) {
        List<ScoringCriteriaResponse> items = criteriaRepository
                .findAllByTemplate_TemplateIdAndEventIsNullAndRoundIsNullOrderByOrderNumber(t.getTemplateId())
                .stream()
                .map(this::mapCriteriaToResponse)
                .collect(Collectors.toList());
        return ScoringCriteriaTemplateResponse.builder()
                .templateId(t.getTemplateId())
                .name(t.getName())
                .description(t.getDescription())
                .isDefault(t.getIsDefault())
                .items(items)
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

    private Submission findSubmissionAssignedToJudge(Integer judgeId, Integer submissionId) {
        return submissionRepository.findBySubmissionIdAndJudgeId(submissionId, judgeId)
                .orElseThrow(() -> new ResourceNotFoundException(SUBMISSION_NOT_ASSIGNED_MESSAGE));
    }

    private void validateSubmitScoresRequest(SubmitScoresRequest request) {
        if (request == null) {
            throw new BadRequestException("Scores request is required.");
        }
        if (request.getSubmissionId() == null) {
            throw new BadRequestException("submissionId is required.");
        }
        if (request.getScores() == null || request.getScores().isEmpty()) {
            throw new BadRequestException("At least one score entry is required.");
        }
    }

    private boolean hasAuthority(Set<String> authorities, String authority) {
        return authorities != null && authorities.contains(authority);
    }
}

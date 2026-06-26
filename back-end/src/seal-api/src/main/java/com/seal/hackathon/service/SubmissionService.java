package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.SubmitRequest;
import com.seal.hackathon.dto.response.SubmissionResponse;
import com.seal.hackathon.entity.*;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ForbiddenException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final RoundRepository roundRepository;
    private final RoundResultRepository resultRepository;
    private final UserRepository userRepository;

    // ── Participant: submit or update submission ──────────────────────

    @Transactional
    public SubmissionResponse submit(Integer userId, SubmitRequest request) {
        User submitter = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        Round round = roundRepository.findById(request.getRoundId())
                .orElseThrow(() -> new ResourceNotFoundException("Round not found: " + request.getRoundId()));

        if (!"ACTIVE".equalsIgnoreCase(round.getStatus())) {
            throw new BadRequestException("Submissions are only accepted for ACTIVE rounds.");
        }

        // Find the user's team in this event
        List<TeamMember> memberships = teamMemberRepository
                .findByUser_UserIdAndTeam_Event_StatusIn(userId,
                        List.of("OPEN", "IN_PROGRESS"));
        TeamMember membership = memberships.stream()
                .filter(m -> m.getTeam().getEvent().getEventId()
                        .equals(round.getEvent().getEventId()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException(
                        "You are not a member of any approved team in this event."));

        Team team = membership.getTeam();
        if (!"APPROVED".equalsIgnoreCase(team.getStatus())) {
            throw new BadRequestException("Your team must be approved before submitting.");
        }

        // Advancement gate: a team eliminated in the preceding round (outside its
        // track's Top N) cannot submit to this one. Only enforced once the previous
        // round is FINALIZED and has a cut-off; no cut-off (null) means no elimination.
        roundRepository.findAllByEvent_EventIdOrderByOrderNumber(round.getEvent().getEventId()).stream()
                .filter(r -> r.getOrderNumber() < round.getOrderNumber())
                .max(Comparator.comparingInt(Round::getOrderNumber))
                .ifPresent(prev -> {
                    Integer cutoff = prev.getTopNAdvance();
                    if ("FINALIZED".equalsIgnoreCase(prev.getStatus()) && cutoff != null) {
                        boolean advanced = resultRepository
                                .findByTeam_TeamIdAndRound_RoundId(team.getTeamId(), prev.getRoundId())
                                .map(rr -> rr.getRankPosition() <= cutoff)
                                .orElse(false);
                        if (!advanced) {
                            throw new BadRequestException("Your team did not advance from \""
                                    + prev.getName() + "\" and cannot submit to this round.");
                        }
                    }
                });

        LocalDateTime now = LocalDateTime.now();
        String status = now.isAfter(round.getSubmissionDeadline()) ? "LATE" : "SUBMITTED";

        Submission submission = submissionRepository
                .findByTeam_TeamIdAndRound_RoundId(team.getTeamId(), round.getRoundId())
                .orElse(null);

        if (submission == null) {
            submission = Submission.builder()
                    .team(team)
                    .round(round)
                    .submittedBy(submitter)
                    .build();
        }
        submission.setRepoUrl(request.getRepoUrl());
        submission.setDemoUrl(request.getDemoUrl());
        submission.setSlideUrl(request.getSlideUrl());
        submission.setDescription(request.getDescription());
        submission.setSubmittedAt(now);
        submission.setStatus(status);
        submission.setSubmittedBy(submitter);

        submission = submissionRepository.save(submission);
        return mapToResponse(submission);
    }

    // ── Participant: get my team's submission for a round ─────────────

    @Transactional(readOnly = true)
    public SubmissionResponse getMySubmission(Integer userId, Integer roundId) {
        Round round = roundRepository.findById(roundId)
                .orElseThrow(() -> new ResourceNotFoundException("Round not found: " + roundId));

        List<TeamMember> memberships = teamMemberRepository
                .findByUser_UserIdAndTeam_Event_StatusIn(userId,
                        List.of("OPEN", "IN_PROGRESS"));
        TeamMember membership = memberships.stream()
                .filter(m -> m.getTeam().getEvent().getEventId()
                        .equals(round.getEvent().getEventId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "You are not part of any team in this event."));

        Submission submission = submissionRepository
                .findByTeam_TeamIdAndRound_RoundId(membership.getTeam().getTeamId(), roundId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No submission found for your team in round " + roundId));

        return mapToResponse(submission);
    }

    // ── Judge/Coordinator: list all submissions for a round ───────────

    @Transactional(readOnly = true)
    public List<SubmissionResponse> getSubmissionsByRound(Integer roundId) {
        roundRepository.findById(roundId)
                .orElseThrow(() -> new ResourceNotFoundException("Round not found: " + roundId));
        return submissionRepository.findAllByRound_RoundId(roundId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ── Get single submission by ID ───────────────────────────────────

    @Transactional(readOnly = true)
    public SubmissionResponse getSubmissionById(Integer submissionId) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));
        return mapToResponse(submission);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private SubmissionResponse mapToResponse(Submission s) {
        return SubmissionResponse.builder()
                .submissionId(s.getSubmissionId())
                .teamId(s.getTeam().getTeamId())
                .teamName(s.getTeam().getName())
                .roundId(s.getRound().getRoundId())
                .roundName(s.getRound().getName())
                .repoUrl(s.getRepoUrl())
                .demoUrl(s.getDemoUrl())
                .slideUrl(s.getSlideUrl())
                .description(s.getDescription())
                .submittedAt(s.getSubmittedAt())
                .submittedById(s.getSubmittedBy().getUserId())
                .submittedByName(s.getSubmittedBy().getFullName())
                .status(s.getStatus())
                .build();
    }
}

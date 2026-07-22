package com.seal.hackathon.service;

import com.seal.hackathon.dto.response.RoundResultResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.Round;
import com.seal.hackathon.entity.RoundResult;
import com.seal.hackathon.entity.Submission;
import com.seal.hackathon.entity.Team;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.repository.HackathonEventRepository;
import com.seal.hackathon.repository.RoundRepository;
import com.seal.hackathon.repository.RoundResultRepository;
import com.seal.hackathon.repository.ScoreRepository;
import com.seal.hackathon.repository.ScoringCriteriaRepository;
import com.seal.hackathon.repository.SubmissionRepository;
import com.seal.hackathon.repository.TeamEventEntryRepository;
import com.seal.hackathon.repository.TeamMemberRepository;
import com.seal.hackathon.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoundResultServiceTest {

    @Mock
    private RoundResultRepository resultRepository;

    @Mock
    private RoundRepository roundRepository;

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private ScoreRepository scoreRepository;

    @Mock
    private ScoringCriteriaRepository criteriaRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private HackathonEventRepository eventRepository;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @Mock
    private TeamEventEntryRepository teamEventEntryRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private JudgeScoringCompletenessService completenessService;

    @InjectMocks
    private RoundResultService roundResultService;

    @Test
    void finalizeRound_shouldCalculateDraftRankingWithoutFinalizingRound() {
        HackathonEvent event = event(1);
        Round round = round(10, event, "ACTIVE");
        User coordinator = user(7, "Coordinator");
        Team team = team(20, "Seal Team");
        Submission submission = submission(30, team, round, coordinator);

        when(roundRepository.findByIdAndEventId(round.getRoundId(), event.getEventId()))
                .thenReturn(Optional.of(round));
        when(userRepository.findById(coordinator.getUserId())).thenReturn(Optional.of(coordinator));
        when(submissionRepository.findAllByRound_RoundId(round.getRoundId())).thenReturn(List.of(submission));
        when(resultRepository.findAllByRound_RoundIdOrderByRankPosition(round.getRoundId())).thenReturn(List.of());
        when(scoreRepository.findAllBySubmission_SubmissionId(submission.getSubmissionId())).thenReturn(List.of());
        when(resultRepository.save(any(RoundResult.class))).thenAnswer(inv -> {
            RoundResult result = inv.getArgument(0);
            result.setResultId(100);
            return result;
        });
        when(teamEventEntryRepository.findByTeam_TeamIdAndEvent_EventId(team.getTeamId(), event.getEventId()))
                .thenReturn(Optional.empty());

        List<RoundResultResponse> response = roundResultService.finalizeRound(
                event.getEventId(), round.getRoundId(), coordinator.getUserId());

        assertEquals("ACTIVE", round.getStatus());
        assertEquals(1, response.size());
        assertFalse(response.get(0).getIsPublished());
        verify(roundRepository, never()).save(any(Round.class));
    }

    @Test
    void publishResults_shouldPublishResultsAndFinalizeRound() {
        HackathonEvent event = event(1);
        Round round = round(10, event, "ACTIVE");
        Team team = team(20, "Seal Team");
        RoundResult result = RoundResult.builder()
                .resultId(100)
                .team(team)
                .round(round)
                .totalScore(BigDecimal.valueOf(88))
                .rankPosition(1)
                .isPublished(false)
                .build();

        when(roundRepository.findByIdAndEventId(round.getRoundId(), event.getEventId()))
                .thenReturn(Optional.of(round));
        when(resultRepository.findAllByRound_RoundIdOrderByRankPosition(round.getRoundId()))
                .thenReturn(List.of(result));
        when(teamMemberRepository.findByTeam_TeamId(team.getTeamId())).thenReturn(List.of());
        when(teamEventEntryRepository.findByTeam_TeamIdAndEvent_EventId(team.getTeamId(), event.getEventId()))
                .thenReturn(Optional.empty());

        List<RoundResultResponse> response = roundResultService.publishResults(event.getEventId(), round.getRoundId());

        assertEquals("FINALIZED", round.getStatus());
        assertTrue(result.getIsPublished());
        assertEquals(1, response.size());
        assertTrue(response.get(0).getIsPublished());
        verify(roundRepository).save(round);
    }

    private HackathonEvent event(Integer eventId) {
        return HackathonEvent.builder()
                .eventId(eventId)
                .name("SEAL Hackathon")
                .build();
    }

    private Round round(Integer roundId, HackathonEvent event, String status) {
        return Round.builder()
                .roundId(roundId)
                .event(event)
                .name("Round " + roundId)
                .orderNumber(1)
                .isFinal(false)
                .status(status)
                .build();
    }

    private Team team(Integer teamId, String name) {
        return Team.builder()
                .teamId(teamId)
                .name(name)
                .build();
    }

    private User user(Integer userId, String fullName) {
        return User.builder()
                .userId(userId)
                .fullName(fullName)
                .build();
    }

    private Submission submission(Integer submissionId, Team team, Round round, User submittedBy) {
        return Submission.builder()
                .submissionId(submissionId)
                .team(team)
                .round(round)
                .submittedBy(submittedBy)
                .submittedAt(LocalDateTime.of(2026, 7, 21, 10, 0))
                .build();
    }
}

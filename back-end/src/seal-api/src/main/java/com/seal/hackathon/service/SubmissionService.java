package com.seal.hackathon.service;

import com.seal.hackathon.dto.response.SubmissionListResponse;
import com.seal.hackathon.dto.response.SubmissionSummaryResponse;
import com.seal.hackathon.dto.response.TeamSubmissionsResponse;
import com.seal.hackathon.entity.Round;
import com.seal.hackathon.entity.Submission;
import com.seal.hackathon.entity.Team;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ForbiddenException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.RoundRepository;
import com.seal.hackathon.repository.SubmissionRepository;
import com.seal.hackathon.repository.TeamMemberRepository;
import com.seal.hackathon.repository.TeamRepository;
import com.seal.hackathon.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final RoundRepository roundRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;

    @Transactional(readOnly = true)
    public SubmissionListResponse getSubmissionsByRoundId(Integer roundId) {
        if (roundId == null) {
            throw new BadRequestException("Round ID is required.");
        }
        if (roundId <= 0) {
            throw new BadRequestException("Round ID must be positive.");
        }

        Round round = roundRepository.findByIdWithEvent(roundId)
                .orElseThrow(() -> new ResourceNotFoundException("Round not found with id: " + roundId));

        List<Submission> submissions = submissionRepository.findByRoundIdOrderBySubmittedAtDesc(roundId);

        if (submissions.isEmpty()) {
            return SubmissionListResponse.builder()
                    .eventId(round.getEvent().getEventId())
                    .eventName(round.getEvent().getName())
                    .roundId(round.getRoundId())
                    .roundName(round.getName())
                    .total(0)
                    .submissions(new ArrayList<>())
                    .build();
        }

        Set<Integer> teamIds = submissions.stream()
                .map(Submission::getTeamId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Integer, Team> teamMap = teamRepository.findAllById(teamIds).stream()
                .collect(Collectors.toMap(Team::getTeamId, team -> team));

        Set<Integer> userIds = submissions.stream()
                .map(Submission::getSubmittedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Integer, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getUserId, user -> user));

        List<SubmissionSummaryResponse> submissionResponses = submissions.stream().map(submission -> {
            Team team = teamMap.get(submission.getTeamId());
            if (team == null) {
                throw new ResourceNotFoundException("Team not found with id: " + submission.getTeamId());
            }

            User user = null;
            if (submission.getSubmittedBy() != null) {
                user = userMap.get(submission.getSubmittedBy());
            }

            return SubmissionSummaryResponse.builder()
                    .submissionId(submission.getSubmissionId())
                    .teamId(submission.getTeamId())
                    .teamName(team.getName())
                    .trackId(team.getTrack() != null ? team.getTrack().getTrackId() : null)
                    .trackName(team.getTrack() != null ? team.getTrack().getName() : null)
                    .roundId(round.getRoundId())
                    .roundName(round.getName())
                    .repoUrl(submission.getRepoUrl())
                    .demoUrl(submission.getDemoUrl())
                    .slideUrl(submission.getSlideUrl())
                    .description(submission.getDescription())
                    .submittedAt(submission.getSubmittedAt())
                    .submittedBy(submission.getSubmittedBy())
                    .submittedByName(user != null ? user.getFullName() : null)
                    .status(submission.getStatus())
                    .build();
        }).collect(Collectors.toList());

        return SubmissionListResponse.builder()
                .eventId(round.getEvent().getEventId())
                .eventName(round.getEvent().getName())
                .roundId(round.getRoundId())
                .roundName(round.getName())
                .total(submissions.size())
                .submissions(submissionResponses)
                .build();
    }

    @Transactional(readOnly = true)
    public TeamSubmissionsResponse getTeamSubmissions(Integer teamId, Integer userId, Collection<? extends GrantedAuthority> authorities) {
        if (teamId == null) {
            throw new BadRequestException("Team ID is required.");
        }
        if (teamId <= 0) {
            throw new BadRequestException("Team ID must be positive.");
        }

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));

        boolean isCoordinator = authorities.stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_EVENT_COORDINATOR"));

        if (!isCoordinator) {
            boolean isMember = teamMemberRepository.existsByTeam_TeamIdAndUser_UserId(teamId, userId);
            if (!isMember) {
                throw new ForbiddenException("You are not a member of this team.");
            }
        }

        List<Submission> submissions = submissionRepository.findByTeamId(teamId);

        if (submissions.isEmpty()) {
            return TeamSubmissionsResponse.builder()
                    .teamId(team.getTeamId())
                    .teamName(team.getName())
                    .total(0)
                    .submissions(new ArrayList<>())
                    .build();
        }

        Set<Integer> roundIds = submissions.stream()
                .map(Submission::getRoundId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Integer, Round> roundMap = roundRepository.findAllById(roundIds).stream()
                .collect(Collectors.toMap(Round::getRoundId, r -> r));

        Set<Integer> userIds = submissions.stream()
                .map(Submission::getSubmittedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Integer, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getUserId, u -> u));

        List<SubmissionSummaryResponse> submissionResponses = submissions.stream().map(submission -> {
            Round round = roundMap.get(submission.getRoundId());
            if (round == null) {
                throw new ResourceNotFoundException("Round not found with id: " + submission.getRoundId());
            }

            User user = null;
            if (submission.getSubmittedBy() != null) {
                user = userMap.get(submission.getSubmittedBy());
            }

            return SubmissionSummaryResponse.builder()
                    .submissionId(submission.getSubmissionId())
                    .teamId(team.getTeamId())
                    .teamName(team.getName())
                    .trackId(team.getTrack() != null ? team.getTrack().getTrackId() : null)
                    .trackName(team.getTrack() != null ? team.getTrack().getName() : null)
                    .roundId(round.getRoundId())
                    .roundName(round.getName())
                    .repoUrl(submission.getRepoUrl())
                    .demoUrl(submission.getDemoUrl())
                    .slideUrl(submission.getSlideUrl())
                    .description(submission.getDescription())
                    .submittedAt(submission.getSubmittedAt())
                    .submittedBy(submission.getSubmittedBy())
                    .submittedByName(user != null ? user.getFullName() : null)
                    .status(submission.getStatus())
                    .build();
        }).collect(Collectors.toList());

        return TeamSubmissionsResponse.builder()
                .teamId(team.getTeamId())
                .teamName(team.getName())
                .total(submissions.size())
                .submissions(submissionResponses)
                .build();
    }
}

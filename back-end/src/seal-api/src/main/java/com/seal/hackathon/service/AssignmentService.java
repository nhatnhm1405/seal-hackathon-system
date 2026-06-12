package com.seal.hackathon.service;

import com.seal.hackathon.dto.response.JudgeAssignmentResponse;
import com.seal.hackathon.dto.response.MentorAssignmentResponse;
import com.seal.hackathon.entity.JudgeAssignment;
import com.seal.hackathon.entity.MentorAssignment;
import com.seal.hackathon.entity.Round;
import com.seal.hackathon.entity.Team;
import com.seal.hackathon.entity.TeamMember;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.JudgeAssignmentRepository;
import com.seal.hackathon.repository.MentorAssignmentRepository;
import com.seal.hackathon.repository.TeamMemberRepository;
import com.seal.hackathon.repository.TeamRepository;
import com.seal.hackathon.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service xử lý việc hiển thị phân công cho Mentor và Judge.
 *
 * Theo schema mới:
 * - MentorAssignment: mentor được gán theo TRACK (cả event) → các team thuộc track đó.
 * - JudgeAssignment: judge được gán theo ROUND + TRACK.
 *   Round thường (is_final = FALSE): chấm các team trong track được gán.
 *   Round Final (is_final = TRUE, track = NULL): chấm tất cả team của event.
 */
@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final MentorAssignmentRepository mentorAssignmentRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    /**
     * Lấy danh sách các team thuộc track được phân công cho Mentor (is_active = true)
     */
    @Transactional(readOnly = true)
    public MentorAssignmentResponse getMentorAssignments(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        List<MentorAssignment> assignments = mentorAssignmentRepository.findActiveByMentor(userId);

        String eventName = assignments.isEmpty() ? "N/A"
                : assignments.get(0).getTrack().getEvent().getName();

        List<MentorAssignmentResponse.AssignedTeamInfo> teamInfos = assignments.stream()
                .flatMap(ma -> teamRepository
                        .findAllByTrack_TrackIdAndStatus(ma.getTrack().getTrackId(), "APPROVED").stream()
                        .map(team -> MentorAssignmentResponse.AssignedTeamInfo.builder()
                                .teamId(team.getTeamId())
                                .teamName(team.getName())
                                .trackName(ma.getTrack().getName())
                                .assignedAt(ma.getAssignedAt())
                                .members(mapMentorMembers(team))
                                .build()))
                .collect(Collectors.toList());

        return MentorAssignmentResponse.builder()
                .mentorId(user.getUserId())
                .mentorName(user.getFullName())
                .eventName(eventName)
                .teams(teamInfos)
                .build();
    }

    /**
     * Lấy danh sách các team được phân công cho Judge chấm điểm (is_active = true).
     * Track NULL (vòng Final) → toàn bộ team của event; ngược lại → team trong track.
     */
    @Transactional(readOnly = true)
    public JudgeAssignmentResponse getJudgeAssignments(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        List<JudgeAssignment> assignments = judgeAssignmentRepository.findActiveByJudge(userId);

        String eventName = assignments.isEmpty() ? "N/A"
                : assignments.get(0).getRound().getEvent().getName();

        List<JudgeAssignmentResponse.AssignedTeamInfo> teamInfos = assignments.stream()
                .flatMap(ja -> {
                    Round round = ja.getRound();
                    List<Team> teams = ja.getTrack() != null
                            ? teamRepository.findAllByTrack_TrackIdAndStatus(ja.getTrack().getTrackId(), "APPROVED")
                            : teamRepository.findAllByEvent_EventIdAndStatus(round.getEvent().getEventId(), "APPROVED");
                    return teams.stream()
                            .map(team -> JudgeAssignmentResponse.AssignedTeamInfo.builder()
                                    .teamId(team.getTeamId())
                                    .teamName(team.getName())
                                    .trackName(team.getTrack().getName())
                                    .roundId(round.getRoundId())
                                    .assignedAt(ja.getAssignedAt())
                                    .members(mapJudgeMembers(team))
                                    .build());
                })
                .collect(Collectors.toList());

        return JudgeAssignmentResponse.builder()
                .judgeId(user.getUserId())
                .judgeName(user.getFullName())
                .eventName(eventName)
                .teams(teamInfos)
                .build();
    }

    private List<MentorAssignmentResponse.TeamMemberInfo> mapMentorMembers(Team team) {
        List<TeamMember> members = teamMemberRepository.findByTeam_TeamId(team.getTeamId());
        return members.stream()
                .map(m -> MentorAssignmentResponse.TeamMemberInfo.builder()
                        .userId(m.getUser().getUserId())
                        .fullName(m.getUser().getFullName())
                        .email(m.getUser().getEmail())
                        .memberRole(m.getMemberRole())
                        .build())
                .collect(Collectors.toList());
    }

    private List<JudgeAssignmentResponse.TeamMemberInfo> mapJudgeMembers(Team team) {
        List<TeamMember> members = teamMemberRepository.findByTeam_TeamId(team.getTeamId());
        return members.stream()
                .map(m -> JudgeAssignmentResponse.TeamMemberInfo.builder()
                        .userId(m.getUser().getUserId())
                        .fullName(m.getUser().getFullName())
                        .email(m.getUser().getEmail())
                        .memberRole(m.getMemberRole())
                        .build())
                .collect(Collectors.toList());
    }
}

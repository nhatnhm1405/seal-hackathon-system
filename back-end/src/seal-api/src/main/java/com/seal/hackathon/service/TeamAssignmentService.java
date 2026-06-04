package com.seal.hackathon.service;

import com.seal.hackathon.dto.response.JudgeAssignmentResponse;
import com.seal.hackathon.dto.response.MentorAssignmentResponse;
import com.seal.hackathon.entity.Team;
import com.seal.hackathon.entity.TeamAssignment;
import com.seal.hackathon.entity.TeamMember;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.TeamAssignmentRepository;
import com.seal.hackathon.repository.TeamMemberRepository;
import com.seal.hackathon.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service xử lý việc hiển thị phân công cho Mentor và Judge.
 */
@Service
@RequiredArgsConstructor
public class TeamAssignmentService {

    private final TeamAssignmentRepository teamAssignmentRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    /**
     * Lấy danh sách các team được phân công cho Mentor (is_active = true)
     */
    @Transactional(readOnly = true)
    public MentorAssignmentResponse getMentorAssignments(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        List<TeamAssignment> assignments = teamAssignmentRepository
                .findActiveAssignmentsByUserAndType(userId, "MENTOR");

        String eventName = assignments.isEmpty() ? "N/A" : assignments.get(0).getTeam().getEvent().getName();

        List<MentorAssignmentResponse.AssignedTeamInfo> teamInfos = assignments.stream()
                .map(ta -> {
                    Team team = ta.getTeam();
                    List<TeamMember> members = teamMemberRepository.findByTeam_TeamId(team.getTeamId());

                    List<MentorAssignmentResponse.TeamMemberInfo> memberInfos = members.stream()
                            .map(m -> MentorAssignmentResponse.TeamMemberInfo.builder()
                                    .userId(m.getUser().getUserId())
                                    .fullName(m.getUser().getFullName())
                                    .email(m.getUser().getEmail())
                                    .memberRole(m.getMemberRole())
                                    .build())
                            .collect(Collectors.toList());

                    return MentorAssignmentResponse.AssignedTeamInfo.builder()
                            .teamId(team.getTeamId())
                            .teamName(team.getName())
                            .trackName(team.getTrack().getName())
                            .assignedAt(ta.getAssignedAt())
                            .members(memberInfos)
                            .build();
                })
                .collect(Collectors.toList());

        return MentorAssignmentResponse.builder()
                .mentorId(user.getUserId())
                .mentorName(user.getFullName())
                .eventName(eventName)
                .teams(teamInfos)
                .build();
    }

    /**
     * Lấy danh sách các team được phân công cho Judge (is_active = true)
     */
    @Transactional(readOnly = true)
    public JudgeAssignmentResponse getJudgeAssignments(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        List<TeamAssignment> assignments = teamAssignmentRepository
                .findActiveAssignmentsByUserAndType(userId, "JUDGE");

        String eventName = assignments.isEmpty() ? "N/A" : assignments.get(0).getTeam().getEvent().getName();

        List<JudgeAssignmentResponse.AssignedTeamInfo> teamInfos = assignments.stream()
                .map(ta -> {
                    Team team = ta.getTeam();
                    List<TeamMember> members = teamMemberRepository.findByTeam_TeamId(team.getTeamId());

                    List<JudgeAssignmentResponse.TeamMemberInfo> memberInfos = members.stream()
                            .map(m -> JudgeAssignmentResponse.TeamMemberInfo.builder()
                                    .userId(m.getUser().getUserId())
                                    .fullName(m.getUser().getFullName())
                                    .email(m.getUser().getEmail())
                                    .memberRole(m.getMemberRole())
                                    .build())
                            .collect(Collectors.toList());

                    return JudgeAssignmentResponse.AssignedTeamInfo.builder()
                            .teamId(team.getTeamId())
                            .teamName(team.getName())
                            .trackName(team.getTrack().getName())
                            .roundId(ta.getRoundId())
                            .assignedAt(ta.getAssignedAt())
                            .members(memberInfos)
                            .build();
                })
                .collect(Collectors.toList());

        return JudgeAssignmentResponse.builder()
                .judgeId(user.getUserId())
                .judgeName(user.getFullName())
                .eventName(eventName)
                .teams(teamInfos)
                .build();
    }
}

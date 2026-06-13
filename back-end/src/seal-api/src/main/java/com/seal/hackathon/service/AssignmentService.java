package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.AssignJudgeRequest;
import com.seal.hackathon.dto.request.AssignMentorRequest;
import com.seal.hackathon.dto.response.JudgeAssignmentResponse;
import com.seal.hackathon.dto.response.MentorAssignmentResponse;
import com.seal.hackathon.entity.JudgeAssignment;
import com.seal.hackathon.entity.MentorAssignment;
import com.seal.hackathon.entity.Role;
import com.seal.hackathon.entity.Round;
import com.seal.hackathon.entity.Team;
import com.seal.hackathon.entity.TeamMember;
import com.seal.hackathon.entity.Track;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.entity.UserEventRole;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.JudgeAssignmentRepository;
import com.seal.hackathon.repository.MentorAssignmentRepository;
import com.seal.hackathon.repository.RoleRepository;
import com.seal.hackathon.repository.RoundRepository;
import com.seal.hackathon.repository.TeamMemberRepository;
import com.seal.hackathon.repository.TeamRepository;
import com.seal.hackathon.repository.TrackRepository;
import com.seal.hackathon.repository.UserEventRoleRepository;
import com.seal.hackathon.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
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

    private static final Set<String> JUDGE_TYPES = Set.of("INTERNAL", "GUEST");

    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final MentorAssignmentRepository mentorAssignmentRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final RoundRepository roundRepository;
    private final TrackRepository trackRepository;
    private final RoleRepository roleRepository;
    private final UserEventRoleRepository userEventRoleRepository;

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

    // ── Coordinator: create assignments ───────────────────────────────

    /**
     * Coordinator assigns a mentor to a track (whole event). Also ensures the
     * mentor holds the MENTOR role for that track's event so they gain access.
     */
    @Transactional
    public MentorAssignmentResponse assignMentor(AssignMentorRequest request) {
        User mentor = userRepository.findByIdWithRoles(request.getMentorUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getMentorUserId()));
        Track track = trackRepository.findById(request.getTrackId())
                .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + request.getTrackId()));

        if (mentorAssignmentRepository.existsByMentor_UserIdAndTrack_TrackId(mentor.getUserId(), track.getTrackId())) {
            throw new BadRequestException("This mentor is already assigned to this track.");
        }

        ensureRole(mentor, "MENTOR", track.getEvent().getEventId());

        mentorAssignmentRepository.save(MentorAssignment.builder()
                .mentor(mentor)
                .track(track)
                .build());

        return getMentorAssignments(mentor.getUserId());
    }

    /**
     * Coordinator assigns a judge to a round (+ track for preliminary rounds).
     * Enforces the is_final rule, defaults judge_type to INTERNAL when unset,
     * and ensures the judge holds the JUDGE role for that round's event.
     */
    @Transactional
    public JudgeAssignmentResponse assignJudge(AssignJudgeRequest request) {
        User judge = userRepository.findByIdWithRoles(request.getJudgeUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getJudgeUserId()));
        Round round = roundRepository.findById(request.getRoundId())
                .orElseThrow(() -> new ResourceNotFoundException("Round not found: " + request.getRoundId()));

        // is_final rule: preliminary rounds are judged per track; the final round across all tracks.
        Track track = null;
        if (Boolean.TRUE.equals(round.getIsFinal())) {
            if (request.getTrackId() != null) {
                throw new BadRequestException("trackId must be null for the final round — judges score all teams.");
            }
        } else {
            if (request.getTrackId() == null) {
                throw new BadRequestException("trackId is required when assigning a judge to a non-final round.");
            }
            track = trackRepository.findById(request.getTrackId())
                    .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + request.getTrackId()));
            if (!track.getEvent().getEventId().equals(round.getEvent().getEventId())) {
                throw new BadRequestException("Track " + track.getTrackId()
                        + " does not belong to the same event as round " + round.getRoundId() + ".");
            }
        }

        boolean duplicate = (track == null)
                ? judgeAssignmentRepository.existsByJudge_UserIdAndRound_RoundIdAndTrackIsNull(judge.getUserId(), round.getRoundId())
                : judgeAssignmentRepository.existsByJudge_UserIdAndRound_RoundIdAndTrack_TrackId(judge.getUserId(), round.getRoundId(), track.getTrackId());
        if (duplicate) {
            throw new BadRequestException("This judge is already assigned to this round/track.");
        }

        // judge_type lives on the user; default internal judges to INTERNAL so every
        // assigned judge has a type (guest judges are created with GUEST by the admin).
        if (judge.getJudgeType() == null || !JUDGE_TYPES.contains(judge.getJudgeType().toUpperCase())) {
            judge.setJudgeType("INTERNAL");
            userRepository.save(judge);
        }

        ensureRole(judge, "JUDGE", round.getEvent().getEventId());

        judgeAssignmentRepository.save(JudgeAssignment.builder()
                .judge(judge)
                .round(round)
                .track(track)
                .build());

        return getJudgeAssignments(judge.getUserId());
    }

    /**
     * Grants {@code roleName} scoped to {@code eventId} if the user does not
     * already hold it, so a work assignment also confers the matching access role.
     */
    private void ensureRole(User user, String roleName, Integer eventId) {
        boolean has = userEventRoleRepository
                .existsByUser_UserIdAndRole_RoleNameAndEventId(user.getUserId(), roleName, eventId);
        if (has) {
            return;
        }
        Role role = roleRepository.findByRoleName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));
        userEventRoleRepository.save(UserEventRole.builder()
                .user(user)
                .role(role)
                .eventId(eventId)
                .build());
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

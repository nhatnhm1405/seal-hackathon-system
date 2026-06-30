package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.AssignJudgeRequest;
import com.seal.hackathon.dto.request.AssignMentorRequest;
import com.seal.hackathon.dto.request.CreateGuestJudgeRequest;
import com.seal.hackathon.dto.response.JudgeAssignmentResponse;
import com.seal.hackathon.dto.response.JudgeRosterItemResponse;
import com.seal.hackathon.dto.response.MentorAssignmentResponse;
import com.seal.hackathon.dto.response.MentorHistoryResponse;
import com.seal.hackathon.dto.response.MentorRosterItemResponse;
import com.seal.hackathon.dto.response.UserResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.JudgeAssignment;
import com.seal.hackathon.entity.MentorAssignment;
import com.seal.hackathon.entity.Role;
import com.seal.hackathon.entity.Round;
import com.seal.hackathon.entity.Submission;
import com.seal.hackathon.entity.Team;
import com.seal.hackathon.entity.TeamMember;
import com.seal.hackathon.entity.Track;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.entity.UserEventRole;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.dto.response.MentorHistoryResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.repository.JudgeAssignmentRepository;
import com.seal.hackathon.repository.MentorAssignmentRepository;
import com.seal.hackathon.repository.PrizeRepository;
import com.seal.hackathon.repository.RoleRepository;
import com.seal.hackathon.repository.RoundRepository;
import com.seal.hackathon.repository.RoundResultRepository;
import com.seal.hackathon.repository.SubmissionRepository;
import com.seal.hackathon.repository.TeamMemberRepository;
import com.seal.hackathon.repository.TeamRepository;
import com.seal.hackathon.repository.TrackRepository;
import com.seal.hackathon.repository.UserEventRoleRepository;
import com.seal.hackathon.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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
    private final SubmissionRepository submissionRepository;
    private final RoundResultRepository roundResultRepository;
    private final PrizeRepository prizeRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    /**
     * Danh sách STAFF đã được duyệt + đang hoạt động, để Coordinator chọn người
     * phân công làm Judge/Mentor. Việc tạo tài khoản và cấp role là của Admin
     * (/api/admin); đây chỉ là danh sách tra cứu read-only.
     */
    @Transactional(readOnly = true)
    public List<UserResponse> listApprovedStaff() {
        return userRepository.findAll().stream()
                .filter(u -> "STAFF".equalsIgnoreCase(u.getUserType()))
                .filter(u -> Boolean.TRUE.equals(u.getIsApproved()))
                .map(u -> UserResponse.builder()
                        .userId(u.getUserId())
                        .email(u.getEmail())
                        .fullName(u.getFullName())
                        .userType(u.getUserType())
                        .judgeType(u.getJudgeType())
                        .isApproved(u.getIsApproved())
                        .isActive(u.getIsActive())
                        .build())
                .collect(Collectors.toList());
    }

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
                        .map(team -> {
                            // Submissions thực sự đã nộp (bỏ DRAFT) để biết team nộp chưa.
                            List<Submission> submitted = submissionRepository
                                    .findAllByTeam_TeamId(team.getTeamId()).stream()
                                    .filter(s -> !"DRAFT".equalsIgnoreCase(s.getStatus()))
                                    .collect(Collectors.toList());
                            LocalDateTime lastAt = submitted.stream()
                                    .map(Submission::getSubmittedAt)
                                    .filter(Objects::nonNull)
                                    .max(Comparator.naturalOrder())
                                    .orElse(null);
                            return MentorAssignmentResponse.AssignedTeamInfo.builder()
                                    .teamId(team.getTeamId())
                                    .teamName(team.getName())
                                    .trackId(ma.getTrack().getTrackId())
                                    .trackName(ma.getTrack().getName())
                                    .members(mapMentorMembers(team))
                                    .submissionCount(submitted.size())
                                    .lastSubmittedAt(lastAt)
                                    .build();
                        }))
                .collect(Collectors.toList());

        return MentorAssignmentResponse.builder()
                .mentorId(user.getUserId())
                .mentorName(user.getFullName())
                .eventName(eventName)
                .teams(teamInfos)
                .build();
    }

    /**
     * Read-only mentor history: every event the mentor was assigned to, grouped by
     * the track(s) they mentored, with each approved team's final standing and prize.
     */
    @Transactional(readOnly = true)
    public List<MentorHistoryResponse> getMentorHistory(Integer userId) {
        List<MentorAssignment> assignments = mentorAssignmentRepository.findActiveByMentor(userId);

        // Group assignments by event (preserve order), then by track within each event.
        Map<Integer, List<MentorAssignment>> byEvent = new LinkedHashMap<>();
        for (MentorAssignment ma : assignments) {
            byEvent.computeIfAbsent(ma.getTrack().getEvent().getEventId(), k -> new ArrayList<>()).add(ma);
        }

        List<MentorHistoryResponse> result = new ArrayList<>();
        for (List<MentorAssignment> eventAssignments : byEvent.values()) {
            HackathonEvent event = eventAssignments.get(0).getTrack().getEvent();

            Round finalRound = roundRepository.findFirstByEvent_EventIdAndIsFinalTrue(event.getEventId()).orElse(null);
            Map<Integer, String> prizeByTeam = prizeRepository
                    .findAllByEvent_EventIdAndAwardedAtIsNotNullOrderByRankPosition(event.getEventId()).stream()
                    .filter(prize -> prize.getTeam() != null)
                    .collect(Collectors.toMap(
                            prize -> prize.getTeam().getTeamId(),
                            prize -> prize.getName(),
                            (first, ignored) -> first));

            Map<Integer, Track> distinctTracks = new LinkedHashMap<>();
            for (MentorAssignment ma : eventAssignments) {
                distinctTracks.putIfAbsent(ma.getTrack().getTrackId(), ma.getTrack());
            }

            List<MentorHistoryResponse.TrackGroup> trackGroups = new ArrayList<>();
            for (Track track : distinctTracks.values()) {
                List<MentorHistoryResponse.TeamResult> teams = teamRepository
                        .findAllByTrack_TrackIdAndStatus(track.getTrackId(), "APPROVED").stream()
                        .map(team -> {
                            Integer finalRank = finalRound == null ? null : roundResultRepository
                                                                            .findByTeam_TeamIdAndRound_RoundId(team.getTeamId(), finalRound.getRoundId())
                                                                            .filter(resultRow -> Boolean.TRUE.equals(resultRow.getIsPublished()))
                                                                            .map(resultRow -> resultRow.getRankPosition())
                                                                            .orElse(null);

                            return MentorHistoryResponse.TeamResult.builder()
                                    .teamId(team.getTeamId())
                                    .teamName(team.getName())
                                    .teamStatus(team.getStatus())
                                    .finalRank(finalRank)
                                    .prizeName(prizeByTeam.get(team.getTeamId()))
                                    .build();
                        })
                        .collect(Collectors.toList());

                trackGroups.add(MentorHistoryResponse.TrackGroup.builder()
                        .trackId(track.getTrackId())
                        .trackName(track.getName())
                        .teams(teams)
                        .build());
            }

            result.add(MentorHistoryResponse.builder()
                    .eventId(event.getEventId())
                    .eventName(event.getName())
                    .season(event.getSeason())
                    .year(event.getYear())
                    .eventStatus(event.getStatus())
                    .tracks(trackGroups)
                    .build());
        }

        // Newest event first.
        result.sort(Comparator.comparing(MentorHistoryResponse::getYear, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(MentorHistoryResponse::getEventId, Comparator.reverseOrder()));
        return result;
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
    public MentorAssignmentResponse assignMentor(AssignMentorRequest request, Integer actorUserId) {
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

        auditLogService.record(actorUserId, "ASSIGN_MENTOR", "TRACK", track.getTrackId(), null,
                Map.of("mentor_user_id", mentor.getUserId(),
                        "event_id", track.getEvent().getEventId()));

        return getMentorAssignments(mentor.getUserId());
    }

    /**
     * Coordinator assigns a judge to a round (+ track for preliminary rounds).
     * Enforces the is_final rule, defaults judge_type to INTERNAL when unset,
     * and ensures the judge holds the JUDGE role for that round's event.
     */
    @Transactional
    public JudgeAssignmentResponse assignJudge(AssignJudgeRequest request, Integer actorUserId) {
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

        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("judge_user_id", judge.getUserId());
        meta.put("round_id", round.getRoundId());
        meta.put("event_id", round.getEvent().getEventId());
        if (track != null) {
            meta.put("track_id", track.getTrackId());
        }
        auditLogService.record(actorUserId, "ASSIGN_JUDGE", "ROUND", round.getRoundId(), null, meta);

        return getJudgeAssignments(judge.getUserId());
    }

    /**
     * Coordinator roster: all active judge assignments in an event, names resolved.
     */
    @Transactional(readOnly = true)
    public List<JudgeRosterItemResponse> listJudgeAssignmentsByEvent(Integer eventId) {
        return judgeAssignmentRepository.findActiveByEvent(eventId).stream()
                .map(ja -> JudgeRosterItemResponse.builder()
                        .id(ja.getId())
                        .judgeUserId(ja.getJudge().getUserId())
                        .judgeName(ja.getJudge().getFullName())
                        .judgeType(ja.getJudge().getJudgeType())
                        .roundId(ja.getRound().getRoundId())
                        .roundName(ja.getRound().getName())
                        .isFinal(ja.getRound().getIsFinal())
                        .trackId(ja.getTrack() != null ? ja.getTrack().getTrackId() : null)
                        .trackName(ja.getTrack() != null ? ja.getTrack().getName() : null)
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Removes a judge assignment (hard delete so the same judge can be re-assigned
     * to the round/track later — the unique key does not consider is_active).
     */
    @Transactional
    public void removeJudgeAssignment(Integer assignmentId) {
        JudgeAssignment assignment = judgeAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Judge assignment not found: " + assignmentId));
        judgeAssignmentRepository.delete(assignment);
    }

    /**
     * Coordinator roster: all active mentor assignments (mentor -> track) in an event.
     */
    @Transactional(readOnly = true)
    public List<MentorRosterItemResponse> listMentorAssignmentsByEvent(Integer eventId) {
        return mentorAssignmentRepository.findActiveByEvent(eventId).stream()
                .map(ma -> MentorRosterItemResponse.builder()
                        .id(ma.getId())
                        .mentorUserId(ma.getMentor().getUserId())
                        .mentorName(ma.getMentor().getFullName())
                        .trackId(ma.getTrack().getTrackId())
                        .trackName(ma.getTrack().getName())
                        .build())
                .collect(Collectors.toList());
    }

    /** Removes a mentor assignment (hard delete so the mentor can be re-assigned later). */
    @Transactional
    public void removeMentorAssignment(Integer assignmentId) {
        MentorAssignment assignment = mentorAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Mentor assignment not found: " + assignmentId));
        mentorAssignmentRepository.delete(assignment);
    }

    /**
     * Creates a pre-approved GUEST judge account and assigns it to a round in one
     * step. The trackId rule is enforced by {@link #assignJudge}.
     */
    @Transactional
    public JudgeAssignmentResponse createGuestJudge(CreateGuestJudgeRequest request, Integer actorUserId) {
        String email = request.getEmail().toLowerCase().trim();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("An account with this email already exists.");
        }

        User guest = userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .userType("STAFF")
                .judgeType("GUEST")
                .provider("LOCAL")
                .isApproved(true)
                .isActive(true)
                .build());

        AssignJudgeRequest assign = new AssignJudgeRequest();
        assign.setJudgeUserId(guest.getUserId());
        assign.setRoundId(request.getRoundId());
        assign.setTrackId(request.getTrackId());
        return assignJudge(assign, actorUserId);
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

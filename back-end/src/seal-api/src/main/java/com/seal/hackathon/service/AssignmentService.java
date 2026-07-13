package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.AssignJudgeRequest;
import com.seal.hackathon.dto.request.AssignMentorRequest;
import com.seal.hackathon.dto.request.CreateGuestJudgeRequest;
import com.seal.hackathon.dto.request.ReplaceJudgeRequest;
import com.seal.hackathon.dto.response.CoordinatorEventHistoryResponse;
import com.seal.hackathon.dto.response.JudgeAssignmentResponse;
import com.seal.hackathon.dto.response.JudgeRosterItemResponse;
import com.seal.hackathon.dto.response.MentorAssignmentResponse;
import com.seal.hackathon.dto.response.MentorHistoryResponse;
import com.seal.hackathon.dto.response.MentorRosterItemResponse;
import com.seal.hackathon.dto.response.UserResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.JudgeAssignment;
import com.seal.hackathon.entity.MentorAssignment;
import com.seal.hackathon.entity.Prize;
import com.seal.hackathon.entity.Role;
import com.seal.hackathon.entity.Round;
import com.seal.hackathon.entity.RoundResult;
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
import com.seal.hackathon.repository.ScoreRepository;
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
import java.util.HashMap;
import java.util.HashSet;
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
    private final RoundTimerService roundTimerService;
    private final ScoreRepository scoreRepository;

    /**
     * Danh sách STAFF đã được duyệt, để Coordinator chọn người phân công làm
     * Judge/Mentor. Loại trừ SYSTEM_ADMIN/EVENT_COORDINATOR (họ cũng là
     * userType=STAFF nhưng không được gán làm judge/mentor). Việc tạo tài khoản
     * và cấp role là của Admin (/api/admin); đây chỉ là danh sách tra cứu read-only.
     */
    @Transactional(readOnly = true)
    public List<UserResponse> listApprovedStaff() {
        return userRepository.findAssignableStaff().stream()
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

        // Rounds được cache theo event để không truy vấn lại cho mỗi team.
        Map<Integer, List<Round>> roundsByEvent = new HashMap<>();
        List<MentorAssignmentResponse.AssignedTeamInfo> teamInfos = new ArrayList<>();
        // Track được phân công (kể cả rỗng); dedupe phòng trường hợp trùng.
        List<MentorAssignmentResponse.AssignedTrackInfo> trackInfos = new ArrayList<>();
        Set<Integer> seenTracks = new HashSet<>();

        for (MentorAssignment ma : assignments) {
            Track track = ma.getTrack();
            HackathonEvent trackEvent = track.getEvent();
            List<Round> orderedRounds = roundsByEvent.computeIfAbsent(
                    trackEvent.getEventId(),
                    roundRepository::findAllByEvent_EventIdOrderByOrderNumber);

            if (seenTracks.add(track.getTrackId())) {
                trackInfos.add(MentorAssignmentResponse.AssignedTrackInfo.builder()
                        .trackId(track.getTrackId())
                        .trackName(track.getName())
                        .eventId(trackEvent.getEventId())
                        .eventName(trackEvent.getName())
                        .season(trackEvent.getSeason())
                        .year(trackEvent.getYear())
                        .eventStatus(trackEvent.getStatus())
                        .build());
            }

            for (Team team : teamRepository.findAllByTrack_TrackIdAndStatus(track.getTrackId(), "APPROVED")) {
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

                Map<Integer, RoundResult> resultByRound = roundResultRepository
                        .findAllByTeamIdOrderByRoundOrder(team.getTeamId()).stream()
                        .collect(Collectors.toMap(rr -> rr.getRound().getRoundId(), rr -> rr, (a, b) -> a));
                TeamRoundStatus roundStatus = resolveCurrentRound(orderedRounds, resultByRound);

                teamInfos.add(MentorAssignmentResponse.AssignedTeamInfo.builder()
                        .teamId(team.getTeamId())
                        .teamName(team.getName())
                        .trackId(track.getTrackId())
                        .trackName(track.getName())
                        .eventId(trackEvent.getEventId())
                        .eventName(trackEvent.getName())
                        .season(trackEvent.getSeason())
                        .year(trackEvent.getYear())
                        .eventStatus(trackEvent.getStatus())
                        .members(mapMentorMembers(team))
                        .submissionCount(submitted.size())
                        .lastSubmittedAt(lastAt)
                        .currentRoundName(roundStatus.roundName)
                        .eliminated(roundStatus.eliminated)
                        .build());
            }
        }

        return MentorAssignmentResponse.builder()
                .mentorId(user.getUserId())
                .mentorName(user.getFullName())
                .eventName(eventName)
                .teams(teamInfos)
                .tracks(trackInfos)
                .build();
    }

    /**
     * Xác định round xa nhất mà team còn trụ lại, đi qua các round theo thứ tự:
     * - Round chưa FINALIZED → team đang thi ở round này (round hiện tại).
     * - Round đã FINALIZED, không có cut-off (topNAdvance null) → mọi team qua vòng.
     * - Round đã FINALIZED, có cut-off → chỉ qua vòng nếu rankPosition <= topNAdvance;
     *   nếu không, team dừng lại tại round này với eliminated = true.
     */
    private TeamRoundStatus resolveCurrentRound(List<Round> orderedRounds,
                                                Map<Integer, RoundResult> resultByRound) {
        if (orderedRounds.isEmpty()) {
            return new TeamRoundStatus(null, false);
        }
        Round current = orderedRounds.get(0);
        boolean eliminated = false;
        for (int i = 0; i < orderedRounds.size(); i++) {
            Round r = orderedRounds.get(i);
            current = r;
            if (i == orderedRounds.size() - 1) {
                break; // đã tới round cuối cùng
            }
            if ("FINALIZED".equalsIgnoreCase(r.getStatus())) {
                Integer cutoff = r.getTopNAdvance();
                if (cutoff != null) {
                    RoundResult rr = resultByRound.get(r.getRoundId());
                    boolean advanced = rr != null && rr.getRankPosition() != null
                            && rr.getRankPosition() <= cutoff;
                    if (!advanced) {
                        eliminated = true;
                        break;
                    }
                }
                // cut-off null hoặc đã đậu → đi tiếp sang round kế tiếp
            } else {
                break; // round chưa finalized → team đang ở đây
            }
        }
        return new TeamRoundStatus(current.getName(), eliminated);
    }

    /** Kết quả tính round hiện tại của một team. */
    private static final class TeamRoundStatus {
        final String roundName;
        final boolean eliminated;

        TeamRoundStatus(String roundName, boolean eliminated) {
            this.roundName = roundName;
            this.eliminated = eliminated;
        }
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

                            List<TeamMember> teamMembers = teamMemberRepository.findByTeam_TeamId(team.getTeamId());
                            List<MentorHistoryResponse.MemberInfo> members = teamMembers.stream()
                                    .map(tm -> MentorHistoryResponse.MemberInfo.builder()
                                            .fullName(tm.getUser().getFullName())
                                            .memberRole(tm.getMemberRole())
                                            .studentId(tm.getUser().getStudentId())
                                            .userType(tm.getUser().getUserType())
                                            .university(tm.getUser().getUniversity())
                                            .build())
                                    .collect(Collectors.toList());

                            return MentorHistoryResponse.TeamResult.builder()
                                    .teamId(team.getTeamId())
                                    .teamName(team.getName())
                                    .teamStatus(team.getStatus())
                                    .finalRank(finalRank)
                                    .prizeName(prizeByTeam.get(team.getTeamId()))
                                    .memberCount(teamMembers.size())
                                    .members(members)
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
     * Full coordinator retrospective of one past event: overview stats, awarded
     * prizes, and every track with its mentor(s), the judges on each round, and
     * every approved team's final standing + members. Unlike {@link #getMentorHistory}
     * (scoped to one mentor's tracks) this covers every track in the event, since
     * the coordinator ran the whole thing, not just one track.
     */
    @Transactional(readOnly = true)
    public CoordinatorEventHistoryResponse getEventHistory(Integer eventId) {
        List<Track> tracks = trackRepository.findAllByEvent_EventId(eventId);
        List<Round> orderedRounds = roundRepository.findAllByEvent_EventIdOrderByOrderNumber(eventId);
        Round finalRound = orderedRounds.stream().filter(Round::getIsFinal).findFirst().orElse(null);

        Map<Integer, List<String>> mentorNamesByTrack = new LinkedHashMap<>();
        for (MentorAssignment ma : mentorAssignmentRepository.findActiveByEvent(eventId)) {
            mentorNamesByTrack.computeIfAbsent(ma.getTrack().getTrackId(), k -> new ArrayList<>()).add(ma.getMentor().getFullName());
        }

        // Judges scoped to a track (preliminary rounds) vs. event-wide (the final round, track = null).
        Map<Integer, Map<Integer, List<String>>> judgeNamesByTrackThenRound = new LinkedHashMap<>();
        Map<Integer, List<String>> finalJudgeNamesByRound = new LinkedHashMap<>();
        for (JudgeAssignment ja : judgeAssignmentRepository.findActiveByEvent(eventId)) {
            String judgeName = ja.getJudge().getFullName();
            Integer roundId = ja.getRound().getRoundId();
            if (ja.getTrack() == null) {
                finalJudgeNamesByRound.computeIfAbsent(roundId, k -> new ArrayList<>()).add(judgeName);
            } else {
                judgeNamesByTrackThenRound
                        .computeIfAbsent(ja.getTrack().getTrackId(), k -> new LinkedHashMap<>())
                        .computeIfAbsent(roundId, k -> new ArrayList<>())
                        .add(judgeName);
            }
        }

        List<CoordinatorEventHistoryResponse.PrizeInfo> prizeInfos = new ArrayList<>();
        Map<Integer, String> prizeByTeam = new HashMap<>();
        for (Prize prize : prizeRepository.findAllByEvent_EventIdAndAwardedAtIsNotNullOrderByRankPosition(eventId)) {
            prizeInfos.add(CoordinatorEventHistoryResponse.PrizeInfo.builder()
                    .rankPosition(prize.getRankPosition())
                    .prizeName(prize.getName())
                    .teamName(prize.getTeam() != null ? prize.getTeam().getName() : null)
                    .build());
            if (prize.getTeam() != null) {
                prizeByTeam.putIfAbsent(prize.getTeam().getTeamId(), prize.getName());
            }
        }

        int totalTeams = 0;
        int submittedTeams = 0;
        List<CoordinatorEventHistoryResponse.TrackGroup> trackGroups = new ArrayList<>();

        for (Track track : tracks) {
            List<Team> approvedTeams = teamRepository.findAllByTrack_TrackIdAndStatus(track.getTrackId(), "APPROVED");
            List<CoordinatorEventHistoryResponse.TeamResult> teamResults = new ArrayList<>();

            for (Team team : approvedTeams) {
                totalTeams++;
                boolean hasSubmission = submissionRepository.findAllByTeam_TeamId(team.getTeamId()).stream()
                        .anyMatch(s -> !"DRAFT".equalsIgnoreCase(s.getStatus()));
                if (hasSubmission) {
                    submittedTeams++;
                }

                Integer finalRank = finalRound == null ? null : roundResultRepository
                        .findByTeam_TeamIdAndRound_RoundId(team.getTeamId(), finalRound.getRoundId())
                        .filter(rr -> Boolean.TRUE.equals(rr.getIsPublished()))
                        .map(RoundResult::getRankPosition)
                        .orElse(null);

                List<TeamMember> teamMembers = teamMemberRepository.findByTeam_TeamId(team.getTeamId());
                List<CoordinatorEventHistoryResponse.MemberInfo> members = new ArrayList<>();
                for (TeamMember tm : teamMembers) {
                    members.add(CoordinatorEventHistoryResponse.MemberInfo.builder()
                            .fullName(tm.getUser().getFullName())
                            .memberRole(tm.getMemberRole())
                            .studentId(tm.getUser().getStudentId())
                            .userType(tm.getUser().getUserType())
                            .university(tm.getUser().getUniversity())
                            .build());
                }

                teamResults.add(CoordinatorEventHistoryResponse.TeamResult.builder()
                        .teamId(team.getTeamId())
                        .teamName(team.getName())
                        .teamStatus(team.getStatus())
                        .finalRank(finalRank)
                        .prizeName(prizeByTeam.get(team.getTeamId()))
                        .memberCount(teamMembers.size())
                        .members(members)
                        .build());
            }

            List<CoordinatorEventHistoryResponse.RoundJudges> trackRoundJudges = new ArrayList<>();
            for (Map.Entry<Integer, List<String>> entry : judgeNamesByTrackThenRound.getOrDefault(track.getTrackId(), Map.of()).entrySet()) {
                Round round = findRoundById(orderedRounds, entry.getKey());
                trackRoundJudges.add(CoordinatorEventHistoryResponse.RoundJudges.builder()
                        .roundName(round != null ? round.getName() : "Round")
                        .judgeNames(entry.getValue())
                        .build());
            }

            trackGroups.add(CoordinatorEventHistoryResponse.TrackGroup.builder()
                    .trackId(track.getTrackId())
                    .trackName(track.getName())
                    .mentorNames(mentorNamesByTrack.getOrDefault(track.getTrackId(), List.of()))
                    .roundJudges(trackRoundJudges)
                    .teams(teamResults)
                    .build());
        }

        List<CoordinatorEventHistoryResponse.RoundJudges> finalRoundJudges = new ArrayList<>();
        for (Map.Entry<Integer, List<String>> entry : finalJudgeNamesByRound.entrySet()) {
            Round round = findRoundById(orderedRounds, entry.getKey());
            finalRoundJudges.add(CoordinatorEventHistoryResponse.RoundJudges.builder()
                    .roundName(round != null ? round.getName() : "Final")
                    .judgeNames(entry.getValue())
                    .build());
        }

        return CoordinatorEventHistoryResponse.builder()
                .totalTeams(totalTeams)
                .submittedTeams(submittedTeams)
                .prizes(prizeInfos)
                .tracks(trackGroups)
                .finalRoundJudges(finalRoundJudges)
                .build();
    }

    private Round findRoundById(List<Round> rounds, Integer roundId) {
        return rounds.stream().filter(r -> r.getRoundId().equals(roundId)).findFirst().orElse(null);
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

        JudgeAssignment primaryAssignment = assignments.stream()
                .filter(assignment -> "IN_PROGRESS".equalsIgnoreCase(
                        assignment.getRound().getEvent().getStatus()))
                .findFirst()
                .orElse(assignments.isEmpty() ? null : assignments.get(0));
        Integer eventId = primaryAssignment == null ? null
                : primaryAssignment.getRound().getEvent().getEventId();
        String eventName = primaryAssignment == null ? "N/A"
                : primaryAssignment.getRound().getEvent().getName();
        List<JudgeAssignment> selectedEventAssignments = eventId == null ? List.of() : assignments.stream()
                .filter(assignment -> Objects.equals(eventId,
                        assignment.getRound().getEvent().getEventId()))
                .toList();

        List<JudgeAssignmentResponse.AssignedTeamInfo> teamInfos = selectedEventAssignments.stream()
                .flatMap(ja -> {
                    Round round = ja.getRound();
                    Integer assignmentTrackId = ja.getTrack() == null ? null : ja.getTrack().getTrackId();
                    int panelSize = (int) judgeAssignmentRepository
                            .findAllByRound_RoundIdAndIsActiveTrue(round.getRoundId()).stream()
                            .filter(other -> Objects.equals(assignmentTrackId,
                                    other.getTrack() == null ? null : other.getTrack().getTrackId()))
                            .count();
                    List<Team> teams = ja.getTrack() != null
                            ? teamRepository.findAllByTrack_TrackIdAndStatus(ja.getTrack().getTrackId(), "APPROVED")
                            : teamRepository.findAllByEvent_EventIdAndStatus(round.getEvent().getEventId(), "APPROVED");
                    return teams.stream()
                            .map(team -> JudgeAssignmentResponse.AssignedTeamInfo.builder()
                                    .teamId(team.getTeamId())
                                    .teamName(team.getName())
                                    .trackName(team.getTrack().getName())
                                    .roundId(round.getRoundId())
                                    .assignedJudgeCount(panelSize)
                                    .members(mapJudgeMembers(team))
                                    .build());
                })
                .collect(Collectors.toList());

        return JudgeAssignmentResponse.builder()
                .judgeId(user.getUserId())
                .judgeName(user.getFullName())
                .eventId(eventId)
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

        // Business rule: a mentor manages at most one track per event. (A track may
        // still have several mentors — only the mentor→track direction is capped.)
        Integer eventId = track.getEvent().getEventId();
        if (mentorAssignmentRepository.existsByMentor_UserIdAndTrack_Event_EventIdAndIsActiveTrue(mentor.getUserId(), eventId)) {
            throw new BadRequestException("This mentor already manages a track in this event. A mentor can manage only one track per event.");
        }

        ensureRole(mentor, "MENTOR", eventId);

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

        roundTimerService.assertJudgeAssignmentsMutable(round.getRoundId());

        JudgeAssignment existing = findExactJudgeAssignment(judge.getUserId(), round.getRoundId(), track)
                .orElse(null);
        if (existing != null && Boolean.TRUE.equals(existing.getIsActive())) {
            throw new BadRequestException("This judge is already assigned to this round/track.");
        }

        // judge_type lives on the user; default internal judges to INTERNAL so every
        // assigned judge has a type (guest judges are created with GUEST by the admin).
        if (judge.getJudgeType() == null || !JUDGE_TYPES.contains(judge.getJudgeType().toUpperCase())) {
            judge.setJudgeType("INTERNAL");
            userRepository.save(judge);
        }

        ensureRole(judge, "JUDGE", round.getEvent().getEventId());

        if (existing != null) {
            existing.setIsActive(true);
            judgeAssignmentRepository.save(existing);
        } else {
            judgeAssignmentRepository.save(JudgeAssignment.builder()
                    .judge(judge)
                    .round(round)
                    .track(track)
                    .build());
        }

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

    /** Removes a judge before judging starts, preserving the inactive row for history. */
    @Transactional
    public void removeJudgeAssignment(Integer assignmentId) {
        JudgeAssignment assignment = judgeAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Judge assignment not found: " + assignmentId));
        roundTimerService.assertJudgeAssignmentsMutable(assignment.getRound().getRoundId());
        assignment.setIsActive(false);
        judgeAssignmentRepository.save(assignment);
    }

    /**
     * Replaces an unavailable judge without silently shrinking the panel. The
     * countdown must not be running and the old judge must not have submitted any
     * final score in this assignment's cell.
     */
    @Transactional
    public JudgeAssignmentResponse replaceJudgeAssignment(Integer assignmentId,
                                                           ReplaceJudgeRequest request,
                                                           Integer actorUserId) {
        JudgeAssignment old = judgeAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Judge assignment not found: " + assignmentId));
        if (!Boolean.TRUE.equals(old.getIsActive())) {
            throw new BadRequestException("This judge assignment is no longer active.");
        }
        Round round = old.getRound();
        roundTimerService.assertJudgeReplacementAllowed(round.getRoundId());

        if (Objects.equals(old.getJudge().getUserId(), request.getJudgeUserId())) {
            throw new BadRequestException("Replacement judge must be different from the current judge.");
        }
        if (hasFinalScoreInAssignment(old)) {
            throw new BadRequestException(
                    "This judge has already submitted final scores in this cell and cannot be replaced.");
        }

        User replacement = userRepository.findByIdWithRoles(request.getJudgeUserId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found: " + request.getJudgeUserId()));
        JudgeAssignment existing = findExactJudgeAssignment(
                replacement.getUserId(), round.getRoundId(), old.getTrack()).orElse(null);
        if (existing != null && Boolean.TRUE.equals(existing.getIsActive())) {
            throw new BadRequestException("The replacement judge is already assigned to this round/track.");
        }

        if (replacement.getJudgeType() == null
                || !JUDGE_TYPES.contains(replacement.getJudgeType().toUpperCase())) {
            replacement.setJudgeType("INTERNAL");
            userRepository.save(replacement);
        }
        ensureRole(replacement, "JUDGE", round.getEvent().getEventId());

        old.setIsActive(false);
        judgeAssignmentRepository.save(old);
        if (existing != null) {
            existing.setIsActive(true);
            judgeAssignmentRepository.save(existing);
        } else {
            judgeAssignmentRepository.save(JudgeAssignment.builder()
                    .judge(replacement)
                    .round(round)
                    .track(old.getTrack())
                    .build());
        }

        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("old_judge_user_id", old.getJudge().getUserId());
        meta.put("new_judge_user_id", replacement.getUserId());
        meta.put("event_id", round.getEvent().getEventId());
        meta.put("reason", request.getReason().trim());
        if (old.getTrack() != null) meta.put("track_id", old.getTrack().getTrackId());
        auditLogService.record(actorUserId, "REPLACE_JUDGE", "ROUND", round.getRoundId(), null, meta);

        return getJudgeAssignments(replacement.getUserId());
    }

    private java.util.Optional<JudgeAssignment> findExactJudgeAssignment(
            Integer judgeUserId, Integer roundId, Track track) {
        return track == null
                ? judgeAssignmentRepository.findByJudge_UserIdAndRound_RoundIdAndTrackIsNull(judgeUserId, roundId)
                : judgeAssignmentRepository.findByJudge_UserIdAndRound_RoundIdAndTrack_TrackId(
                        judgeUserId, roundId, track.getTrackId());
    }

    private boolean hasFinalScoreInAssignment(JudgeAssignment assignment) {
        Integer trackId = assignment.getTrack() == null ? null : assignment.getTrack().getTrackId();
        return scoreRepository
                .findAllByJudge_UserIdAndSubmission_Round_RoundIdAndIsDraftFalse(
                        assignment.getJudge().getUserId(), assignment.getRound().getRoundId())
                .stream()
                .anyMatch(score -> trackId == null || (score.getSubmission().getTeam().getTrack() != null
                        && Objects.equals(trackId,
                                score.getSubmission().getTeam().getTrack().getTrackId())));
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
                        .studentId(m.getUser().getStudentId())
                        .userType(m.getUser().getUserType())
                        .university(m.getUser().getUniversity())
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
                        .studentId(m.getUser().getStudentId())
                        .userType(m.getUser().getUserType())
                        .university(m.getUser().getUniversity())
                        .build())
                .collect(Collectors.toList());
    }
}

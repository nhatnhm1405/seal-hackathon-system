package com.seal.hackathon.config.seed;

import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.JudgeAssignment;
import com.seal.hackathon.entity.MentorAssignment;
import com.seal.hackathon.entity.Notification;
import com.seal.hackathon.entity.Prize;
import com.seal.hackathon.entity.Role;
import com.seal.hackathon.entity.Round;
import com.seal.hackathon.entity.RoundResult;
import com.seal.hackathon.entity.Score;
import com.seal.hackathon.entity.ScoringCriteria;
import com.seal.hackathon.entity.Submission;
import com.seal.hackathon.entity.SystemLog;
import com.seal.hackathon.entity.Team;
import com.seal.hackathon.entity.TeamMember;
import com.seal.hackathon.entity.Track;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.entity.UserEventRole;
import com.seal.hackathon.repository.HackathonEventRepository;
import com.seal.hackathon.repository.JudgeAssignmentRepository;
import com.seal.hackathon.repository.MentorAssignmentRepository;
import com.seal.hackathon.repository.NotificationRepository;
import com.seal.hackathon.repository.PrizeRepository;
import com.seal.hackathon.repository.RoleRepository;
import com.seal.hackathon.repository.RoundRepository;
import com.seal.hackathon.repository.RoundResultRepository;
import com.seal.hackathon.repository.ScoreRepository;
import com.seal.hackathon.repository.ScoringCriteriaRepository;
import com.seal.hackathon.repository.SubmissionRepository;
import com.seal.hackathon.repository.SystemLogRepository;
import com.seal.hackathon.repository.TeamMemberRepository;
import com.seal.hackathon.repository.TeamRepository;
import com.seal.hackathon.repository.TrackRepository;
import com.seal.hackathon.repository.UserEventRoleRepository;
import com.seal.hackathon.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Reusable builders for demo data. Every helper {@code save()}s and returns the
 * managed entity, so callers wire relationships by <b>object reference</b> — no
 * hand-managed ids, the thing that made SQL seeds so fragile. Pure construction;
 * bypasses the service-layer gates on purpose (the caller sets consistent statuses).
 */
@Component
@RequiredArgsConstructor
public class DemoFixtures {

    /** Shared password for every demo account (BCrypt-hashed on save). */
    public static final String DEMO_PASSWORD = "Test@1234";

    private final UserRepository userRepo;
    private final UserEventRoleRepository grantRepo;
    private final RoleRepository roleRepo;
    private final HackathonEventRepository eventRepo;
    private final TrackRepository trackRepo;
    private final RoundRepository roundRepo;
    private final ScoringCriteriaRepository criteriaRepo;
    private final TeamRepository teamRepo;
    private final TeamMemberRepository memberRepo;
    private final JudgeAssignmentRepository judgeAssignRepo;
    private final MentorAssignmentRepository mentorAssignRepo;
    private final SubmissionRepository submissionRepo;
    private final ScoreRepository scoreRepo;
    private final RoundResultRepository resultRepo;
    private final PrizeRepository prizeRepo;
    private final SystemLogRepository systemLogRepo;
    private final NotificationRepository notificationRepo;
    private final PasswordEncoder encoder;

    // ── People ───────────────────────────────────────────────────────

    /** Partner universities used to fill in external students' `university`. */
    private static final String[] EXTERNAL_UNIS =
            {"HCMUS", "HCMUT (Bách Khoa)", "UIT", "RMIT Vietnam", "Văn Lang University"};

    /** Running counter so each seeded student gets a distinct MSSV. */
    private int studentSeq = 0;

    public User user(String email, String fullName, String userType, String judgeType) {
        // Students carry an MSSV; external students also carry a university, mirroring
        // what real registration collects. Staff/judges/mentors have neither.
        String studentId = null;
        String university = null;
        if ("FPT_STUDENT".equals(userType)) {
            studentId = String.format("SE%06d", 150000 + (++studentSeq));
        } else if ("EXTERNAL_STUDENT".equals(userType)) {
            int n = ++studentSeq;
            studentId = String.format("EX%06d", 210000 + n);
            university = EXTERNAL_UNIS[n % EXTERNAL_UNIS.length];
        }
        return userRepo.save(User.builder()
                .email(email)
                .passwordHash(encoder.encode(DEMO_PASSWORD))
                .fullName(fullName)
                .userType(userType)
                .judgeType(judgeType)
                .studentId(studentId)
                .university(university)
                .provider("LOCAL")
                .isApproved(true)
                .isActive(true)
                .build());
    }

    /** Grants a staff role; eventId null = system-wide. */
    public void grant(User user, String roleName, Integer eventId) {
        Role role = roleRepo.findByRoleName(roleName)
                .orElseThrow(() -> new IllegalStateException("Role not seeded: " + roleName));
        grantRepo.save(UserEventRole.builder().user(user).role(role).eventId(eventId).build());
    }

    /**
     * Mirrors production's completion behaviour for a COMPLETED demo event: its
     * student team members and guest judges are per-event, so they drop to
     * is_active=false (internal judges/mentors/staff stay active). The seed sets
     * the event status directly instead of calling completeEvent, so apply it here.
     */
    public void deactivateCompletedEventUsers(HackathonEvent event) {
        List<User> students = teamRepo.findAllByEvent_EventId(event.getEventId()).stream()
                .flatMap(t -> memberRepo.findByTeam_TeamId(t.getTeamId()).stream())
                .map(TeamMember::getUser)
                .filter(u -> "FPT_STUDENT".equalsIgnoreCase(u.getUserType())
                        || "EXTERNAL_STUDENT".equalsIgnoreCase(u.getUserType()))
                .distinct()
                .toList();
        List<User> guestJudges = judgeAssignRepo.findActiveByEvent(event.getEventId()).stream()
                .map(JudgeAssignment::getJudge)
                .filter(u -> "GUEST".equalsIgnoreCase(u.getJudgeType()))
                .distinct()
                .toList();
        students.forEach(u -> u.setIsActive(false));
        guestJudges.forEach(u -> u.setIsActive(false));
        userRepo.saveAll(students);
        userRepo.saveAll(guestJudges);
    }

    /** The bootstrap SYSTEM_ADMIN account (seeded by DataSeeder, before the demo seeder runs). */
    public User adminActor() {
        return userRepo.findByEmail(com.seal.hackathon.config.DataSeeder.ADMIN_EMAIL)
                .orElseThrow(() -> new IllegalStateException(
                        "Bootstrap SYSTEM_ADMIN not found — DataSeeder must run before the demo seeder."));
    }

    // ── System log ───────────────────────────────────────────────────

    /** Appends a SystemLog row with an explicit timestamp, for a demo audit trail
     * that reads as a real timeline instead of a burst of same-instant rows. */
    public void systemLog(User actor, String action, String detail, LocalDateTime at) {
        systemLogRepo.save(SystemLog.builder()
                .actor(actor).action(action).detail(detail).createdAt(at).build());
    }

    // ── Event structure ──────────────────────────────────────────────

    public HackathonEvent event(String name, String season, int year, String status, String mode,
                                LocalDateTime regStart, LocalDateTime regEnd,
                                LocalDateTime start, LocalDateTime end) {
        return eventRepo.save(HackathonEvent.builder()
                .name(name).season(season).year(year)
                .status(status).trackSelectionMode(mode)
                .description("Seeded demo event — safe to delete.")
                .registrationStart(regStart).registrationEnd(regEnd)
                .startDate(start).endDate(end)
                .build());
    }

    public Track track(HackathonEvent event, String name) {
        return trackRepo.save(Track.builder()
                .event(event).name(name).description(name + " category.").build());
    }

    public Round round(HackathonEvent event, int order, String name, boolean isFinal, String status,
                       LocalDateTime start, LocalDateTime end, LocalDateTime deadline, Integer topN) {
        return roundRepo.save(Round.builder()
                .event(event).orderNumber(order).name(name).isFinal(isFinal).status(status)
                .startTime(start).endTime(end).submissionDeadline(deadline).topNAdvance(topN)
                .build());
    }

    public ScoringCriteria criteria(HackathonEvent event, Round round, String name,
                                    double weight, double maxScore, int order) {
        return criteriaRepo.save(ScoringCriteria.builder()
                .event(event).round(round).name(name)
                .weight(BigDecimal.valueOf(weight)).maxScore(BigDecimal.valueOf(maxScore))
                .orderNumber(order).build());
    }

    // ── Teams ────────────────────────────────────────────────────────

    /** Creates a team with a LEADER + the given MEMBERs. */
    public Team team(HackathonEvent event, Track track, String name, String status,
                     User leader, List<User> members) {
        Team team = teamRepo.save(Team.builder()
                .event(event).track(track).name(name).status(status)
                .description(name + " — demo team.").build());
        memberRepo.save(TeamMember.builder().team(team).user(leader).memberRole("LEADER").build());
        for (User member : members) {
            memberRepo.save(TeamMember.builder().team(team).user(member).memberRole("MEMBER").build());
        }
        return team;
    }

    /**
     * A team the coordinator disqualified for a rule violation: status DISQUALIFIED
     * with a reason + timestamp, mirroring what {@code TeamService.disqualifyTeam}
     * writes. Kept out of the scoring/ranking slots by the caller.
     */
    public Team disqualifiedTeam(HackathonEvent event, Track track, String name, String reason,
                                 LocalDateTime disqualifiedAt, User leader, List<User> members) {
        Team team = team(event, track, name, "DISQUALIFIED", leader, members);
        team.setDisqualifiedReason(reason);
        team.setDisqualifiedAt(disqualifiedAt);
        return teamRepo.save(team);
    }

    // ── Assignments ──────────────────────────────────────────────────

    public void assignJudge(User judge, Round round, Track track) {
        judgeAssignRepo.save(JudgeAssignment.builder().judge(judge).round(round).track(track).build());
    }

    public void assignMentor(User mentor, Track track) {
        mentorAssignRepo.save(MentorAssignment.builder().mentor(mentor).track(track).build());
    }

    // ── Submissions & scoring ────────────────────────────────────────

    public Submission submission(Team team, Round round, User submittedBy) {
        String slug = team.getName().toLowerCase().replaceAll("[^a-z0-9]+", "-");
        return submissionRepo.save(Submission.builder()
                .team(team).round(round).submittedBy(submittedBy).status("SUBMITTED")
                .repoUrl("https://github.com/seal-demo/" + slug)
                .demoUrl("https://" + slug + ".demo.seal.dev")
                .slideUrl("https://slides.seal.dev/" + slug)
                .description("Demo submission by " + team.getName() + ".")
                .build());
    }

    public void score(Submission submission, User judge, ScoringCriteria criteria, double value) {
        scoreRepo.save(Score.builder()
                .submission(submission).judge(judge).criteria(criteria)
                .value(BigDecimal.valueOf(value)).isDraft(false)
                .comment("Seeded demo score.")
                .build());
    }

    public void result(Team team, Round round, double total, int rank, User finalizedBy) {
        resultRepo.save(RoundResult.builder()
                .team(team).round(round)
                .totalScore(BigDecimal.valueOf(total)).rankPosition(rank)
                .isPublished(true).finalizedBy(finalizedBy).finalizedAt(LocalDateTime.now())
                .build());
    }

    public void prize(HackathonEvent event, String name, int rank, Team team) {
        prizeRepo.save(Prize.builder()
                .event(event).name(name).rankPosition(rank).team(team)
                .description(name + " — SEAL Demo award.").awardedAt(LocalDateTime.now())
                .build());
    }

    /** A prize slot with its winner chosen but NOT yet announced (awardedAt = null),
     *  so a coordinator can demo the "announce prizes" action live. */
    public void draftPrize(HackathonEvent event, String name, int rank, Team team) {
        prizeRepo.save(Prize.builder()
                .event(event).name(name).rankPosition(rank).team(team)
                .description(name + " — SEAL Demo award (pending announcement).")
                .build());
    }

    /** Writes a notification row directly (the seed bypasses NotificationService),
     *  with an explicit timestamp so it reads as part of the demo timeline. */
    public void notification(User recipient, String title, String content, String type,
                             LocalDateTime at) {
        notificationRepo.save(Notification.builder()
                .recipient(recipient).title(title).content(content).type(type)
                .isRead(false).createdAt(at).build());
    }
}

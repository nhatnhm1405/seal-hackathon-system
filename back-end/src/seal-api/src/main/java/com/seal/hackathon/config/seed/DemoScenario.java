package com.seal.hackathon.config.seed;

import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.Round;
import com.seal.hackathon.entity.ScoringCriteria;
import com.seal.hackathon.entity.Submission;
import com.seal.hackathon.entity.Team;
import com.seal.hackathon.entity.Track;
import com.seal.hackathon.entity.User;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Builds one demo event as a layered pipeline. Each scenario is a cut-point:
 * <pre>
 *   S0  accounts only            (no event)
 *   S1  + event OPEN + structure + forming teams (incl. solo/pairs for grouping)
 *   S2  + approved teams in tracks + assignments + submissions   (IN_PROGRESS)
 *   S3  + scores + ranked results + prizes                       (COMPLETED)
 * </pre>
 * Statuses are set to match each cut so the snapshot is always consistent with the
 * event state machine. Scoring is deterministic (a pure function of team strength),
 * so ranks/prizes are reproducible.
 */
@Component
@RequiredArgsConstructor
public class DemoScenario {

    private static final Logger log = LoggerFactory.getLogger(DemoScenario.class);

    public static final String DEMO_EVENT_NAME = "SEAL Demo Summer 2026";
    /** Seeded in every scenario (incl. S0) — used as the "already seeded?" guard. */
    public static final String COORDINATOR_EMAIL = "demo.coordinator@fpt.edu.vn";
    private static final int YEAR = 2026;
    private static final int MEMBERS_PER_TEAM = 3;   // 1 leader + 2 members
    private static final int TOP_N_ADVANCE = 4;
    private static final double MAX_SCORE = 10.0;

    // name + weight; max score is MAX_SCORE for all (see requirements §6.2)
    private static final String[][] CRITERIA = {
            {"Ý tưởng", "1.0"}, {"Kỹ thuật", "1.5"}, {"UI/UX", "1.0"},
            {"Hoàn thiện", "1.0"}, {"Trình bày", "0.5"},
    };
    private static final String[] TRACKS = {"Web Application", "AI Solution"};

    private final DemoFixtures fx;

    private int participantSeq = 0;
    private int maxStrength = 2;

    @Transactional
    public void seed(String scenario, int teamsPerTrack) {
        // ── 1. ACCOUNTS (every scenario) ─────────────────────────────
        User coordinator = fx.user(COORDINATOR_EMAIL, "Demo Coordinator", "STAFF", null);
        fx.grant(coordinator, "EVENT_COORDINATOR", null);
        User judge1 = staff("demo.judge1@fpt.edu.vn", "Judge Internal One", "INTERNAL", "JUDGE");
        User judge2 = staff("demo.judge2@fpt.edu.vn", "Judge Internal Two", "INTERNAL", "JUDGE");
        User guestJudge = staff("demo.guestjudge@gmail.com", "Guest Judge", "GUEST", "JUDGE");
        User mentor1 = staff("demo.mentor1@fpt.edu.vn", "Mentor One", null, "MENTOR");
        User mentor2 = staff("demo.mentor2@fpt.edu.vn", "Mentor Two", null, "MENTOR");
        // spare accounts to demo live actions (register/create team) alongside the seed
        fx.user("demo.spare1@fpt.edu.vn", "Spare Participant One", "FPT_STUDENT", null);
        fx.user("demo.spare2@fpt.edu.vn", "Spare Participant Two", "EXTERNAL_STUDENT", null);

        if ("S0".equals(scenario)) {
            log.info("[demo] S0 seeded — accounts only, no event.");
            return;
        }

        // ── 2-4. EVENT + STRUCTURE ───────────────────────────────────
        Window w = windowFor(scenario);
        HackathonEvent event = fx.event(DEMO_EVENT_NAME, "SUMMER", YEAR,
                eventStatusFor(scenario), "RANDOM", w.regStart, w.regEnd, w.start, w.end);

        List<Track> tracks = new ArrayList<>();
        for (String name : TRACKS) {
            tracks.add(fx.track(event, name));
        }
        Round prelim = fx.round(event, 1, "Vòng sơ khảo", false, roundStatusFor(scenario, true),
                w.start, w.start.plusDays(7), w.start.plusDays(6), TOP_N_ADVANCE);
        Round finalRound = fx.round(event, 2, "Vòng chung kết", true, roundStatusFor(scenario, false),
                w.start.plusDays(8), w.start.plusDays(14), w.start.plusDays(13), null);
        List<ScoringCriteria> prelimCriteria = criteriaFor(event, prelim);
        List<ScoringCriteria> finalCriteria = criteriaFor(event, finalRound);
        fx.assignMentor(mentor1, tracks.get(0));
        fx.assignMentor(mentor2, tracks.get(1));

        // ── S1: forming teams (no tracks yet — assigned at SETUP) ────
        if ("S1".equals(scenario)) {
            fx.team(event, null, "Alpha", "APPROVED", participant(), members(2));
            fx.team(event, null, "Bravo", "APPROVED", participant(), members(2));
            fx.team(event, null, "Charlie (pending)", "PENDING", participant(), members(2));
            fx.team(event, null, "Lone Wolf", "APPROVED", participant(), List.of());          // solo → grouping demo
            fx.team(event, null, "Duo Buddies", "APPROVED", participant(), members(1));        // pair → grouping demo
            log.info("[demo] S1 seeded — OPEN event, forming teams (incl. solo/pair for grouping).");
            return;
        }

        // ── 5-6. APPROVED ROSTER IN TRACKS + judges + submissions ────
        List<Slot> slots = new ArrayList<>();
        maxStrength = teamsPerTrack * TRACKS.length; // total teams — normalizes strength to [0,1]
        int strengthRank = maxStrength;              // higher = stronger, unique per team
        char letter = 'A';
        for (Track track : tracks) {
            for (int i = 1; i <= teamsPerTrack; i++) {
                User leader = participant();
                Team team = fx.team(event, track, "Team " + letter + i, "APPROVED", leader, members(2));
                slots.add(new Slot(team, leader, strengthRank--));
            }
            letter++;
        }
        // prelim judges score per track; the final-round judges score everyone
        for (Track track : tracks) {
            fx.assignJudge(judge1, prelim, track);
            fx.assignJudge(judge2, prelim, track);
        }
        fx.assignJudge(judge1, finalRound, null);
        fx.assignJudge(judge2, finalRound, null);
        fx.assignJudge(guestJudge, finalRound, null);

        List<Submission> prelimSubs = new ArrayList<>();
        for (Slot s : slots) {
            prelimSubs.add(fx.submission(s.team, prelim, s.leader));
        }

        if ("S2".equals(scenario)) {
            log.info("[demo] S2 seeded — IN_PROGRESS, {} teams in tracks, submissions ready to score.", slots.size());
            return;
        }

        // ── 7-9. SCORES → RESULTS → PRIZES (S3) ──────────────────────
        List<User> prelimJudges = List.of(judge1, judge2);
        rankAndSave(prelim, prelimSubs, slots, prelimCriteria, prelimJudges, coordinator);

        // top-N advance to the final round
        List<Slot> advancing = slots.stream()
                .sorted(Comparator.comparingDouble((Slot s) -> total(s, prelimCriteria, prelimJudges.size())).reversed())
                .limit(TOP_N_ADVANCE)
                .toList();

        List<Submission> finalSubs = new ArrayList<>();
        for (Slot s : advancing) {
            finalSubs.add(fx.submission(s.team, finalRound, s.leader));
        }
        List<User> finalJudges = List.of(judge1, judge2, guestJudge);
        List<Slot> finalRanked = rankAndSave(finalRound, finalSubs, advancing, finalCriteria, finalJudges, coordinator);

        String[] prizeNames = {"Giải Nhất", "Giải Nhì", "Giải Ba"};
        for (int i = 0; i < Math.min(3, finalRanked.size()); i++) {
            fx.prize(event, prizeNames[i], i + 1, finalRanked.get(i).team);
        }
        log.info("[demo] S3 seeded — COMPLETED event, {} teams scored, {} advanced, prizes awarded.",
                slots.size(), advancing.size());
    }

    // ── scoring/ranking ──────────────────────────────────────────────

    /** Writes every judge×criteria score for the round, then ranked+published results. Returns slots in rank order. */
    private List<Slot> rankAndSave(Round round, List<Submission> subs, List<Slot> slots,
                                   List<ScoringCriteria> criteria, List<User> judges, User coordinator) {
        for (int k = 0; k < subs.size(); k++) {
            Slot slot = slots.get(k);
            Submission sub = subs.get(k);
            for (int c = 0; c < criteria.size(); c++) {
                for (int j = 0; j < judges.size(); j++) {
                    fx.score(sub, judges.get(j), criteria.get(c), value(slot.strength, c, j));
                }
            }
        }
        List<Slot> ranked = slots.stream()
                .sorted(Comparator.comparingDouble((Slot s) -> total(s, criteria, judges.size())).reversed())
                .toList();
        for (int r = 0; r < ranked.size(); r++) {
            Slot s = ranked.get(r);
            fx.result(s.team, round, total(s, criteria, judges.size()), r + 1, coordinator);
        }
        return ranked;
    }

    /** Deterministic per-judge criterion score in [6.0, MAX_SCORE], stronger teams higher. */
    private double value(int strength, int criteriaIdx, int judgeIdx) {
        double strength01 = normalizedStrength(strength);
        double base = 6.0 + 3.5 * strength01;          // 6.0 (weakest) .. 9.5 (strongest)
        double judgeJitter = judgeIdx == 1 ? 0.3 : (judgeIdx == 2 ? -0.3 : 0.0);
        double criteriaAdj = criteriaIdx % 2 == 0 ? 0.2 : -0.1;
        double v = base + judgeJitter + criteriaAdj;
        v = Math.max(0.0, Math.min(MAX_SCORE, v));
        return Math.round(v * 100.0) / 100.0;
    }

    /** Weighted total: sum over criteria of (avg judge value × weight). */
    private double total(Slot slot, List<ScoringCriteria> criteria, int judgeCount) {
        double total = 0.0;
        for (int c = 0; c < criteria.size(); c++) {
            double sum = 0.0;
            for (int j = 0; j < judgeCount; j++) {
                sum += value(slot.strength, c, j);
            }
            double avg = sum / judgeCount;
            total += avg * criteria.get(c).getWeight().doubleValue();
        }
        return Math.round(total * 100.0) / 100.0;
    }

    private double normalizedStrength(int strength) {
        return maxStrength <= 1 ? 1.0 : (double) (strength - 1) / (maxStrength - 1);
    }

    // ── helpers ──────────────────────────────────────────────────────

    private User staff(String email, String name, String judgeType, String roleName) {
        User u = fx.user(email, name, "STAFF", judgeType);
        fx.grant(u, roleName, null);
        return u;
    }

    private List<ScoringCriteria> criteriaFor(HackathonEvent event, Round round) {
        List<ScoringCriteria> list = new ArrayList<>();
        for (int i = 0; i < CRITERIA.length; i++) {
            list.add(fx.criteria(event, round, CRITERIA[i][0],
                    Double.parseDouble(CRITERIA[i][1]), MAX_SCORE, i + 1));
        }
        return list;
    }

    private User participant() {
        participantSeq++;
        String type = participantSeq % 3 == 0 ? "EXTERNAL_STUDENT" : "FPT_STUDENT";
        return fx.user("demo.p" + participantSeq + "@fpt.edu.vn", "Demo Player " + participantSeq, type, null);
    }

    private List<User> members(int count) {
        List<User> list = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            list.add(participant());
        }
        return list;
    }

    private String eventStatusFor(String scenario) {
        return switch (scenario) {
            case "S1" -> "OPEN";
            case "S2" -> "IN_PROGRESS";
            default -> "COMPLETED";
        };
    }

    private String roundStatusFor(String scenario, boolean prelim) {
        return switch (scenario) {
            case "S1" -> "PENDING";
            case "S2" -> prelim ? "ACTIVE" : "PENDING";
            default -> "FINALIZED";
        };
    }

    private Window windowFor(String scenario) {
        LocalDateTime now = LocalDateTime.now();
        return switch (scenario) {
            case "S1" -> new Window(now.minusDays(5), now.plusDays(15), now.plusDays(20), now.plusDays(40));
            case "S2" -> new Window(now.minusDays(40), now.minusDays(20), now.minusDays(10), now.plusDays(20));
            default -> new Window(now.minusDays(70), now.minusDays(50), now.minusDays(45), now.minusDays(15));
        };
    }

    private record Window(LocalDateTime regStart, LocalDateTime regEnd,
                          LocalDateTime start, LocalDateTime end) {
    }

    /** A built team with its leader and a deterministic strength for scoring. */
    private record Slot(Team team, User leader, int strength) {
    }
}

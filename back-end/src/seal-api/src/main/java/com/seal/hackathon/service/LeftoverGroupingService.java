package com.seal.hackathon.service;

import com.seal.hackathon.dto.response.GroupingCommitResponse;
import com.seal.hackathon.dto.response.GroupingPreviewResponse;
import com.seal.hackathon.dto.response.GroupingPreviewResponse.MemberView;
import com.seal.hackathon.dto.response.GroupingPreviewResponse.ProposedTeamView;
import com.seal.hackathon.dto.response.GroupingPreviewResponse.WarningView;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.JoinRequest;
import com.seal.hackathon.entity.Team;
import com.seal.hackathon.entity.TeamInvite;
import com.seal.hackathon.entity.TeamMember;
import com.seal.hackathon.entity.User;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.HackathonEventRepository;
import com.seal.hackathon.repository.JoinRequestRepository;
import com.seal.hackathon.repository.TeamInviteRepository;
import com.seal.hackathon.repository.TeamMemberRepository;
import com.seal.hackathon.repository.TeamRepository;
import com.seal.hackathon.repository.UserRepository;
import com.seal.hackathon.service.grouping.Atom;
import com.seal.hackathon.service.grouping.GroupingPlan;
import com.seal.hackathon.service.grouping.GroupingWarning;
import com.seal.hackathon.service.grouping.LeftoverGroupingPlanner;
import com.seal.hackathon.service.grouping.ProposedTeam;
import com.seal.hackathon.service.grouping.ProposedTeam.TeamOrigin;
import com.seal.hackathon.service.grouping.SettledTeam;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;

/**
 * Groups an event's leftover people into valid teams during SETUP, just before the
 * track draw. "Leftover people" are the members of under-sized teams plus registrants
 * who never joined a squad:
 * <ul>
 *   <li>a team of 1 → a movable free agent (its one-person team is dissolved on commit);</li>
 *   <li>a team of 2 → kept together and grown in place;</li>
 *   <li>a team of {@value LeftoverGroupingPlanner#DEFAULT_MIN}+ → left alone (a spill target only);</li>
 *   <li>an active, approved student on no team of this event → a teamless free agent
 *       (gains a membership only when placed on commit).</li>
 * </ul>
 *
 * The heavy lifting is the pure {@link LeftoverGroupingPlanner}; this service maps
 * entities to/from it and applies the plan. Writes go straight through the
 * repositories — an intentional SETUP-scoped path that bypasses the OPEN-only guard
 * on normal team creation (the roster is otherwise frozen once SETUP begins).
 */
@Service
@RequiredArgsConstructor
public class LeftoverGroupingService {

    private static final int MIN = LeftoverGroupingPlanner.DEFAULT_MIN;
    private static final int MAX = LeftoverGroupingPlanner.DEFAULT_MAX;
    private static final String GROUPED_NOTIFICATION = "TEAM_GROUPED";

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final HackathonEventRepository eventRepository;
    private final JoinRequestRepository joinRequestRepository;
    private final TeamInviteRepository teamInviteRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final HackathonEventService hackathonEventService;

    private final LeftoverGroupingPlanner planner = new LeftoverGroupingPlanner(MIN, MAX);
    private final Random random = new Random();

    // ── Preview (read-only dry run) ──────────────────────────────────

    @Transactional(readOnly = true)
    public GroupingPreviewResponse preview(Integer eventId) {
        requireSetupEvent(eventId);
        Context ctx = buildContext(eventId);
        GroupingPlan plan = planner.plan(ctx.atoms, ctx.settled);
        return toPreview(plan, ctx);
    }

    // ── Commit (apply the plan) ──────────────────────────────────────

    @Transactional
    public GroupingCommitResponse commit(Integer eventId, Integer actorUserId, String reason) {
        HackathonEvent event = requireSetupEvent(eventId);
        Context ctx = buildContext(eventId);
        GroupingPlan plan = planner.plan(ctx.atoms, ctx.settled);

        int created = 0;
        int grown = 0;
        int placed = 0;
        for (ProposedTeam pt : plan.teams()) {
            if (pt.origin() == TeamOrigin.NEW) {
                placed += applyNewTeam(event, pt, ctx);
                created++;
            } else {
                placed += growExistingTeam(pt, ctx);
                grown++;
            }
        }

        // The roster changed mid-SETUP, so slot counts frozen on SETUP entry are stale.
        hackathonEventService.recomputeSetupTrackCapacities(eventId);

        auditLogService.record(actorUserId, "GROUP_LEFTOVERS", "EVENT", eventId,
                (reason != null && !reason.isBlank()) ? reason.trim() : null,
                Map.of("teams_created", created, "teams_grown", grown,
                        "people_placed", placed, "warnings", plan.warnings().size()));

        return GroupingCommitResponse.builder()
                .teamsCreated(created)
                .teamsGrown(grown)
                .peoplePlaced(placed)
                .unresolvedWarnings(plan.warnings().size())
                .warnings(plan.warnings().stream().map(w -> toWarningView(w, ctx)).toList())
                .build();
    }

    // ── Building the planner input from entities ─────────────────────

    private Context buildContext(Integer eventId) {
        List<Atom> atoms = new ArrayList<>();
        List<SettledTeam> settled = new ArrayList<>();
        Map<String, Source> byRef = new LinkedHashMap<>();

        for (Team team : teamRepository.findAllByEvent_EventIdAndStatus(eventId, "APPROVED")) {
            List<TeamMember> members = teamMemberRepository.findByTeam_TeamId(team.getTeamId());
            Source src = Source.ofTeam(team, members);
            byRef.put(src.ref(), src);

            int size = members.size();
            if (size <= 0) {
                continue; // defensive: an empty approved team is not a grouping unit
            }
            if (size == 1) {
                atoms.add(Atom.freeAgent(src.ref()));
            } else if (size < MIN) {
                atoms.add(Atom.existingTeam(src.ref(), size));
            } else if (size < MAX) {
                settled.add(new SettledTeam(src.ref(), MAX - size));
            }
            // size >= MAX: full, no room to absorb — ignored as neither atom nor absorber.
        }

        // Registrants approved & active for the current season but on no team of this
        // event: teamless free agents. The query already excludes anyone on an event team,
        // so these never double-count the solo-team members handled above.
        for (User freeAgent : userRepository.findGroupableFreeAgents(eventId)) {
            Source src = Source.ofUser(freeAgent);
            byRef.put(src.ref(), src);
            atoms.add(Atom.freeAgent(src.ref()));
        }

        return new Context(atoms, settled, byRef);
    }

    // ── Applying the plan ────────────────────────────────────────────

    /** Grows an existing team (a kept pair, or a settled team absorbing stragglers). */
    private int growExistingTeam(ProposedTeam pt, Context ctx) {
        Source target = ctx.byRef.get(pt.existingTeamRef());
        List<Integer> originalMemberIds = target.userIds();

        int moved = 0;
        for (String addedRef : pt.addedRefs()) {
            moved += absorbInto(target.team(), ctx.byRef.get(addedRef));
        }

        String teamName = target.team().getName();
        String eventName = target.team().getEvent().getName();
        // Notify the members already on the team that it grew.
        originalMemberIds.forEach(uid -> notificationService.createNotification(uid,
                "New teammate(s) added",
                "Your team '" + teamName + "' gained new member(s) during setup grouping for "
                        + eventName + ".", GROUPED_NOTIFICATION));
        return moved;
    }

    /** Creates a brand-new team from lone free agents and gives it a random leader. */
    private int applyNewTeam(HackathonEvent event, ProposedTeam pt, Context ctx) {
        Team newTeam = teamRepository.save(Team.builder()
                .event(event)
                .name(uniqueAutoName(event))
                .status("APPROVED")
                .build());

        List<TeamMember> moved = new ArrayList<>();
        for (String ref : pt.memberRefs()) {
            moved.addAll(reassignMembers(newTeam, ctx.byRef.get(ref)));
        }

        TeamMember leader = moved.get(random.nextInt(moved.size()));
        leader.setMemberRole("LEADER");
        teamMemberRepository.save(leader);

        String eventName = event.getName();
        moved.forEach(m -> notificationService.createNotification(m.getUser().getUserId(),
                "You were placed into a new team",
                "You've been grouped into '" + newTeam.getName() + "' for " + eventName
                        + (m == leader ? " as the team leader." : ".") + " Say hi to your teammates!",
                GROUPED_NOTIFICATION));
        return moved.size();
    }

    /** Moves every member of {@code src} into {@code target} as MEMBER, then dissolves src. */
    private int absorbInto(Team target, Source src) {
        int moved = reassignMembers(target, src).size();
        return moved;
    }

    /**
     * Places src's people onto {@code target} as MEMBERs. A team source has its members
     * reassigned and its now-empty team dissolved; a teamless free-agent user has no
     * membership yet, so one is created and there is nothing to dissolve.
     */
    private List<TeamMember> reassignMembers(Team target, Source src) {
        if (src.isFreeAgentUser()) {
            TeamMember created = teamMemberRepository.save(TeamMember.builder()
                    .team(target).user(src.freeAgentUser()).memberRole("MEMBER").build());
            return new ArrayList<>(List.of(created));
        }
        List<TeamMember> moved = new ArrayList<>(src.members());
        for (TeamMember m : moved) {
            m.setTeam(target);
            m.setMemberRole("MEMBER");
            teamMemberRepository.save(m);
        }
        dissolve(src.team());
        return moved;
    }

    /**
     * Removes an emptied source team. FKs to Team do not cascade, so the only child
     * rows that can exist at SETUP (join requests, invites) are cleared first;
     * submissions/scores/results/prizes only appear once the event is IN_PROGRESS.
     */
    private void dissolve(Team team) {
        List<JoinRequest> requests = joinRequestRepository.findByTeam_TeamId(team.getTeamId());
        if (!requests.isEmpty()) {
            joinRequestRepository.deleteAll(requests);
        }
        List<TeamInvite> invites = teamInviteRepository.findByTeam_TeamId(team.getTeamId());
        if (!invites.isEmpty()) {
            teamInviteRepository.deleteAll(invites);
        }
        teamRepository.delete(team);
    }

    private String uniqueAutoName(HackathonEvent event) {
        int n = 1;
        String name;
        do {
            name = "Auto Team " + n;
            n++;
        } while (teamRepository.existsByEventIdAndNormalizedName(
                event.getEventId(), name.trim().toUpperCase(Locale.ROOT)));
        return name;
    }

    // ── Mapping the plan to the API response ─────────────────────────

    private GroupingPreviewResponse toPreview(GroupingPlan plan, Context ctx) {
        int solo = (int) ctx.atoms.stream().filter(a -> !a.existingTeam()).count();
        int pairs = (int) ctx.atoms.stream().filter(Atom::existingTeam).count();
        int leftoverPeople = ctx.atoms.stream().mapToInt(Atom::size).sum();

        List<ProposedTeamView> teams = plan.teams().stream().map(pt -> {
            boolean existing = pt.origin() == TeamOrigin.EXISTING;
            return ProposedTeamView.builder()
                    .origin(pt.origin().name())
                    .existingTeamId(existing ? teamId(pt.existingTeamRef()) : null)
                    .teamName(existing
                            ? ctx.byRef.get(pt.existingTeamRef()).team().getName()
                            : "New team (auto-named on commit)")
                    .size(pt.size())
                    .members(membersOf(pt.memberRefs(), ctx))
                    .addedMembers(membersOf(pt.addedRefs(), ctx))
                    .build();
        }).toList();

        List<WarningView> warnings = plan.warnings().stream()
                .map(w -> toWarningView(w, ctx)).toList();

        return GroupingPreviewResponse.builder()
                .leftoverPeople(leftoverPeople)
                .soloCount(solo)
                .pairCount(pairs)
                .proposedTeams(teams)
                .warnings(warnings)
                .build();
    }

    private WarningView toWarningView(GroupingWarning w, Context ctx) {
        return WarningView.builder()
                .type(w.type().name())
                .peopleCount(w.peopleCount())
                .message(w.message())
                .people(membersOf(w.atomRefs(), ctx))
                .build();
    }

    private List<MemberView> membersOf(List<String> refs, Context ctx) {
        List<MemberView> views = new ArrayList<>();
        for (String ref : refs) {
            Source src = ctx.byRef.get(ref);
            if (src == null) {
                continue;
            }
            if (src.isFreeAgentUser()) {
                User u = src.freeAgentUser();
                views.add(MemberView.builder().userId(u.getUserId()).fullName(u.getFullName()).build());
                continue;
            }
            for (TeamMember m : src.members()) {
                views.add(MemberView.builder()
                        .userId(m.getUser().getUserId())
                        .fullName(m.getUser().getFullName())
                        .build());
            }
        }
        return views;
    }

    private static Integer teamId(String ref) {
        return Integer.valueOf(ref.substring(1)); // refs are "T{teamId}"
    }

    // ── Guards & holders ─────────────────────────────────────────────

    private HackathonEvent requireSetupEvent(Integer eventId) {
        HackathonEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        if (!"SETUP".equalsIgnoreCase(event.getStatus())) {
            throw new BadRequestException(
                    "Leftover grouping is only available while the event is in SETUP.");
        }
        return event;
    }

    /**
     * A grouping unit: either an approved team snapshotted with its members (ref
     * "T{teamId}") or a teamless free-agent user (ref "U{userId}"). A user source has no
     * TeamMember rows yet — commit creates one when the user is placed onto a team.
     */
    private record Source(Team team, List<TeamMember> members, User freeAgentUser) {
        static Source ofTeam(Team team, List<TeamMember> members) {
            return new Source(team, members, null);
        }

        static Source ofUser(User user) {
            return new Source(null, List.of(), user);
        }

        boolean isFreeAgentUser() {
            return freeAgentUser != null;
        }

        String ref() {
            return team != null ? "T" + team.getTeamId() : "U" + freeAgentUser.getUserId();
        }

        List<Integer> userIds() {
            return team != null
                    ? members.stream().map(m -> m.getUser().getUserId()).toList()
                    : List.of(freeAgentUser.getUserId());
        }
    }

    private record Context(List<Atom> atoms, List<SettledTeam> settled, Map<String, Source> byRef) {
    }
}

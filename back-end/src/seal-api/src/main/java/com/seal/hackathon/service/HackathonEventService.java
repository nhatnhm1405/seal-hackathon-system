package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.CreateEventRequest;
import com.seal.hackathon.dto.request.UpdateEventRequest;
import com.seal.hackathon.dto.response.HackathonEventResponse;
import com.seal.hackathon.entity.HackathonEvent;
import com.seal.hackathon.entity.Track;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.HackathonEventRepository;
import com.seal.hackathon.repository.TeamRepository;
import com.seal.hackathon.repository.TrackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HackathonEventService {

    private final HackathonEventRepository hackathonEventRepository;
    private final TrackRepository trackRepository;
    private final TeamRepository teamRepository;
    private final AuditLogService auditLogService;

    private static final Set<String> VALID_STATUSES =
            Set.of("DRAFT", "OPEN", "SETUP", "IN_PROGRESS", "COMPLETED", "CANCELLED");

    private static final Set<String> VALID_TRACK_MODES =
            Set.of("SELF_SELECT", "RANDOM");

    // Allowed status transitions — backend is the source of truth (the FE buttons
    // only mirror this). The Coordinator-operable states DRAFT/OPEN/SETUP/IN_PROGRESS
    // form a line that may be walked BOTH ways one step at a time — forward to
    // advance, backward to roll back: DRAFT↔OPEN↔SETUP↔IN_PROGRESS. CANCELLED from any
    // non-terminal state; a cancelled event may be reopened to DRAFT.
    //
    // SETUP = registration closed; coordinator locks/draws teams into tracks before
    // competition starts. Rolling back into SETUP (IN_PROGRESS→SETUP) re-enters the
    // setup phase; the roster was already frozen when registration closed.
    // NOTE: IN_PROGRESS -> COMPLETED is intentionally NOT in this map. Completing
    // an event is a System-Admin-only action handled by the dedicated
    // completeEvent()/POST /complete path, so the generic PUT (reachable by a
    // Coordinator) can never complete an event (it would 400 here).
    private static final Map<String, Set<String>> TRANSITIONS = Map.of(
            "DRAFT",       Set.of("OPEN", "CANCELLED"),
            "OPEN",        Set.of("SETUP", "DRAFT", "CANCELLED"),
            "SETUP",       Set.of("IN_PROGRESS", "OPEN", "CANCELLED"),
            "IN_PROGRESS", Set.of("SETUP", "CANCELLED"),
            "COMPLETED",   Set.of(),
            "CANCELLED",   Set.of("DRAFT")
    );

    @Transactional(readOnly = true)
    public List<HackathonEventResponse> getAllHackathonEvents() {
        return hackathonEventRepository
                .findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public HackathonEventResponse getEventById(Integer eventId) {
        HackathonEvent event = hackathonEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        return mapToResponse(event);
    }

    @Transactional
    public HackathonEventResponse createEvent(CreateEventRequest request, Integer actorUserId) {
        String[] validSeasons = {"SPRING", "SUMMER", "FALL"};
        boolean validSeason = false;
        for (String s : validSeasons) {
            if (s.equalsIgnoreCase(request.getSeason())) {
                validSeason = true;
                break;
            }
        }
        if (!validSeason) {
            throw new BadRequestException("Invalid season. Must be SPRING, SUMMER, or FALL.");
        }

        requireValidDates(request.getRegistrationStart(), request.getRegistrationEnd(),
                request.getStartDate(), request.getEndDate());

        String status = (request.getStatus() != null && !request.getStatus().isBlank())
                ? request.getStatus().toUpperCase()
                : "DRAFT";
        requireValidStatus(status);

        String trackMode = (request.getTrackSelectionMode() != null && !request.getTrackSelectionMode().isBlank())
                ? request.getTrackSelectionMode().toUpperCase()
                : "SELF_SELECT";
        requireValidTrackMode(trackMode);

        HackathonEvent event = HackathonEvent.builder()
                .name(request.getName().trim())
                .season(request.getSeason().toUpperCase())
                .year(request.getYear())
                .description(request.getDescription())
                .registrationStart(request.getRegistrationStart())
                .registrationEnd(request.getRegistrationEnd())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(status)
                .trackSelectionMode(trackMode)
                .build();

        event = hackathonEventRepository.save(event);
        auditLogService.record(actorUserId, "CREATE_EVENT", "EVENT", event.getEventId(), null,
                Map.of("name", event.getName(), "season", event.getSeason(),
                        "year", event.getYear(), "status", event.getStatus()));
        return mapToResponse(event);
    }

    @Transactional
    public HackathonEventResponse updateEvent(Integer eventId, UpdateEventRequest request) {
        HackathonEvent event = hackathonEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        if (request.getName() != null && !request.getName().isBlank()) {
            event.setName(request.getName().trim());
        }
        if (request.getSeason() != null && !request.getSeason().isBlank()) {
            event.setSeason(request.getSeason().toUpperCase());
        }
        if (request.getYear() != null) {
            event.setYear(request.getYear());
        }
        if (request.getDescription() != null) {
            event.setDescription(request.getDescription());
        }
        if (request.getRegistrationStart() != null) {
            event.setRegistrationStart(request.getRegistrationStart());
        }
        if (request.getRegistrationEnd() != null) {
            event.setRegistrationEnd(request.getRegistrationEnd());
        }
        if (request.getStartDate() != null) {
            event.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            event.setEndDate(request.getEndDate());
        }
        if (request.getTrackSelectionMode() != null && !request.getTrackSelectionMode().isBlank()) {
            String newMode = request.getTrackSelectionMode().toUpperCase();
            requireValidTrackMode(newMode);
            // Mode decides how SETUP behaves, so it can only change before SETUP.
            if (!"DRAFT".equalsIgnoreCase(event.getStatus()) && !"OPEN".equalsIgnoreCase(event.getStatus())) {
                throw new BadRequestException(
                        "Track selection mode can only be changed while the event is in DRAFT or OPEN.");
            }
            event.setTrackSelectionMode(newMode);
        }

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            String newStatus = request.getStatus().toUpperCase();
            requireValidStatus(newStatus);
            requireValidTransition(event.getStatus(), newStatus);
            boolean enteringSetup = "SETUP".equals(newStatus) && !"SETUP".equalsIgnoreCase(event.getStatus());
            event.setStatus(newStatus);
            // Closing registration freezes the team count and computes per-track slots.
            if (enteringSetup) {
                computeTrackCapacities(event);
            }
        }

        // Validate the effective date ordering after applying any patches.
        requireValidDates(event.getRegistrationStart(), event.getRegistrationEnd(),
                event.getStartDate(), event.getEndDate());

        event = hackathonEventRepository.save(event);
        return mapToResponse(event);
    }

    /**
     * Completes a running event (IN_PROGRESS -> COMPLETED). System-Admin-only
     * dedicated path — deliberately separate from {@link #updateEvent} (whose
     * TRANSITIONS map no longer allows IN_PROGRESS -> COMPLETED) so a
     * Coordinator's generic PUT can never complete an event.
     */
    @Transactional
    public HackathonEventResponse completeEvent(Integer eventId) {
        HackathonEvent event = hackathonEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        if (!"IN_PROGRESS".equalsIgnoreCase(event.getStatus())) {
            throw new BadRequestException("Only an IN_PROGRESS event can be completed.");
        }
        event.setStatus("COMPLETED");
        event = hackathonEventRepository.save(event);
        return mapToResponse(event);
    }

    /**
     * Reopens a COMPLETED event back to IN_PROGRESS. This is the System Admin's
     * dedicated path — deliberately separate from {@link #updateEvent} because
     * the normal TRANSITIONS map blocks COMPLETED -> * (so a Coordinator's PUT
     * can never reopen). Only callable from the admin-guarded /reopen endpoint
     * (and the reopen-request approval flow).
     */
    @Transactional
    public HackathonEventResponse reopenEvent(Integer eventId) {
        HackathonEvent event = hackathonEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        if (!"COMPLETED".equalsIgnoreCase(event.getStatus())) {
            throw new BadRequestException("Only a COMPLETED event can be reopened.");
        }
        event.setStatus("IN_PROGRESS");
        event = hackathonEventRepository.save(event);
        return mapToResponse(event);
    }

    // ── Lifecycle / validation helpers ───────────────────────────────

    private void requireValidStatus(String status) {
        if (!VALID_STATUSES.contains(status)) {
            throw new BadRequestException("Invalid status '" + status
                    + "'. Must be DRAFT, OPEN, SETUP, IN_PROGRESS, COMPLETED or CANCELLED.");
        }
    }

    private void requireValidTrackMode(String mode) {
        if (!VALID_TRACK_MODES.contains(mode)) {
            throw new BadRequestException("Invalid track selection mode '" + mode
                    + "'. Must be SELF_SELECT or RANDOM.");
        }
    }

    /**
     * Freezes the roster on entering SETUP and assigns each track an even slot
     * count: floor = approvedTeams / trackCount, remainder r distributed one extra
     * to the first r tracks. Total slots == approved team count, so when every team
     * lands a slot the per-track counts differ by at most 1.
     */
    private void computeTrackCapacities(HackathonEvent event) {
        List<Track> tracks = trackRepository.findAllByEvent_EventId(event.getEventId());
        if (tracks.isEmpty()) {
            throw new BadRequestException(
                    "Add at least one track before closing registration (moving to SETUP).");
        }
        int approved = teamRepository
                .findAllByEvent_EventIdAndStatus(event.getEventId(), "APPROVED").size();
        int n = tracks.size();
        int floor = approved / n;
        int remainder = approved % n;
        for (int i = 0; i < n; i++) {
            tracks.get(i).setCapacity(i < remainder ? floor + 1 : floor);
        }
        trackRepository.saveAll(tracks);
    }

    private void requireValidTransition(String from, String to) {
        if (from == null || from.equals(to)) {
            return;
        }
        if (!TRANSITIONS.getOrDefault(from, Set.of()).contains(to)) {
            throw new BadRequestException("Invalid status change: " + from + " -> " + to + ".");
        }
    }

    /** Enforces registrationStart <= registrationEnd <= startDate <= endDate. */
    private void requireValidDates(LocalDateTime regStart, LocalDateTime regEnd,
                                   LocalDateTime start, LocalDateTime end) {
        if (regStart != null && regEnd != null && regEnd.isBefore(regStart)) {
            throw new BadRequestException("Registration end must be on or after registration start.");
        }
        if (start != null && end != null && end.isBefore(start)) {
            throw new BadRequestException("End date must be on or after start date.");
        }
        if (regEnd != null && start != null && start.isBefore(regEnd)) {
            throw new BadRequestException("The competition must start after registration closes.");
        }
    }

    private HackathonEventResponse mapToResponse(HackathonEvent event) {
        return HackathonEventResponse.builder()
                .eventId(event.getEventId())
                .name(event.getName())
                .season(event.getSeason())
                .year(event.getYear())
                .description(event.getDescription())
                .registrationStart(event.getRegistrationStart())
                .registrationEnd(event.getRegistrationEnd())
                .startDate(event.getStartDate())
                .endDate(event.getEndDate())
                .status(event.getStatus())
                .trackSelectionMode(event.getTrackSelectionMode())
                .createdAt(event.getCreatedAt())
                .build();
    }
}

package com.seal.hackathon.service;

import com.seal.hackathon.dto.request.CreateTeamRequest;
import com.seal.hackathon.dto.response.ActiveEventResponse;
import com.seal.hackathon.dto.response.MyTeamResponse;
import com.seal.hackathon.dto.response.TeamResponse;
import com.seal.hackathon.dto.response.TrackResponse;
import com.seal.hackathon.entity.*;
import com.seal.hackathon.exception.BadRequestException;
import com.seal.hackathon.exception.ResourceNotFoundException;
import com.seal.hackathon.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamService {

        private final TeamRepository teamRepository;
        private final TeamMemberRepository teamMemberRepository;
        private final HackathonEventRepository eventRepository;
        private final TrackRepository trackRepository;
        private final UserRepository userRepository;

        @Transactional
        public TeamResponse createTeam(Integer userId, CreateTeamRequest request) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

                HackathonEvent event = eventRepository.findById(request.getEventId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Event not found: " + request.getEventId()));

                // Validate event status
                if (!"PUBLISHED".equalsIgnoreCase(event.getStatus())) {
                        throw new BadRequestException("This event is not currently open for registration.");
                }

                // Validate current time is within registration start/end (if configured)
                LocalDateTime now = LocalDateTime.now();
                if (event.getRegistrationStart() != null && now.isBefore(event.getRegistrationStart())) {
                        throw new BadRequestException("Registration has not started yet.");
                }
                if (event.getRegistrationEnd() != null && now.isAfter(event.getRegistrationEnd())) {
                        throw new BadRequestException("Registration deadline has passed.");
                }

                Track track = trackRepository.findById(request.getTrackId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Track not found: " + request.getTrackId()));

                // Verify track belongs to event
                if (!track.getEvent().getEventId().equals(event.getEventId())) {
                        throw new BadRequestException("The selected track does not belong to the selected event.");
                }

                // Verify team name uniqueness in the event
                if (teamRepository.existsByEvent_EventIdAndName(request.getEventId(), request.getName().trim())) {
                        throw new BadRequestException("A team with the name '" + request.getName()
                                        + "' already exists in this event.");
                }

                // Verify user is not already in a team for this event
                if (teamMemberRepository.existsByUser_UserIdAndTeam_Event_EventId(userId, request.getEventId())) {
                        throw new BadRequestException("You are already registered in a team for this event.");
                }

                // Save Team
                Team team = Team.builder()
                                .event(event)
                                .track(track)
                                .name(request.getName().trim())
                                .description(request.getDescription())
                                .status("PENDING")
                                .build();
                team = teamRepository.save(team);

                // Save Team Member as LEADER
                TeamMember member = TeamMember.builder()
                                .team(team)
                                .user(user)
                                .memberRole("LEADER")
                                .build();
                teamMemberRepository.save(member);

                return mapToTeamResponse(team);
        }

        @Transactional(readOnly = true)
        public List<ActiveEventResponse> getActiveEventsWithTracks() {
                List<HackathonEvent> activeEvents = eventRepository.findAllByStatus("OPEN");
                return activeEvents.stream()
                                .map(event -> {
                                        List<Track> tracks = trackRepository.findAllByEvent_EventId(event.getEventId());
                                        List<TrackResponse> trackResponses = tracks.stream()
                                                        .map(t -> TrackResponse.builder()
                                                                        .trackId(t.getTrackId())
                                                                        .name(t.getName())
                                                                        .description(t.getDescription())
                                                                        .build())
                                                        .collect(Collectors.toList());

                                        return ActiveEventResponse.builder()
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
                                                        .tracks(trackResponses)
                                                        .build();
                                })
                                .collect(Collectors.toList());
        }

        // ---------------------------------------------------------------
        // Get My Team (active event only — 1 participant = 1 team per event)
        // ---------------------------------------------------------------

        /**
         * Returns the team the given user belongs to in the current active event
         * (status OPEN or IN_PROGRESS).
         *
         * Business rule: a participant can only join 1 team → 1 track per event.
         */
        @Transactional(readOnly = true)
        public MyTeamResponse getMyTeam(Integer userId) {
                List<String> activeStatuses = List.of("OPEN", "IN_PROGRESS");

                // 1. Find the user's TeamMember record in the active event
                List<TeamMember> myMemberships = teamMemberRepository
                                .findByUser_UserIdAndTeam_Event_StatusIn(userId, activeStatuses);

                if (myMemberships.isEmpty()) {
                        throw new ResourceNotFoundException(
                                        "You are not currently a member of any team in an active event.");
                }

                // 2. Take the first (and should be only) membership in the active event
                TeamMember membership = myMemberships.get(0);
                Team team = membership.getTeam();

                // 3. Load all members of this team
                List<TeamMember> allMembers = teamMemberRepository
                                .findByTeam_TeamId(team.getTeamId());

                List<MyTeamResponse.TeamMemberInfo> memberInfos = allMembers.stream()
                                .map(m -> MyTeamResponse.TeamMemberInfo.builder()
                                                .memberName(m.getUser().getFullName())
                                                .role(m.getMemberRole())
                                                .build())
                                .collect(Collectors.toList());

                return MyTeamResponse.builder()
                                .teamId(team.getTeamId())
                                .trackName(team.getTrack().getName())
                                .name(team.getName())
                                .members(memberInfos)
                                .build();
        }

        // ---------------------------------------------------------------
        // Helpers
        // ---------------------------------------------------------------

        private TeamResponse mapToTeamResponse(Team team) {
                return TeamResponse.builder()
                                .teamId(team.getTeamId())
                                .eventId(team.getEvent().getEventId())
                                .eventName(team.getEvent().getName())
                                .trackId(team.getTrack().getTrackId())
                                .trackName(team.getTrack().getName())
                                .name(team.getName())
                                .description(team.getDescription())
                                .status(team.getStatus())
                                .createdAt(team.getCreatedAt())
                                .build();
        }
}

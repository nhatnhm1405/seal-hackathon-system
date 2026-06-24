package com.seal.hackathon.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for GET /api/teams/my.
 * Returns the current user's team in the active event, with enough context for
 * the participant UI: event, status, the caller's own role, and each member's id.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyTeamResponse {

    private Integer teamId;
    private Integer eventId;
    private String eventName;
    private Integer trackId;
    private String trackName;
    private String name;

    /** Event lifecycle status (DRAFT/OPEN/SETUP/IN_PROGRESS/...) — drives the
     *  SETUP-phase track picker for SELF_SELECT events. */
    private String eventStatus;

    /** SELF_SELECT | RANDOM — whether the leader picks the track or it is drawn. */
    private String trackSelectionMode;

    /** PENDING | APPROVED | REJECTED | DISQUALIFIED */
    private String status;

    /** The CURRENT user's role in this team: LEADER or MEMBER */
    private String myRole;

    /** All members of this team, including the current user */
    private List<TeamMemberInfo> members;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamMemberInfo {

        /** User id of the member — needed for remove / transfer actions */
        private Integer userId;

        /** Full name of the member (from User.fullName) */
        private String memberName;

        private String email;

        private String studentType;

        private String studentId;

        /** Role within the team: LEADER or MEMBER */
        private String role;

        private LocalDateTime joinedAt;
    }
}

package com.seal.hackathon.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for GET /api/teams/my.
 * Returns the teams the current user belongs to (in active events only).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyTeamResponse {

    private Integer teamId;

    private String trackName;

    private String name;

    /** All members of this team, including the current user */
    private List<TeamMemberInfo> members;

    /**
     * Nested DTO representing a single team member.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamMemberInfo {

        /** Full name of the member (from User.fullName) */
        private String memberName;

        /** Role within the team: LEADER or MEMBER */
        private String role;
    }
}

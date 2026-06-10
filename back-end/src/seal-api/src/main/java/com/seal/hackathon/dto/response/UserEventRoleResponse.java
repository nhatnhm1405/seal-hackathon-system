package com.seal.hackathon.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Read-only view of a UserEventRole assignment, with names resolved
 * (role, event, track, round, assigner) so the UI never has to show raw IDs.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserEventRoleResponse {

    private Integer id;

    private Integer userId;
    private String userFullName;
    private String userEmail;

    // Resolved from Role.roleName — never expose role_id to the UI
    private String roleName;

    private Integer eventId;
    private String eventName;

    private Integer trackId;
    private String trackName;

    private Integer roundId;
    private String roundName;

    // INTERNAL or GUEST — only set when roleName = JUDGE
    private String judgeType;

    private LocalDateTime assignedAt;

    private Integer assignedById;
    private String assignedByName;
}

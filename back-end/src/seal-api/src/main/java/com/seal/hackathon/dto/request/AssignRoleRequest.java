package com.seal.hackathon.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request body for POST /api/users/{id}/roles
 * Grants a role to a user (UserEventRole) and optionally creates the
 * concrete work assignment in the same step:
 * - MENTOR + trackId            -> MentorAssignment
 * - JUDGE  + roundId (+trackId) -> JudgeAssignment (trackId required for
 *   non-final rounds, must be null for the final round)
 */
@Data
public class AssignRoleRequest {

    // EVENT_COORDINATOR | MENTOR | JUDGE
    @NotBlank(message = "Role name is required")
    private String roleName;

    // Null for EVENT_COORDINATOR with global scope; set for event-scoped grants
    private Integer eventId;

    // MENTOR: track to support. JUDGE: track to score (non-final rounds only)
    private Integer trackId;

    // JUDGE: round to score — triggers creation of a JudgeAssignment
    private Integer roundId;

    // INTERNAL or GUEST — required when creating a JudgeAssignment
    private String judgeType;
}

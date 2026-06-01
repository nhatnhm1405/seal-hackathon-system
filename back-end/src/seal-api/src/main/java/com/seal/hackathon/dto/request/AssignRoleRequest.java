package com.seal.hackathon.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request body for POST /api/users/{id}/roles
 * Assigns a role to a user, optionally scoped to event/track/round.
 */
@Data
public class AssignRoleRequest {

    // EVENT_COORDINATOR | MENTOR | JUDGE
    @NotBlank(message = "Role name is required")
    private String roleName;

    // Null for EVENT_COORDINATOR with global scope; set for event-scoped assignments
    private Integer eventId;

    // Set for track-scoped roles (MENTOR, or JUDGE per track)
    private Integer trackId;

    // Set for round-scoped roles (JUDGE)
    private Integer roundId;

    // INTERNAL or GUEST — only for JUDGE role
    private String judgeType;
}

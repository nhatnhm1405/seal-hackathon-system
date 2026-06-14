package com.seal.hackathon.dto.request;

import lombok.Data;

/**
 * Body for PUT /api/teams/{teamId} — the team leader edits team details.
 * Patch semantics: a null field is left unchanged.
 */
@Data
public class UpdateTeamRequest {

    /** Non-null & non-blank → new team name (must stay unique within the event) */
    private String name;

    /** Non-null → new description (blank clears it) */
    private String description;
}

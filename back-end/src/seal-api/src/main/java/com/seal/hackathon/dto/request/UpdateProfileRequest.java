package com.seal.hackathon.dto.request;

import lombok.Data;

/**
 * Body for PUT /api/auth/me — a user edits their OWN profile.
 * Patch semantics: a null field is left unchanged. Email, userType, judgeType,
 * approval and active flags are NOT self-editable (managed by admin).
 */
@Data
public class UpdateProfileRequest {
    private String fullName;
    private String studentId;
    private String university;
}

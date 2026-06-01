package com.seal.hackathon.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Used by an EVENT_COORDINATOR to create a staff account (MENTOR, JUDGE, or another COORDINATOR).
 * The created account is pre-approved — no approval step needed.
 *
 * Primary use case from requirements §6.5:
 *   "Giám khảo khách mời có thể được tạo tài khoản tạm thời bởi ban tổ chức"
 *   (Guest judges can have temporary accounts created by the coordinator)
 */
@Data
public class CreateStaffRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotBlank(message = "Full name is required")
    private String fullName;

    // EVENT_COORDINATOR | MENTOR | JUDGE
    @NotBlank(message = "Role name is required")
    private String roleName;

    // INTERNAL | GUEST — required when roleName = JUDGE
    private String judgeType;

    // Scope: null means system-wide (for EVENT_COORDINATOR); required for MENTOR and JUDGE
    private Integer eventId;

    // Required when roleName = MENTOR (scoped to a track)
    private Integer trackId;

    // Required when roleName = JUDGE (scoped to a round)
    private Integer roundId;
}

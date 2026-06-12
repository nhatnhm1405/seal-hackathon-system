package com.seal.hackathon.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateInviteRequest {
    @NotNull(message = "Invited user ID is required")
    private Integer invitedUserId;
    private String message;
}

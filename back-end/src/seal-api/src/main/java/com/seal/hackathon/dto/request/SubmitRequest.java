package com.seal.hackathon.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SubmitRequest {
    @NotNull(message = "Round ID is required")
    private Integer roundId;
    private String repoUrl;
    private String demoUrl;
    private String slideUrl;
    private String description;
}

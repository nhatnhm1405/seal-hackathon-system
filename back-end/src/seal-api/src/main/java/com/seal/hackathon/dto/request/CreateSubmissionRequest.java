package com.seal.hackathon.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateSubmissionRequest {

    @JsonAlias("team_id")
    @NotNull(message = "Team ID is required")
    @Positive(message = "Team ID must be positive")
    private Integer teamId;

    @JsonAlias("round_id")
    @NotNull(message = "Round ID is required")
    @Positive(message = "Round ID must be positive")
    private Integer roundId;

    @JsonAlias("repo_url")
    @Size(max = 500, message = "Repository URL must not exceed 500 characters")
    private String repoUrl;

    @JsonAlias("demo_url")
    @Size(max = 500, message = "Demo URL must not exceed 500 characters")
    private String demoUrl;

    @JsonAlias("slide_url")
    @Size(max = 500, message = "Slide URL must not exceed 500 characters")
    private String slideUrl;

    private String description;
}

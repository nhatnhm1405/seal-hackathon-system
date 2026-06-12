package com.seal.hackathon.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateTrackRequest {
    @NotBlank(message = "Track name is required")
    private String name;
    private String description;
}

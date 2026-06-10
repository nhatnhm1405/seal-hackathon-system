package com.seal.hackathon.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateTrackRequest {

    @NotBlank(message = "Track name is required")
    @Size(max = 255, message = "Track name must not exceed 255 characters")
    private String name;

    private String description;
}
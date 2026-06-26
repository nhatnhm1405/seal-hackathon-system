package com.seal.hackathon.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreatePrizeRequest {
    @NotBlank(message = "Prize name is required")
    private String name;

    private String description;

    @NotNull(message = "Rank position is required")
    @Min(value = 1, message = "Rank position must be at least 1")
    private Integer rankPosition;

    // Optional — a coordinator may assign the winning team up front, or leave it
    // null and fill it later (e.g. via auto-generate or manual edit).
    private Integer teamId;
}

package com.seal.hackathon.dto.request;

import jakarta.validation.constraints.Min;
import lombok.Data;

/**
 * Partial update — only non-null fields are applied. Use {@code teamId} to set or
 * change the winning team; a prize that is already announced cannot be edited.
 */
@Data
public class UpdatePrizeRequest {
    private String name;

    private String description;

    @Min(value = 1, message = "Rank position must be at least 1")
    private Integer rankPosition;

    private Integer teamId;
}

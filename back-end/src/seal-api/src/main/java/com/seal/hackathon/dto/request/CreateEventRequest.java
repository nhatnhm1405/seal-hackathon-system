package com.seal.hackathon.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Request body for POST /api/events
 */
@Data
public class CreateEventRequest {

    @NotBlank(message = "Event name is required")
    private String name;

    @NotBlank(message = "Season is required")
    private String season;

    @NotNull(message = "Year is required")
    private Integer year;

    private String description;

    @NotNull(message = "Registration start date is required")
    private LocalDateTime registrationStart;

    @NotNull(message = "Registration end date is required")
    private LocalDateTime registrationEnd;

    @NotNull(message = "Start date is required")
    private LocalDateTime startDate;

    @NotNull(message = "End date is required")
    private LocalDateTime endDate;
}

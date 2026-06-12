package com.seal.hackathon.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateEventRequest {
    @NotBlank(message = "Event name is required")
    private String name;

    @NotBlank(message = "Season is required")
    private String season; // SPRING | SUMMER | FALL

    @NotNull(message = "Year is required")
    private Integer year;

    private String description;

    private LocalDateTime registrationStart;
    private LocalDateTime registrationEnd;

    @NotNull(message = "Start date is required")
    private LocalDateTime startDate;

    @NotNull(message = "End date is required")
    private LocalDateTime endDate;

    private String status; // defaults to DRAFT if null
}

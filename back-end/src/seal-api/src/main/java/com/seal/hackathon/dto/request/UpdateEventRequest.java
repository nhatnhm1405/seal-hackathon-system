package com.seal.hackathon.dto.request;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UpdateEventRequest {
    private String name;
    private String season;
    private Integer year;
    private String description;
    private LocalDateTime registrationStart;
    private LocalDateTime registrationEnd;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String status; // DRAFT | OPEN | IN_PROGRESS | COMPLETED | CANCELLED
}

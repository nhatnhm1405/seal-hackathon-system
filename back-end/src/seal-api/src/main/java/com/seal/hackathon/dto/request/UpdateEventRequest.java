package com.seal.hackathon.dto.request;

import lombok.Data;
import java.time.LocalDateTime;

// PATCH /api/events/{eventId}/update
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
    private String status;

    public boolean isEmpty() {
        return name == null && season == null && year == null && description == null
                && registrationStart == null && registrationEnd == null
                && startDate == null && endDate == null && status == null;
    }
}

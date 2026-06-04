package com.seal.hackathon.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for GET /api/events.
 * Maps all fields of HackathonEvent entity to a flat JSON object.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HackathonEventResponse {

    private Integer eventId;

    private String name;

    private String season;

    private Integer year;

    private String description;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime registrationStart;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime registrationEnd;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime startDate;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime endDate;

    private String status;

    /** user_id of the user who created this event */
    private Integer createdBy;

    /** Full name of the creator for display purposes */
    private String createdByName;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
}

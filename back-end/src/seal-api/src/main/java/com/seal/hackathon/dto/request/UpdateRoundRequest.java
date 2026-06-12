package com.seal.hackathon.dto.request;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UpdateRoundRequest {
    private String name;
    private Integer orderNumber;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime submissionDeadline;
    private Integer topNAdvance;
    private Boolean isFinal;
    private Boolean isCalibration;
    private String status; // PENDING | ACTIVE | CLOSED | FINALIZED
}

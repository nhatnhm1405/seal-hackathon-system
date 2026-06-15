package com.seal.hackathon.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinRequestResponse {
    private Integer requestId;
    private Integer teamId;
    private String teamName;
    private String eventName;
    private String trackName;
    private Integer requesterId;
    private String requesterName;
    private String requesterEmail;
    private String message;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime respondedAt;
}

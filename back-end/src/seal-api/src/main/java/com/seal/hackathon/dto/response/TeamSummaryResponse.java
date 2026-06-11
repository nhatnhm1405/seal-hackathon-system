package com.seal.hackathon.dto.response;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamSummaryResponse {
    private Integer teamId;
    private String name;
    private String description;
    private String status;
    private LocalDateTime createdAt;
}
